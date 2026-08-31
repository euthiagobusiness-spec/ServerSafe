export const OPERATIONAL_TOOL_NAMES = [
  "documents.list",
  "documents.read",
  "documents.search",
  "documents.metadata",
  "spreadsheets.read",
  "spreadsheets.create",
  "spreadsheets.update",
  "jobs.status",
] as const;

export type OperationalToolName = typeof OPERATIONAL_TOOL_NAMES[number];

export type OperationalToolContext = {
  ownerId: string;
  conversationId: string;
  requestId: string;
};

export type OperationalToolRequest = {
  context: OperationalToolContext;
  name: OperationalToolName;
  arguments: Readonly<Record<string, string | number | boolean | null>>;
};

export type DocumentSummary = {
  documentId: string;
  name: string;
  mediaType: string;
  status: "pending" | "processing" | "ready" | "failed" | "expired" | "deleted";
  currentVersion?: number;
};

export type DocumentContent = {
  documentId: string;
  versionId: string;
  mediaType: string;
  text: string;
};

export type SpreadsheetResult = {
  documentId: string;
  versionId?: string;
  status: "accepted" | "completed";
};

export type JobStatusResult = {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  errorCode?: string;
};

export type OperationalToolResult =
  | { name: "documents.list"; value: DocumentSummary[] }
  | { name: "documents.read"; value: DocumentContent }
  | { name: "documents.search"; value: DocumentSummary[] }
  | { name: "documents.metadata"; value: DocumentSummary }
  | { name: "spreadsheets.read"; value: DocumentContent }
  | { name: "spreadsheets.create" | "spreadsheets.update"; value: SpreadsheetResult }
  | { name: "jobs.status"; value: JobStatusResult };

/**
 * Future service boundary. Implementations must authorize owner/conversation
 * before touching PostgreSQL or storage; the current OpenHarness is unchanged.
 */
export interface OperationalToolGateway {
  invoke(request: OperationalToolRequest): Promise<OperationalToolResult>;
}
