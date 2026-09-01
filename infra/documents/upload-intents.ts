import { randomUUID } from "node:crypto";
import {
  assertTrustedDocumentContext,
  documentId,
  documentVersionId,
  type DocumentId,
  type DocumentVersionId,
  type OwnerId,
  type TrustedDocumentContext,
} from "./domain";
import { DocumentPlatformError } from "./errors";
import { storageChecksum, type Sha256Checksum } from "../storage/storage";

export type UploadIntentStatus = "pending" | "completed" | "expired" | "failed";

export type UploadIntent = Readonly<{
  uploadIntentId: string;
  ownerId: OwnerId;
  documentId: DocumentId;
  versionId: DocumentVersionId;
  expectedChecksum: Sha256Checksum;
  expectedSizeBytes: number;
  mediaType: string;
  status: UploadIntentStatus;
  expiresAt: string;
  createdAt: string;
  completedAt: string | null;
}>;

export type CreateUploadIntentInput = Readonly<{
  documentId: DocumentId;
  versionId: DocumentVersionId;
  expectedChecksum: string;
  expectedSizeBytes: number;
  mediaType: string;
  expiresAt: string;
}>;

export interface UploadIntentStore {
  create(context: TrustedDocumentContext, input: CreateUploadIntentInput): Promise<UploadIntent>;
  get(context: TrustedDocumentContext, documentId: DocumentId, versionId: DocumentVersionId): Promise<UploadIntent | null>;
  markCompleted(context: TrustedDocumentContext, documentId: DocumentId, versionId: DocumentVersionId): Promise<UploadIntent>;
  markExpired(context: TrustedDocumentContext, documentId: DocumentId, versionId: DocumentVersionId): Promise<UploadIntent>;
}

type UploadIntentState = Map<string, UploadIntent>;

export class InMemoryUploadIntentStore implements UploadIntentStore {
  private readonly intents: UploadIntentState = new Map();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async create(context: TrustedDocumentContext, input: CreateUploadIntentInput): Promise<UploadIntent> {
    const owner = this.owner(context);
    const document = this.validDocument(input.documentId);
    const version = this.validVersion(input.versionId);
    const checksum = this.validChecksum(input.expectedChecksum);
    if (
      !input.mediaType.trim() ||
      !Number.isSafeInteger(input.expectedSizeBytes) ||
      input.expectedSizeBytes < 0 ||
      Number.isNaN(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= this.now().getTime()
    ) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    const key = this.key(owner, document, version);
    if (this.intents.has(key)) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    const intent: UploadIntent = {
      uploadIntentId: randomUUID(),
      ownerId: owner,
      documentId: document,
      versionId: version,
      expectedChecksum: checksum,
      expectedSizeBytes: input.expectedSizeBytes,
      mediaType: input.mediaType.trim(),
      status: "pending",
      expiresAt: input.expiresAt,
      createdAt: this.now().toISOString(),
      completedAt: null,
    };
    this.intents.set(key, intent);
    return intent;
  }

  async get(context: TrustedDocumentContext, documentIdValue: DocumentId, versionIdValue: DocumentVersionId) {
    const owner = this.owner(context);
    const key = this.key(owner, this.validDocument(documentIdValue), this.validVersion(versionIdValue));
    const intent = this.intents.get(key);
    if (!intent) return null;
    if (intent.status === "pending" && Date.parse(intent.expiresAt) <= this.now().getTime()) {
      const expired = { ...intent, status: "expired" as const };
      this.intents.set(key, expired);
      return expired;
    }
    return intent;
  }

  async markCompleted(context: TrustedDocumentContext, documentIdValue: DocumentId, versionIdValue: DocumentVersionId) {
    const intent = await this.requirePending(context, documentIdValue, versionIdValue);
    const completed = { ...intent, status: "completed" as const, completedAt: this.now().toISOString() };
    this.intents.set(this.key(intent.ownerId, intent.documentId, intent.versionId), completed);
    return completed;
  }

  async markExpired(context: TrustedDocumentContext, documentIdValue: DocumentId, versionIdValue: DocumentVersionId) {
    const owner = this.owner(context);
    const document = this.validDocument(documentIdValue);
    const version = this.validVersion(versionIdValue);
    const key = this.key(owner, document, version);
    const intent = this.intents.get(key);
    if (!intent) throw new DocumentPlatformError("UPLOAD_INTENT_NOT_FOUND");
    const expired = { ...intent, status: "expired" as const };
    this.intents.set(key, expired);
    return expired;
  }

  captureState() {
    return new Map(this.intents);
  }

  restoreState(state: UploadIntentState) {
    this.intents.clear();
    for (const [key, value] of state) this.intents.set(key, value);
  }

  private async requirePending(context: TrustedDocumentContext, document: DocumentId, version: DocumentVersionId) {
    const intent = await this.get(context, document, version);
    if (!intent) throw new DocumentPlatformError("UPLOAD_INTENT_NOT_FOUND");
    if (intent.status === "expired") throw new DocumentPlatformError("UPLOAD_INTENT_EXPIRED");
    if (intent.status !== "pending") throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    return intent;
  }

  private owner(context: TrustedDocumentContext) {
    try {
      return assertTrustedDocumentContext(context).ownerId;
    } catch {
      throw new DocumentPlatformError("TRUSTED_CONTEXT_INVALID");
    }
  }

  private validDocument(value: DocumentId) {
    try { return documentId(value); } catch { throw new DocumentPlatformError("UPLOAD_INTENT_INVALID"); }
  }

  private validVersion(value: DocumentVersionId) {
    try { return documentVersionId(value); } catch { throw new DocumentPlatformError("UPLOAD_INTENT_INVALID"); }
  }

  private validChecksum(value: string) {
    try { return storageChecksum(value); } catch { throw new DocumentPlatformError("UPLOAD_INTENT_INVALID"); }
  }

  private key(owner: OwnerId, document: DocumentId, version: DocumentVersionId) {
    return `${owner}:${document}:${version}`;
  }
}
