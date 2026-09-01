import {
  assertTrustedDocumentContext,
  type ConversationId,
  type TrustedDocumentContext,
} from "../documents/domain";

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

export type OperationalToolArgumentValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<OperationalToolArgumentValue>
  | Readonly<{ [key: string]: OperationalToolArgumentValue }>;

export type OperationalToolIntent = {
  name: OperationalToolName;
  arguments: Readonly<Record<string, OperationalToolArgumentValue>>;
};

export type ServerIssuedOperationalToolContext = TrustedDocumentContext & {
  conversationId: ConversationId;
  requestId: string;
};

export type OperationalToolRequest = {
  context: ServerIssuedOperationalToolContext;
  intent: OperationalToolIntent;
};

export const RESERVED_OPERATIONAL_ARGUMENT_KEYS = [
  "ownerId",
  "owner_id",
  "userId",
  "user_id",
  "requestId",
  "request_id",
  "authenticatedOwner",
  "principal",
  "conversationId",
  "conversation_id",
] as const;

const RESERVED_ARGUMENT_KEYS = new Set(
  RESERVED_OPERATIONAL_ARGUMENT_KEYS.map((key) => key.toLowerCase().replaceAll("_", "")),
);

export function createServerIssuedOperationalToolContext(
  documentContext: TrustedDocumentContext,
  conversationIdValue: ConversationId,
  requestId: string,
): ServerIssuedOperationalToolContext {
  const context = assertTrustedDocumentContext(documentContext);
  if (!requestId.trim()) throw new Error("OPENHARNESS_CONTEXT_INVALID");
  return Object.freeze({
    ...context,
    conversationId: conversationIdValue,
    requestId,
  });
}

/**
 * Runtime boundary for tool intents. Context-bearing fields are server-issued
 * and may not be smuggled through an otherwise generic nested argument value.
 */
export function assertOperationalToolIntent(value: unknown): OperationalToolIntent {
  if (!value || typeof value !== "object") throw new Error("OPENHARNESS_ARGUMENTS_INVALID");
  const candidate = value as { name?: unknown; arguments?: unknown };
  if (
    typeof candidate.name !== "string" ||
    !OPERATIONAL_TOOL_NAMES.includes(candidate.name as OperationalToolName) ||
    !candidate.arguments ||
    typeof candidate.arguments !== "object" ||
    Array.isArray(candidate.arguments)
  ) throw new Error("OPENHARNESS_ARGUMENTS_INVALID");
  assertSafeOperationalArguments(candidate.arguments);
  return candidate as OperationalToolIntent;
}

function assertSafeOperationalArguments(value: unknown, seen = new WeakSet<object>()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("OPENHARNESS_ARGUMENTS_INVALID");
    return;
  }
  if (typeof value !== "object") throw new Error("OPENHARNESS_ARGUMENTS_INVALID");
  if (seen.has(value)) throw new Error("OPENHARNESS_ARGUMENTS_INVALID");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeOperationalArguments(entry, seen);
  } else {
    for (const [key, entry] of Object.entries(value)) {
      if (RESERVED_ARGUMENT_KEYS.has(key.toLowerCase().replaceAll("_", ""))) {
        throw new Error("OPENHARNESS_RESERVED_ARGUMENT");
      }
      assertSafeOperationalArguments(entry, seen);
    }
  }
  seen.delete(value);
}

export function createOperationalToolRequest(
  context: ServerIssuedOperationalToolContext,
  intent: unknown,
): OperationalToolRequest {
  assertTrustedDocumentContext(context);
  return { context, intent: assertOperationalToolIntent(intent) };
}

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
  invoke(
    context: ServerIssuedOperationalToolContext,
    intent: OperationalToolIntent,
  ): Promise<OperationalToolResult>;
}
