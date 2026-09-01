import type { CanonicalOwnerId } from "../../src/features/server-safe-ai/security";
import type { StorageLocator } from "../storage/storage";

type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type OwnerId = CanonicalOwnerId;
export type DocumentId = Brand<string, "DocumentId">;
export type DocumentVersionId = Brand<string, "DocumentVersionId">;
export type ConversationId = Brand<string, "ConversationId">;
export type ProjectId = Brand<string, "ProjectId">;
export type MessageId = Brand<string, "MessageId">;
export type JobId = Brand<string, "JobId">;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TRUSTED_DOCUMENT_CONTEXT = Symbol("TrustedDocumentContext");

export type TrustedDocumentContext = Readonly<{
  ownerId: OwnerId;
  issuedBy: "authenticated-server";
  readonly [TRUSTED_DOCUMENT_CONTEXT]: true;
}>;

/**
 * This is the only document-platform context constructor. The authenticated
 * server boundary must create it from validated Supabase claims.sub; browser,
 * prompt, cookie and worker payload values must never be passed here.
 */
export function createTrustedDocumentContext(ownerId: OwnerId): TrustedDocumentContext {
  if (typeof ownerId !== "string" || !UUID_PATTERN.test(ownerId)) {
    throw new Error("TRUSTED_CONTEXT_INVALID");
  }
  return Object.freeze({
    ownerId: ownerId.toLowerCase() as OwnerId,
    issuedBy: "authenticated-server" as const,
    [TRUSTED_DOCUMENT_CONTEXT]: true as const,
  });
}

export function assertTrustedDocumentContext(value: unknown): TrustedDocumentContext {
  if (!value || typeof value !== "object") throw new Error("TRUSTED_CONTEXT_INVALID");
  const candidate = value as Partial<TrustedDocumentContext>;
  if (
    candidate[TRUSTED_DOCUMENT_CONTEXT] !== true ||
    candidate.issuedBy !== "authenticated-server" ||
    typeof candidate.ownerId !== "string" ||
    !UUID_PATTERN.test(candidate.ownerId)
  ) throw new Error("TRUSTED_CONTEXT_INVALID");
  return candidate as TrustedDocumentContext;
}

function uuid<T>(value: string, errorCode: string): T {
  const normalized = value.trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) throw new Error(errorCode);
  return normalized as T;
}

export const documentId = (value: string) => uuid<DocumentId>(value, "DOCUMENT_ID_INVALID");
export const documentVersionId = (value: string) => uuid<DocumentVersionId>(value, "DOCUMENT_VERSION_ID_INVALID");
export const conversationId = (value: string) => uuid<ConversationId>(value, "CONVERSATION_ID_INVALID");
export const projectId = (value: string) => uuid<ProjectId>(value, "PROJECT_ID_INVALID");
export const messageId = (value: string) => uuid<MessageId>(value, "MESSAGE_ID_INVALID");
export const jobId = (value: string) => uuid<JobId>(value, "JOB_ID_INVALID");

export type DocumentStatus = "pending" | "processing" | "ready" | "failed" | "expired" | "archived" | "deleted";

export const DOCUMENT_STATUS_TRANSITIONS: Readonly<Record<DocumentStatus, ReadonlyArray<DocumentStatus>>> = {
  pending: ["pending", "processing", "ready", "failed", "expired", "archived", "deleted"],
  processing: ["processing", "ready", "failed", "expired", "archived", "deleted"],
  ready: ["ready", "processing", "failed", "expired", "archived", "deleted"],
  failed: ["failed", "processing", "expired", "archived", "deleted"],
  expired: ["expired", "archived", "deleted"],
  archived: ["archived", "deleted"],
  deleted: ["deleted"],
};

export function isDocumentStatusTransitionAllowed(current: DocumentStatus, next: DocumentStatus) {
  return DOCUMENT_STATUS_TRANSITIONS[current].includes(next);
}

export type DocumentMetadata = {
  documentId: DocumentId;
  ownerId: OwnerId;
  projectId: ProjectId | null;
  name: string;
  mediaType: string;
  sizeBytes: number;
};

export type Document = DocumentMetadata & {
  status: DocumentStatus;
  currentVersion: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentVersion = {
  versionId: DocumentVersionId;
  ownerId: OwnerId;
  documentId: DocumentId;
  versionNumber: number;
  storageLocator: StorageLocator;
  checksum: string;
  sizeBytes: number;
  mediaType: string;
  createdAt: string;
};

export type ConversationDocument = {
  conversationId: ConversationId;
  ownerId: OwnerId;
  documentId: DocumentId;
  available: boolean;
  addedAt: string;
  removedAt: string | null;
};

export type DocumentSelection = {
  messageId: MessageId;
  ownerId: OwnerId;
  conversationId: ConversationId;
  documentId: DocumentId;
  createdAt: string;
};

export type CreateDocumentInput = {
  documentId?: DocumentId;
  projectId?: ProjectId | null;
  name: string;
  mediaType: string;
  sizeBytes: number;
};

export type CreateVersionInput = {
  versionId: DocumentVersionId;
  documentId: DocumentId;
  versionNumber?: number;
  storageLocator: StorageLocator;
  checksum: string;
  sizeBytes: number;
  mediaType: string;
};
