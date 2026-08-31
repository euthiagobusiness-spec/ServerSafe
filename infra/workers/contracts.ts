export const JOB_STATUSES = ["queued", "processing", "completed", "failed", "cancelled"] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export const DOCUMENT_OPERATIONS = ["validate", "extract", "classify", "chunk", "purge"] as const;
export type DocumentOperation = typeof DOCUMENT_OPERATIONS[number];

export const SPREADSHEET_OPERATIONS = ["read", "create", "update", "append_rows", "export"] as const;
export type SpreadsheetOperation = typeof SPREADSHEET_OPERATIONS[number];

export type WorkerJob<TType extends string, TPayload> = {
  jobId: string;
  ownerId: string;
  type: TType;
  status: JobStatus;
  attempt: number;
  maxAttempts: number;
  idempotencyKey: string;
  payload: TPayload;
};

export type DocumentJobPayload = {
  documentId: string;
  versionId?: string;
  operation: DocumentOperation;
};

export type SpreadsheetJobPayload = {
  documentId: string;
  versionId?: string;
  operation: SpreadsheetOperation;
  outputVersion?: boolean;
};

export type DocumentWorkerJob = WorkerJob<"document", DocumentJobPayload>;
export type SpreadsheetWorkerJob = WorkerJob<"spreadsheet", SpreadsheetJobPayload>;

export type WorkerFailure = {
  status: "failed";
  errorCode: string;
  retryable: boolean;
};

export type WorkerSuccess = {
  status: "completed";
  outputVersionId?: string;
  auditEventId?: string;
};

export type WorkerResult = WorkerFailure | WorkerSuccess;
