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
  availableAt: string;
  leaseUntil: string | null;
  heartbeatAt: string | null;
  lastErrorCode: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type CreateJobInput = Readonly<{
  documentId: DocumentId;
  versionId: DocumentVersionId;
  type: DocumentJobType;
  idempotencyKey: string;
}>;

export type JobUpdate = Readonly<Partial<Pick<
  JobRecord,
  "status" | "attempt" | "availableAt" | "leaseUntil" | "heartbeatAt" | "lastErrorCode" | "completedAt" | "updatedAt"
>>>;

export interface JobStore {
  findByIdempotency(context: TrustedDocumentContext, idempotencyKey: string): Promise<JobRecord | null>;
  create(job: JobRecord): Promise<JobRecord>;
  get(context: TrustedDocumentContext, jobId: JobId): Promise<JobRecord | null>;
  update(context: TrustedDocumentContext, jobId: JobId, update: JobUpdate): Promise<JobRecord | null>;
  captureState?(): unknown;
  restoreState?(state: unknown): void;
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

  async update(context: TrustedDocumentContext, id: JobId, update: JobUpdate) {
    const owner = assertTrustedDocumentContext(context).ownerId;
    const job = this.jobs.get(id);
    if (!job || job.ownerId !== owner) return null;
    const updated = { ...job, ...update };
    this.jobs.set(id, updated);
    return updated;
  }

  captureState() {
    return new Map(this.jobs);
  }

  restoreState(state: unknown) {
    if (!(state instanceof Map)) throw new Error("JOB_STORE_STATE_INVALID");
    this.jobs.clear();
    for (const [key, value] of state as Map<string, JobRecord>) this.jobs.set(key, value);
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
    if (document.status === "deleted" || document.status === "expired" || document.status === "archived") {
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
      availableAt: timestamp,
      leaseUntil: null,
      heartbeatAt: null,
      lastErrorCode: null,
      completedAt: null,
      payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async get(context: TrustedDocumentContext, id: JobId) {
    return this.store.get(this.context(context), this.validJob(id));
  }

  captureState() {
    if (!this.store.captureState) throw new Error("JOB_STORE_STATE_UNSUPPORTED");
    return this.store.captureState();
  }

  restoreState(state: unknown) {
    if (!this.store.restoreState) throw new Error("JOB_STORE_STATE_UNSUPPORTED");
    this.store.restoreState(state);
  }

  async startProcessing(context: TrustedDocumentContext, id: JobId, leaseUntil: string) {
    const trustedContext = this.context(context);
    const job = await this.requireJob(trustedContext, id);
    const lease = this.validFutureTimestamp(leaseUntil);
    if (job.status !== "queued" || job.attempt >= job.maxAttempts) {
      throw new DocumentPlatformError("JOB_STATUS_TRANSITION_INVALID");
    }
    return this.store.update(trustedContext, job.jobId, {
      status: "processing",
      attempt: job.attempt + 1,
      leaseUntil: lease,
      heartbeatAt: this.now().toISOString(),
      lastErrorCode: null,
      updatedAt: this.now().toISOString(),
    });
  }

  async complete(context: TrustedDocumentContext, id: JobId) {
    const trustedContext = this.context(context);
    const job = await this.requireJob(trustedContext, id);
    if (job.status !== "processing") throw new DocumentPlatformError("JOB_STATUS_TRANSITION_INVALID");
    return this.store.update(trustedContext, job.jobId, {
      status: "completed",
      leaseUntil: null,
      completedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
  }

  async fail(context: TrustedDocumentContext, id: JobId, errorCode: string, retryable: boolean) {
    const trustedContext = this.context(context);
    const job = await this.requireJob(trustedContext, id);
    if (job.status !== "processing") throw new DocumentPlatformError("JOB_STATUS_TRANSITION_INVALID");
    const normalizedErrorCode = this.errorCode(errorCode);
    const shouldRetry = retryable && job.attempt < job.maxAttempts;
    const availableAt = shouldRetry
      ? new Date(this.now().getTime() + Math.min(60_000, 1_000 * 2 ** Math.max(0, job.attempt - 1))).toISOString()
      : job.availableAt;
    return this.store.update(trustedContext, job.jobId, {
      status: shouldRetry ? "queued" : "failed",
      availableAt,
      leaseUntil: null,
      lastErrorCode: normalizedErrorCode,
      completedAt: shouldRetry ? null : this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
  }

  async cancel(context: TrustedDocumentContext, id: JobId) {
    const trustedContext = this.context(context);
    const job = await this.requireJob(trustedContext, id);
    if (job.status !== "queued" && job.status !== "processing") {
      throw new DocumentPlatformError("JOB_STATUS_TRANSITION_INVALID");
    }
    return this.store.update(trustedContext, job.jobId, {
      status: "cancelled",
      leaseUntil: null,
      completedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
  }

  async heartbeat(context: TrustedDocumentContext, id: JobId, leaseUntil: string) {
    const trustedContext = this.context(context);
    const job = await this.requireJob(trustedContext, id);
    const lease = this.validFutureTimestamp(leaseUntil);
    if (job.status !== "processing" || (job.leaseUntil !== null && Date.parse(job.leaseUntil) <= this.now().getTime())) {
      throw new DocumentPlatformError("JOB_LEASE_INVALID");
    }
    return this.store.update(trustedContext, job.jobId, {
      leaseUntil: lease,
      heartbeatAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
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

  private async requireJob(context: TrustedDocumentContext, id: JobId) {
    const job = await this.store.get(context, this.validJob(id));
    if (!job) throw new DocumentPlatformError("JOB_NOT_FOUND");
    return job;
  }

  private errorCode(value: string) {
    const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").slice(0, 64);
    return normalized || "JOB_FAILED";
  }

  private validFutureTimestamp(value: string) {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed) || parsed <= this.now().getTime()) throw new DocumentPlatformError("JOB_LEASE_INVALID");
    return new Date(parsed).toISOString();
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
