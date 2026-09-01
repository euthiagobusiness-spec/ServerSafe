import {
  createTrustedDocumentContext,
  documentId,
  documentVersionId,
  jobId,
  type DocumentId,
  type DocumentVersionId,
  type JobId,
  type OwnerId,
} from "../documents/domain";
import type { DocumentJobType, JobRecord, JobStatus } from "../jobs/service";
import { DocumentPlatformError } from "../documents/errors";

export const JOB_STATUSES = ["queued", "processing", "completed", "failed", "cancelled"] as const;

export const WORKER_JOB_TYPES = [
  "document.extract",
  "document.classify",
  "document.chunk",
  "spreadsheet.process",
] as const satisfies ReadonlyArray<DocumentJobType>;

export type WorkerJobType = typeof WORKER_JOB_TYPES[number];

export type WorkerJobPayload = Readonly<{
  ownerId: OwnerId;
  documentId: DocumentId;
  versionId: DocumentVersionId;
  operation: WorkerJobType;
}>;

export type WorkerJobEnvelope = Readonly<{
  jobId: JobId;
  ownerId: OwnerId;
  documentId: DocumentId;
  versionId: DocumentVersionId;
  operation: WorkerJobType;
  status: JobStatus;
  attempt: number;
  maxAttempts: number;
  idempotencyKey: string;
  payload: WorkerJobPayload;
}>;

export type AuthorizedWorkerInput = Readonly<{
  ownerId: OwnerId;
  jobId: JobId;
  documentId: DocumentId;
  versionId: DocumentVersionId;
}>;

/**
 * Future worker boundary. Workers receive identifiers and fetch state through
 * an authorized application/repository layer. Queue messages never contain
 * document bytes or extracted content.
 */
export interface AuthorizedWorkerStateReader<TState> {
  getState(input: AuthorizedWorkerInput): Promise<TState | null>;
}

export type WorkerFailure = {
  status: "failed";
  errorCode: string;
  retryable: boolean;
};

export type WorkerSuccess = {
  status: "completed";
  outputVersionId?: DocumentVersionId;
  auditEventId?: string;
};

export type WorkerResult = WorkerFailure | WorkerSuccess;

const ENVELOPE_KEYS = [
  "jobId", "ownerId", "documentId", "versionId", "operation", "status",
  "attempt", "maxAttempts", "idempotencyKey", "payload",
] as const;

const PAYLOAD_KEYS = ["ownerId", "documentId", "versionId", "operation"] as const;

export function createWorkerJobEnvelope(job: JobRecord): WorkerJobEnvelope {
  return {
    jobId: job.jobId,
    ownerId: job.ownerId,
    documentId: job.documentId,
    versionId: job.versionId,
    operation: job.type,
    status: job.status,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    idempotencyKey: job.idempotencyKey,
    payload: {
      ownerId: job.payload.ownerId,
      documentId: job.payload.documentId,
      versionId: job.payload.versionId,
      operation: job.payload.operation,
    },
  };
}

export function assertWorkerJobEnvelope(value: unknown): WorkerJobEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DocumentPlatformError("WORKER_ENVELOPE_INVALID");
  }
  const candidate = value as Record<string, unknown>;
  if (!sameKeys(candidate, ENVELOPE_KEYS) || !sameKeys(candidate.payload, PAYLOAD_KEYS)) {
    throw new DocumentPlatformError("WORKER_ENVELOPE_INVALID");
  }
  try {
    const ownerId = createTrustedDocumentContext(candidate.ownerId as never).ownerId;
    const documentIdValue = documentId(candidate.documentId as string);
    const versionIdValue = documentVersionId(candidate.versionId as string);
    const jobIdValue = jobId(candidate.jobId as string);
    if (!WORKER_JOB_TYPES.includes(candidate.operation as WorkerJobType) ||
      !JOB_STATUSES.includes(candidate.status as JobStatus) ||
      !Number.isSafeInteger(candidate.attempt) ||
      !Number.isSafeInteger(candidate.maxAttempts) ||
      (candidate.attempt as number) < 0 ||
      (candidate.maxAttempts as number) < 1 ||
      (candidate.attempt as number) > (candidate.maxAttempts as number) ||
      typeof candidate.idempotencyKey !== "string" ||
      !candidate.idempotencyKey.trim() || candidate.idempotencyKey.length > 200) {
      throw new Error("WORKER_ENVELOPE_INVALID");
    }
    const payload = candidate.payload as Record<string, unknown>;
    if (
      payload.ownerId !== ownerId || payload.documentId !== documentIdValue ||
      payload.versionId !== versionIdValue || payload.operation !== candidate.operation
    ) throw new Error("WORKER_ENVELOPE_MISMATCH");
    return {
      jobId: jobIdValue,
      ownerId,
      documentId: documentIdValue,
      versionId: versionIdValue,
      operation: candidate.operation as WorkerJobType,
      status: candidate.status as JobStatus,
      attempt: candidate.attempt as number,
      maxAttempts: candidate.maxAttempts as number,
      idempotencyKey: candidate.idempotencyKey,
      payload: {
        ownerId,
        documentId: documentIdValue,
        versionId: versionIdValue,
        operation: candidate.operation as WorkerJobType,
      },
    };
  } catch (error) {
    if (error instanceof DocumentPlatformError) throw error;
    throw new DocumentPlatformError(error instanceof Error && error.message === "WORKER_ENVELOPE_MISMATCH"
      ? "WORKER_ENVELOPE_MISMATCH"
      : "WORKER_ENVELOPE_INVALID");
  }
}

function sameKeys(value: unknown, keys: ReadonlyArray<string>): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}
