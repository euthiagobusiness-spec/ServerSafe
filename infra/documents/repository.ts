import { randomUUID } from "node:crypto";
import {
  conversationId,
  documentId,
  documentVersionId,
  assertTrustedDocumentContext,
  DOCUMENT_STATUS_TRANSITIONS,
  isDocumentStatusTransitionAllowed,
  messageId,
  projectId,
  type TrustedDocumentContext,
  type ConversationDocument,
  type ConversationId,
  type CreateDocumentInput,
  type CreateVersionInput,
  type Document,
  type DocumentId,
  type DocumentSelection,
  type DocumentStatus,
  type DocumentVersion,
  type DocumentVersionId,
  type MessageId,
  type OwnerId,
  type ProjectId,
} from "./domain";
import { DocumentPlatformError } from "./errors";
import {
  createStorageLocator,
  storageChecksum,
  storageDocumentId,
  storageOwnerId,
  storageVersionId,
} from "../storage/storage";

export type DocumentListFilter = Readonly<{
  projectId?: ProjectId | null;
  conversationId?: ConversationId;
  status?: DocumentStatus | ReadonlyArray<DocumentStatus>;
  limit?: number;
  offset?: number;
}>;

export type CurrentVersionInput = Readonly<{
  documentId: DocumentId;
  versionId: DocumentVersionId;
}>;

export type ConversationDocumentInput = Readonly<{
  conversationId: ConversationId;
  documentId: DocumentId;
}>;

export type DocumentSelectionInput = Readonly<{
  conversationId: ConversationId;
  messageId: MessageId;
  documentIds: ReadonlyArray<DocumentId>;
}>;

export type DocumentStatusInput = Readonly<{
  documentId: DocumentId;
  status: DocumentStatus;
}>;

/**
 * Provider-neutral document metadata boundary. Implementations must authorize
 * every operation with the trusted owner/context arguments; no owner is read
 * from a prompt, browser payload, or worker job payload.
 */
export interface DocumentRepository {
  createDocument(context: TrustedDocumentContext, input: CreateDocumentInput): Promise<Document>;
  getDocument(context: TrustedDocumentContext, documentId: DocumentId): Promise<Document | null>;
  listDocuments(context: TrustedDocumentContext, filter?: DocumentListFilter): Promise<ReadonlyArray<Document>>;
  createVersion(context: TrustedDocumentContext, input: CreateVersionInput): Promise<DocumentVersion>;
  getVersion(
    context: TrustedDocumentContext,
    documentId: DocumentId,
    versionId: DocumentVersionId,
  ): Promise<DocumentVersion | null>;
  setCurrentVersion(context: TrustedDocumentContext, input: CurrentVersionInput): Promise<Document>;
  setDocumentStatus(context: TrustedDocumentContext, input: DocumentStatusInput): Promise<Document>;
  archiveDocument(context: TrustedDocumentContext, documentId: DocumentId): Promise<Document>;
  attachToConversation(context: TrustedDocumentContext, input: ConversationDocumentInput): Promise<ConversationDocument>;
  detachFromConversation(context: TrustedDocumentContext, input: ConversationDocumentInput): Promise<ConversationDocument>;
  listConversationDocuments(
    context: TrustedDocumentContext,
    conversationId: ConversationId,
  ): Promise<ReadonlyArray<ConversationDocument>>;
  selectDocumentsForMessage(
    context: TrustedDocumentContext,
    input: DocumentSelectionInput,
  ): Promise<ReadonlyArray<DocumentSelection>>;
}

type Clock = () => Date;

type ProjectRecord = Readonly<{ ownerId: OwnerId; projectId: ProjectId }>;
type ConversationRecord = Readonly<{ ownerId: OwnerId; conversationId: ConversationId }>;
type MessageRecord = Readonly<{
  ownerId: OwnerId;
  conversationId: ConversationId;
  messageId: MessageId;
}>;

type InMemoryDocumentRepositoryState = Readonly<{
  documents: Map<string, Document>;
  versions: Map<string, DocumentVersion>;
  conversationDocuments: Map<string, ConversationDocument>;
  selections: Map<string, DocumentSelection>;
  projects: Map<string, ProjectRecord>;
  conversations: Map<string, ConversationRecord>;
  messages: Map<string, MessageRecord>;
}>;

/**
 * Test-only repository. It deliberately has no persistence or storage
 * behavior, and mirrors the authorization invariants a real adapter must
 * enforce before returning metadata.
 */
export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, Document>();
  private readonly versions = new Map<string, DocumentVersion>();
  private readonly conversationDocuments = new Map<string, ConversationDocument>();
  private readonly selections = new Map<string, DocumentSelection>();
  private readonly projects = new Map<string, ProjectRecord>();
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, MessageRecord>();

  constructor(private readonly now: Clock = () => new Date()) {}

  captureState(): InMemoryDocumentRepositoryState {
    return {
      documents: new Map(this.documents),
      versions: new Map(this.versions),
      conversationDocuments: new Map(this.conversationDocuments),
      selections: new Map(this.selections),
      projects: new Map(this.projects),
      conversations: new Map(this.conversations),
      messages: new Map(this.messages),
    };
  }

  restoreState(state: InMemoryDocumentRepositoryState) {
    this.documents.clear();
    this.versions.clear();
    this.conversationDocuments.clear();
    this.selections.clear();
    this.projects.clear();
    this.conversations.clear();
    this.messages.clear();
    for (const [key, value] of state.documents) this.documents.set(key, value);
    for (const [key, value] of state.versions) this.versions.set(key, value);
    for (const [key, value] of state.conversationDocuments) this.conversationDocuments.set(key, value);
    for (const [key, value] of state.selections) this.selections.set(key, value);
    for (const [key, value] of state.projects) this.projects.set(key, value);
    for (const [key, value] of state.conversations) this.conversations.set(key, value);
    for (const [key, value] of state.messages) this.messages.set(key, value);
  }

  seedProject(context: TrustedDocumentContext, value: ProjectId = projectId(randomUUID())) {
    const canonical = this.contextOwner(context);
    const id = this.validProject(value);
    this.projects.set(this.ownerKey(canonical, id), { ownerId: canonical, projectId: id });
    return id;
  }

  seedConversation(context: TrustedDocumentContext, value: ConversationId = conversationId(randomUUID())) {
    const canonical = this.contextOwner(context);
    const id = this.validConversation(value);
    this.conversations.set(this.ownerKey(canonical, id), { ownerId: canonical, conversationId: id });
    return id;
  }

  seedMessage(
    context: TrustedDocumentContext,
    conversationIdValue: ConversationId,
    value: MessageId = messageId(randomUUID()),
  ) {
    const canonical = this.contextOwner(context);
    const conversation = this.validConversation(conversationIdValue);
    this.requireConversation(canonical, conversation);
    const id = this.validMessage(value);
    this.messages.set(this.ownerKey(canonical, id), {
      ownerId: canonical,
      conversationId: conversation,
      messageId: id,
    });
    return id;
  }

  async createDocument(context: TrustedDocumentContext, input: CreateDocumentInput): Promise<Document> {
    const owner = this.contextOwner(context);
    const id = input.documentId ? this.validDocument(input.documentId) : documentId(randomUUID());
    if (this.documents.has(this.ownerKey(owner, id))) {
      throw new DocumentPlatformError("DOCUMENT_ALREADY_EXISTS");
    }
    if (input.projectId !== undefined && input.projectId !== null) {
      this.requireProject(owner, this.validProject(input.projectId));
    }
    this.validateDocumentInput(input);
    const timestamp = this.timestamp();
    const document: Document = {
      documentId: id,
      ownerId: owner,
      projectId: input.projectId ?? null,
      name: input.name.trim(),
      mediaType: input.mediaType.trim(),
      sizeBytes: input.sizeBytes,
      status: "pending",
      currentVersion: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.documents.set(this.ownerKey(owner, id), document);
    return document;
  }

  async getDocument(context: TrustedDocumentContext, id: DocumentId): Promise<Document | null> {
    const owner = this.contextOwner(context);
    return this.documents.get(this.ownerKey(owner, this.validDocument(id))) ?? null;
  }

  async listDocuments(context: TrustedDocumentContext, filter: DocumentListFilter = {}): Promise<ReadonlyArray<Document>> {
    const owner = this.contextOwner(context);
    if (filter.projectId !== undefined && filter.projectId !== null) {
      this.requireProject(owner, this.validProject(filter.projectId));
    }
    if (filter.conversationId !== undefined) {
      this.requireConversation(owner, this.validConversation(filter.conversationId));
    }
    const statuses = filter.status === undefined
      ? null
      : new Set(Array.isArray(filter.status) ? filter.status : [filter.status]);
    const conversationIdValue = filter.conversationId === undefined
      ? null
      : this.validConversation(filter.conversationId);
    const limit = this.pageSize(filter.limit);
    const offset = this.pageOffset(filter.offset);
    return [...this.documents.values()]
      .filter((document) => document.ownerId === owner)
      .filter((document) => filter.projectId === undefined || document.projectId === (filter.projectId ?? null))
      .filter((document) => statuses === null || statuses.has(document.status))
      .filter((document) => conversationIdValue === null || this.isAvailable(owner, conversationIdValue, document.documentId))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.documentId.localeCompare(right.documentId))
      .slice(offset, offset + limit);
  }

  async createVersion(context: TrustedDocumentContext, input: CreateVersionInput): Promise<DocumentVersion> {
    const owner = this.contextOwner(context);
    const id = this.validDocument(input.documentId);
    const versionIdValue = this.validVersion(input.versionId);
    const document = this.requireDocument(owner, id);
    if (document.status === "deleted" || document.status === "archived") {
      throw new DocumentPlatformError("DOCUMENT_ARCHIVED");
    }
    const expectedLocator = this.expectedLocator(owner, id, versionIdValue);
    if (!this.sameLocator(input.storageLocator, expectedLocator)) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    }
    if (input.versionNumber !== undefined && (!Number.isSafeInteger(input.versionNumber) || input.versionNumber < 1)) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    }
    const checksum = this.validChecksum(input.checksum);
    const sizeBytes = this.validSize(input.sizeBytes);
    const mediaType = this.validMediaType(input.mediaType);
    if (sizeBytes !== document.sizeBytes || mediaType !== document.mediaType) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_METADATA_MISMATCH");
    }
    const versionNumber = input.versionNumber ?? this.nextVersionNumber(owner, id);
    const key = this.versionKey(owner, id, versionIdValue);
    if (this.versions.has(key)) throw new DocumentPlatformError("DOCUMENT_VERSION_EXISTS");
    if ([...this.versions.values()].some(
      (version) => version.ownerId === owner && version.documentId === id && version.versionNumber === versionNumber,
    )) throw new DocumentPlatformError("DOCUMENT_VERSION_EXISTS");
    const version: DocumentVersion = {
      versionId: versionIdValue,
      ownerId: owner,
      documentId: id,
      versionNumber,
      storageLocator: expectedLocator,
      checksum,
      sizeBytes,
      mediaType,
      createdAt: this.timestamp(),
    };
    this.versions.set(key, version);
    return version;
  }

  async getVersion(context: TrustedDocumentContext, id: DocumentId, versionIdValue: DocumentVersionId) {
    const owner = this.contextOwner(context);
    return this.versions.get(this.versionKey(owner, this.validDocument(id), this.validVersion(versionIdValue))) ?? null;
  }

  async setCurrentVersion(context: TrustedDocumentContext, input: CurrentVersionInput): Promise<Document> {
    const owner = this.contextOwner(context);
    const id = this.validDocument(input.documentId);
    const versionIdValue = this.validVersion(input.versionId);
    const document = this.requireDocument(owner, id);
    if (document.status === "deleted" || document.status === "expired" || document.status === "archived") {
      throw new DocumentPlatformError("DOCUMENT_UNAVAILABLE");
    }
    const version = this.versions.get(this.versionKey(owner, id, versionIdValue));
    if (!version || version.documentId !== id || version.ownerId !== owner) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    }
    const updated = { ...document, currentVersion: version.versionNumber, updatedAt: this.timestamp() };
    this.documents.set(this.ownerKey(owner, id), updated);
    return updated;
  }

  async setDocumentStatus(context: TrustedDocumentContext, input: DocumentStatusInput): Promise<Document> {
    const owner = this.contextOwner(context);
    const id = this.validDocument(input.documentId);
    const document = this.requireDocument(owner, id);
    if (!Object.hasOwn(DOCUMENT_STATUS_TRANSITIONS, input.status)) {
      throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    }
    if (!isDocumentStatusTransitionAllowed(document.status, input.status)) {
      throw new DocumentPlatformError("DOCUMENT_STATUS_TRANSITION_INVALID");
    }
    if (input.status === "ready" && document.currentVersion === null) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    }
    const updated = { ...document, status: input.status, updatedAt: this.timestamp() };
    this.documents.set(this.ownerKey(owner, id), updated);
    return updated;
  }

  async archiveDocument(context: TrustedDocumentContext, id: DocumentId): Promise<Document> {
    const owner = this.contextOwner(context);
    const document = this.requireDocument(owner, this.validDocument(id));
    const updated = { ...document, status: "archived" as const, updatedAt: this.timestamp() };
    this.documents.set(this.ownerKey(owner, document.documentId), updated);
    for (const [key, membership] of this.conversationDocuments) {
      if (membership.ownerId === owner && membership.documentId === document.documentId && membership.available) {
        this.conversationDocuments.set(key, { ...membership, available: false, removedAt: this.timestamp() });
      }
    }
    return updated;
  }

  async attachToConversation(context: TrustedDocumentContext, input: ConversationDocumentInput): Promise<ConversationDocument> {
    const owner = this.contextOwner(context);
    const conversation = this.validConversation(input.conversationId);
    const id = this.validDocument(input.documentId);
    this.requireConversation(owner, conversation);
    const document = this.requireDocument(owner, id);
    if (document.status === "deleted" || document.status === "expired" || document.status === "archived") {
      throw new DocumentPlatformError("DOCUMENT_UNAVAILABLE");
    }
    const key = this.membershipKey(owner, conversation, id);
    const existing = this.conversationDocuments.get(key);
    if (existing?.available) return existing;
    const membership: ConversationDocument = {
      conversationId: conversation,
      ownerId: owner,
      documentId: id,
      available: true,
      addedAt: existing?.addedAt ?? this.timestamp(),
      removedAt: null,
    };
    this.conversationDocuments.set(key, membership);
    return membership;
  }

  async detachFromConversation(context: TrustedDocumentContext, input: ConversationDocumentInput): Promise<ConversationDocument> {
    const owner = this.contextOwner(context);
    const conversation = this.validConversation(input.conversationId);
    const id = this.validDocument(input.documentId);
    this.requireConversation(owner, conversation);
    this.requireDocument(owner, id);
    const key = this.membershipKey(owner, conversation, id);
    const existing = this.conversationDocuments.get(key);
    if (!existing || !existing.available) {
      throw new DocumentPlatformError("CONVERSATION_DOCUMENT_NOT_FOUND");
    }
    const updated = { ...existing, available: false, removedAt: this.timestamp() };
    this.conversationDocuments.set(key, updated);
    return updated;
  }

  async listConversationDocuments(context: TrustedDocumentContext, conversationIdValue: ConversationId) {
    const owner = this.contextOwner(context);
    const conversation = this.validConversation(conversationIdValue);
    this.requireConversation(owner, conversation);
    return [...this.conversationDocuments.values()]
      .filter((membership) => membership.ownerId === owner && membership.conversationId === conversation)
      .sort((left, right) => left.addedAt.localeCompare(right.addedAt));
  }

  async selectDocumentsForMessage(context: TrustedDocumentContext, input: DocumentSelectionInput) {
    const owner = this.contextOwner(context);
    const conversation = this.validConversation(input.conversationId);
    const message = this.validMessage(input.messageId);
    this.requireConversation(owner, conversation);
    this.requireMessage(owner, conversation, message);
    if (!Array.isArray(input.documentIds)) throw new DocumentPlatformError("SELECTION_INPUT_INVALID");
    const documentIds = input.documentIds.map((value) => this.validDocument(value));
    if (new Set(documentIds).size !== documentIds.length) {
      throw new DocumentPlatformError("SELECTION_INPUT_INVALID");
    }
    const existing = [...this.selections.values()].filter(
      (selection) => selection.ownerId === owner && selection.messageId === message,
    );
    if (existing.length > 0 && existing.some((selection) => !documentIds.includes(selection.documentId))) {
      throw new DocumentPlatformError("MESSAGE_SELECTION_CONFLICT");
    }
    const selected: DocumentSelection[] = [];
    for (const id of documentIds) {
      if (!this.isAvailable(owner, conversation, id)) {
        throw new DocumentPlatformError("DOCUMENT_UNAVAILABLE");
      }
    }
    for (const id of documentIds) {
      const selectionKey = this.selectionKey(owner, message, id);
      const value = this.selections.get(selectionKey) ?? {
        messageId: message,
        ownerId: owner,
        conversationId: conversation,
        documentId: id,
        createdAt: this.timestamp(),
      } satisfies DocumentSelection;
      this.selections.set(selectionKey, value);
      selected.push(value);
    }
    return selected;
  }

  private isAvailable(owner: OwnerId, conversation: ConversationId, id: DocumentId) {
    const document = this.documents.get(this.ownerKey(owner, id));
    const membership = this.conversationDocuments.get(this.membershipKey(owner, conversation, id));
    return Boolean(
      document && document.status === "ready" && document.currentVersion !== null && membership?.available,
    );
  }

  private requireDocument(owner: OwnerId, id: DocumentId) {
    const document = this.documents.get(this.ownerKey(owner, id));
    if (!document) throw new DocumentPlatformError("DOCUMENT_NOT_ACCESSIBLE");
    return document;
  }

  private requireProject(owner: OwnerId, id: ProjectId) {
    if (!this.projects.has(this.ownerKey(owner, id))) throw new DocumentPlatformError("PROJECT_NOT_ACCESSIBLE");
  }

  private requireConversation(owner: OwnerId, id: ConversationId) {
    if (!this.conversations.has(this.ownerKey(owner, id))) {
      throw new DocumentPlatformError("CONVERSATION_NOT_ACCESSIBLE");
    }
  }

  private requireMessage(owner: OwnerId, conversation: ConversationId, id: MessageId) {
    const record = this.messages.get(this.ownerKey(owner, id));
    if (!record || record.conversationId !== conversation) {
      throw new DocumentPlatformError("MESSAGE_NOT_ACCESSIBLE");
    }
  }

  private validateDocumentInput(input: CreateDocumentInput) {
    if (!input.name.trim() || !input.mediaType.trim() || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 0) {
      throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    }
  }

  private nextVersionNumber(owner: OwnerId, document: DocumentId) {
    return [...this.versions.values()]
      .filter((version) => version.ownerId === owner && version.documentId === document)
      .reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
  }

  private timestamp() {
    return this.now().toISOString();
  }

  private contextOwner(context: TrustedDocumentContext): OwnerId {
    try {
      return assertTrustedDocumentContext(context).ownerId;
    } catch {
      throw new DocumentPlatformError("TRUSTED_CONTEXT_INVALID");
    }
  }

  private expectedLocator(owner: OwnerId, document: DocumentId, version: DocumentVersionId) {
    try {
      return createStorageLocator({
        ownerId: storageOwnerId(owner),
        documentId: storageDocumentId(document),
        versionId: storageVersionId(version),
      });
    } catch {
      throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    }
  }

  private sameLocator(left: CreateVersionInput["storageLocator"], right: ReturnType<typeof createStorageLocator>) {
    return left.ownerId === right.ownerId && left.documentId === right.documentId &&
      left.versionId === right.versionId && left.key === right.key;
  }

  private validChecksum(value: string) {
    try {
      return storageChecksum(value);
    } catch {
      throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    }
  }

  private validSize(value: number) {
    if (!Number.isSafeInteger(value) || value < 0) throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    return value;
  }

  private validMediaType(value: string) {
    const mediaType = value.trim();
    if (!/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(mediaType)) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    }
    return mediaType;
  }

  private validDocument(value: DocumentId) {
    try {
      return documentId(value);
    } catch {
      throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    }
  }

  private validVersion(value: DocumentVersionId) {
    try {
      return documentVersionId(value);
    } catch {
      throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    }
  }

  private validProject(value: ProjectId) {
    try {
      return projectId(value);
    } catch {
      throw new DocumentPlatformError("PROJECT_NOT_ACCESSIBLE");
    }
  }

  private validConversation(value: ConversationId) {
    try {
      return conversationId(value);
    } catch {
      throw new DocumentPlatformError("CONVERSATION_NOT_ACCESSIBLE");
    }
  }

  private validMessage(value: MessageId) {
    try {
      return messageId(value);
    } catch {
      throw new DocumentPlatformError("MESSAGE_NOT_ACCESSIBLE");
    }
  }

  private pageSize(value: number | undefined) {
    if (value === undefined) return 50;
    if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    return value;
  }

  private pageOffset(value: number | undefined) {
    if (value === undefined) return 0;
    if (!Number.isSafeInteger(value) || value < 0) throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    return value;
  }

  private ownerKey(owner: OwnerId, id: string) {
    return `${owner}:${id}`;
  }

  private versionKey(owner: OwnerId, document: DocumentId, version: DocumentVersionId) {
    return `${this.ownerKey(owner, document)}:${version}`;
  }

  private membershipKey(owner: OwnerId, conversation: ConversationId, document: DocumentId) {
    return `${this.ownerKey(owner, conversation)}:${document}`;
  }

  private selectionKey(owner: OwnerId, message: MessageId, document: DocumentId) {
    return `${this.ownerKey(owner, message)}:${document}`;
  }
}
