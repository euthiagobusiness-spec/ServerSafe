import type { DocumentId, DocumentVersionId, JobId, OwnerId } from "../documents/domain";
import type { DocumentJobType, JobStatus } from "../jobs/service";

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
