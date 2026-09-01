import { randomUUID } from "node:crypto";
import {
  documentId,
  documentVersionId,
  jobId,
  assertTrustedDocumentContext,
  type TrustedDocumentContext,
  type DocumentId,
  type DocumentVersionId,
  type JobId,
  type OwnerId,
} from "../documents/domain";
import type { DocumentRepository } from "../documents/repository";
import { DocumentPlatformError } from "../documents/errors";

export const DOCUMENT_JOB_TYPES = [
  "document.extract",
  "document.classify",
  "document.chunk",
  "spreadsheet.process",
] as const;

export type DocumentJobType = typeof DOCUMENT_JOB_TYPES[number];
export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type JobPayload = Readonly<{
  ownerId: OwnerId;
  documentId: DocumentId;
  versionId: DocumentVersionId;
  operation: DocumentJobType;
}>;

export type JobRecord = Readonly<{
  jobId: JobId;
  ownerId: OwnerId;
  documentId: DocumentId;
  versionId: DocumentVersionId;
  type: DocumentJobType;
  status: JobStatus;
  attempt: number;
  maxAttempts: number;
  idempotencyKey: string;
  payload: JobPayload;
  createdAt: string;
  updatedAt: string;
}>;

export type CreateJobInput = Readonly<{
  documentId: DocumentId;
  versionId: DocumentVersionId;
  type: DocumentJobType;
  idempotencyKey: string;
}>;

export interface JobStore {
  findByIdempotency(context: TrustedDocumentContext, idempotencyKey: string): Promise<JobRecord | null>;
  create(job: JobRecord): Promise<JobRecord>;
  get(context: TrustedDocumentContext, jobId: JobId): Promise<JobRecord | null>;
}

export class InMemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, JobRecord>();

  async findByIdempotency(context: TrustedDocumentContext, idempotencyKey: string) {
    const owner = assertTrustedDocumentContext(context).ownerId;
    return [...this.jobs.values()].find(
      (job) => job.ownerId === owner && job.idempotencyKey === idempotencyKey,
    ) ?? null;
  }

  async create(job: JobRecord) {
    this.jobs.set(job.jobId, job);
    return job;
  }

  async get(context: TrustedDocumentContext, id: JobId) {
    const owner = assertTrustedDocumentContext(context).ownerId;
    const job = this.jobs.get(id);
    return job?.ownerId === owner ? job : null;
  }

  count() {
    return this.jobs.size;
  }
}

type Clock = () => Date;

/**
 * Creates metadata-only work. A production implementation must make the
 * idempotency check and insert atomic in its persistent store.
 */
export class JobService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly store: JobStore,
    private readonly now: Clock = () => new Date(),
  ) {}

  async create(context: TrustedDocumentContext, input: CreateJobInput): Promise<JobRecord> {
    const trustedContext = this.context(context);
    const owner = trustedContext.ownerId;
    const document = await this.repository.getDocument(trustedContext, this.validDocument(input.documentId));
    if (!document) throw new DocumentPlatformError("DOCUMENT_NOT_ACCESSIBLE");
    if (document.status === "deleted" || document.status === "expired") {
      throw new DocumentPlatformError("DOCUMENT_UNAVAILABLE");
    }
    const versionIdValue = this.validVersion(input.versionId);
    const version = await this.repository.getVersion(trustedContext, document.documentId, versionIdValue);
    if (!version || version.ownerId !== owner || version.documentId !== document.documentId) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    }
    if (!DOCUMENT_JOB_TYPES.includes(input.type)) {
      throw new DocumentPlatformError("JOB_INPUT_INVALID");
    }
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      throw new DocumentPlatformError("JOB_INPUT_INVALID");
    }
    const fingerprint = this.fingerprint(document.documentId, version.versionId, input.type);
    const existing = await this.store.findByIdempotency(trustedContext, idempotencyKey);
    if (existing) {
      if (this.fingerprint(existing.documentId, existing.versionId, existing.type) !== fingerprint) {
        throw new DocumentPlatformError("JOB_IDEMPOTENCY_CONFLICT");
      }
      return existing;
    }
    const timestamp = this.now().toISOString();
    const id = jobId(randomUUID());
    const payload: JobPayload = {
      ownerId: owner,
      documentId: document.documentId,
      versionId: version.versionId,
      operation: input.type,
    };
    return this.store.create({
      jobId: id,
      ownerId: owner,
      documentId: document.documentId,
      versionId: version.versionId,
      type: input.type,
      status: "queued",
      attempt: 0,
      maxAttempts: 3,
      idempotencyKey,
      payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async get(context: TrustedDocumentContext, id: JobId) {
    return this.store.get(this.context(context), this.validJob(id));
  }

  private fingerprint(documentIdValue: DocumentId, versionIdValue: DocumentVersionId, type: DocumentJobType) {
    return `${documentIdValue}:${versionIdValue}:${type}`;
  }

  private context(value: TrustedDocumentContext) {
    try {
      return assertTrustedDocumentContext(value);
    } catch {
      throw new DocumentPlatformError("TRUSTED_CONTEXT_INVALID");
    }
  }

  private validDocument(value: DocumentId) {
    try {
      return documentId(value);
    } catch {
      throw new DocumentPlatformError("JOB_INPUT_INVALID");
    }
  }

  private validVersion(value: DocumentVersionId) {
    try {
      return documentVersionId(value);
    } catch {
      throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    }
  }

  private validJob(value: JobId) {
    try {
      return jobId(value);
    } catch {
      throw new DocumentPlatformError("JOB_INPUT_INVALID");
    }
  }
}
