import { randomUUID } from "node:crypto";
import {
  assertTrustedDocumentContext,
  documentId,
  documentVersionId,
  type TrustedDocumentContext,
  type ConversationDocument,
  type CreateDocumentInput,
  type CreateVersionInput,
  type Document,
  type DocumentId,
  type DocumentSelection,
  type DocumentVersion,
  type DocumentVersionId,
  type ProjectId,
} from "./domain";
import { DocumentPlatformError } from "./errors";
import type {
  ConversationDocumentInput,
  DocumentListFilter,
  DocumentRepository,
  DocumentSelectionInput,
} from "./repository";
import {
  createStorageLocator,
  storageChecksum,
  storageDocumentId,
  storageOwnerId,
  storageVersionId,
  type StorageLocator,
  type StorageProvider,
  type StorageObjectMetadata,
  type UploadTarget,
} from "../storage/storage";
import {
  type CreateJobInput,
  type DocumentJobType,
  type JobRecord,
  JobService,
} from "../jobs/service";
import { InMemoryDocumentRepository } from "./repository";
import { InMemoryDocumentUnitOfWork, type DocumentUnitOfWork } from "./transaction";
import {
  InMemoryUploadIntentStore,
  type CreateUploadIntentInput,
  type UploadIntentStore,
} from "./upload-intents";

export type CreateDocumentRequest = Omit<CreateDocumentInput, "documentId"> & {
  documentId?: DocumentId;
};

export type InitializeUploadInput = Readonly<{
  name: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  projectId?: ProjectId | null;
}>;

export type UploadInitialization = Readonly<{
  document: Document;
  versionId: DocumentVersionId;
  uploadIntentId: string;
  locator: StorageLocator;
  mode: "signed" | "direct";
  target: UploadTarget | null;
}>;

export type CompleteUploadInput = Readonly<{
  documentId: DocumentId;
  versionId: DocumentVersionId;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  idempotencyKey: string;
  jobType?: DocumentJobType;
}>;

export type CompleteUploadResult = Readonly<{
  document: Document;
  version: DocumentVersion;
  job: JobRecord;
}>;

export type DocumentApplicationServiceOptions = Readonly<{
  unitOfWork?: DocumentUnitOfWork;
  uploadIntents?: UploadIntentStore;
  clock?: () => Date;
}>;

/**
 * Application boundary for the future document library. It receives a
 * trusted authenticated owner from its caller; browser/agent inputs contain
 * document and conversation IDs only, never an owner selector.
 */
export class DocumentApplicationService<
  TRepository extends DocumentRepository = DocumentRepository,
  TStorage extends StorageProvider = StorageProvider,
> {
  private readonly unitOfWork: DocumentUnitOfWork;
  private readonly uploadIntents: UploadIntentStore;
  private readonly now: () => Date;

  constructor(
    private readonly repository: TRepository,
    private readonly storage: TStorage,
    private readonly jobs: JobService,
    options: DocumentApplicationServiceOptions = {},
  ) {
    this.now = options.clock ?? (() => new Date());
    this.uploadIntents = options.uploadIntents ?? new InMemoryUploadIntentStore(this.now);
    this.unitOfWork = options.unitOfWork ?? this.defaultUnitOfWork();
  }

  async create(context: TrustedDocumentContext, input: CreateDocumentRequest): Promise<Document> {
    return this.repository.createDocument(this.context(context), input);
  }

  async get(context: TrustedDocumentContext, documentIdValue: DocumentId): Promise<Document | null> {
    return this.repository.getDocument(this.context(context), documentIdValue);
  }

  async list(context: TrustedDocumentContext, filter?: DocumentListFilter): Promise<ReadonlyArray<Document>> {
    return this.repository.listDocuments(this.context(context), filter);
  }

  async initializeUpload(context: TrustedDocumentContext, input: InitializeUploadInput): Promise<UploadInitialization> {
    const trustedContext = this.context(context);
    const canonicalOwner = trustedContext.ownerId;
    const checksum = this.checksum(input.checksum);
    this.validateUploadInput(input);
    const versionIdValue = documentVersionId(randomUUID());
    const pending = await this.unitOfWork.run(async ({ repository, uploadIntents }) => {
      const document = await repository.createDocument(trustedContext, {
        name: input.name,
        mediaType: input.contentType,
        sizeBytes: input.sizeBytes,
        projectId: input.projectId,
      });
      const locator = createStorageLocator({
        ownerId: storageOwnerId(canonicalOwner),
        documentId: storageDocumentId(document.documentId),
        versionId: storageVersionId(versionIdValue),
      });
      const intentInput: CreateUploadIntentInput = {
        documentId: document.documentId,
        versionId: versionIdValue,
        expectedChecksum: checksum,
        expectedSizeBytes: input.sizeBytes,
        mediaType: input.contentType,
        expiresAt: new Date(this.now().getTime() + 15 * 60_000).toISOString(),
      };
      const intent = await uploadIntents.create(trustedContext, intentInput);
      return { document, locator, intent };
    });
    const descriptor = {
      locator: pending.locator,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      checksum,
    };
    try {
      const target = await this.storage.createUploadTarget({
        ...descriptor,
        expiresInSeconds: 900,
        condition: { type: "if-absent" },
      });
      return {
        document: pending.document,
        versionId: versionIdValue,
        uploadIntentId: pending.intent.uploadIntentId,
        locator: pending.locator,
        mode: "signed",
        target,
      };
    } catch (error) {
      if (!(error instanceof DocumentPlatformError) || error.code !== "STORAGE_CAPABILITY_UNSUPPORTED") throw error;
      return {
        document: pending.document,
        versionId: versionIdValue,
        uploadIntentId: pending.intent.uploadIntentId,
        locator: pending.locator,
        mode: "direct",
        target: null,
      };
    }
  }

  async completeUpload(context: TrustedDocumentContext, input: CompleteUploadInput): Promise<CompleteUploadResult> {
    const trustedContext = this.context(context);
    const documentIdValue = this.validDocument(input.documentId);
    const versionIdValue = this.validVersion(input.versionId);
    const checksum = this.checksum(input.checksum);
    const locator = createStorageLocator({
      ownerId: storageOwnerId(trustedContext.ownerId),
      documentId: storageDocumentId(documentIdValue),
      versionId: storageVersionId(versionIdValue),
    });
    return this.unitOfWork.run(async ({ repository, jobs, uploadIntents }) => {
      const intent = await uploadIntents.get(trustedContext, documentIdValue, versionIdValue);
      this.assertUploadIntent(intent, input, checksum);
      const document = await repository.getDocument(trustedContext, documentIdValue);
      if (!document) throw new DocumentPlatformError("DOCUMENT_NOT_ACCESSIBLE");
      if (document.sizeBytes !== input.sizeBytes || document.mediaType !== input.contentType) {
        throw new DocumentPlatformError("DOCUMENT_OBJECT_METADATA_MISMATCH");
      }
      const object = await this.storage.head(locator);
      this.assertCompletedObject(object, locator, input.contentType, input.sizeBytes, checksum);
      const version = await repository.createVersion(trustedContext, {
        documentId: document.documentId,
        versionId: versionIdValue,
        storageLocator: locator,
        checksum,
        sizeBytes: input.sizeBytes,
        mediaType: input.contentType,
      });
      await repository.setCurrentVersion(trustedContext, {
        documentId: document.documentId,
        versionId: version.versionId,
      });
      const ready = await repository.setDocumentStatus(trustedContext, {
        documentId: document.documentId,
        status: "ready",
      });
      const jobInput: CreateJobInput = {
        documentId: document.documentId,
        versionId: version.versionId,
        type: input.jobType ?? "document.extract",
        idempotencyKey: input.idempotencyKey,
      };
      const job = await jobs.create(trustedContext, jobInput);
      await uploadIntents.markCompleted(trustedContext, document.documentId, version.versionId);
      return { document: ready, version, job };
    });
  }

  async attachToConversation(context: TrustedDocumentContext, input: ConversationDocumentInput): Promise<ConversationDocument> {
    return this.unitOfWork.run(({ repository }) => repository.attachToConversation(this.context(context), input));
  }

  async detachFromConversation(context: TrustedDocumentContext, input: ConversationDocumentInput): Promise<ConversationDocument> {
    return this.unitOfWork.run(({ repository }) => repository.detachFromConversation(this.context(context), input));
  }

  async selectDocumentsForMessage(context: TrustedDocumentContext, input: DocumentSelectionInput): Promise<ReadonlyArray<DocumentSelection>> {
    return this.unitOfWork.run(({ repository }) => repository.selectDocumentsForMessage(this.context(context), input));
  }

  async createVersion(context: TrustedDocumentContext, input: CreateVersionInput): Promise<DocumentVersion> {
    const trustedContext = this.context(context);
    const versionIdValue = this.validVersion(input.versionId);
    const expectedLocator = this.expectedLocator(trustedContext, input.documentId, versionIdValue);
    if (!this.sameLocator(input.storageLocator, expectedLocator)) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    }
    return this.repository.createVersion(trustedContext, { ...input, storageLocator: expectedLocator });
  }

  async archive(context: TrustedDocumentContext, documentIdValue: DocumentId): Promise<Document> {
    return this.repository.archiveDocument(this.context(context), documentIdValue);
  }

  private context(value: TrustedDocumentContext) {
    try {
      return assertTrustedDocumentContext(value);
    } catch {
      throw new DocumentPlatformError("TRUSTED_CONTEXT_INVALID");
    }
  }

  private expectedLocator(context: TrustedDocumentContext, document: DocumentId, version: DocumentVersionId) {
    try {
      return createStorageLocator({
        ownerId: storageOwnerId(context.ownerId),
        documentId: storageDocumentId(document),
        versionId: storageVersionId(version),
      });
    } catch {
      throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    }
  }

  private sameLocator(left: StorageLocator, right: StorageLocator) {
    return left.ownerId === right.ownerId && left.documentId === right.documentId &&
      left.versionId === right.versionId && left.key === right.key;
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

  private defaultUnitOfWork(): DocumentUnitOfWork {
    if (
      this.repository instanceof InMemoryDocumentRepository &&
      this.uploadIntents instanceof InMemoryUploadIntentStore
    ) {
      return new InMemoryDocumentUnitOfWork(this.repository, this.jobs, this.uploadIntents);
    }
    throw new Error("DOCUMENT_TRANSACTION_BOUNDARY_REQUIRED");
  }

  private checksum(value: string) {
    try {
      return storageChecksum(value);
    } catch {
      throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    }
  }

  private assertUploadIntent(
    intent: Awaited<ReturnType<UploadIntentStore["get"]>>,
    input: CompleteUploadInput,
    checksum: ReturnType<typeof storageChecksum>,
  ) {
    if (!intent) throw new DocumentPlatformError("UPLOAD_INTENT_NOT_FOUND");
    if (intent.status === "expired") throw new DocumentPlatformError("UPLOAD_INTENT_EXPIRED");
    if (intent.status !== "pending") throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    if (
      intent.mediaType !== input.contentType ||
      intent.expectedSizeBytes !== input.sizeBytes ||
      intent.expectedChecksum !== checksum
    ) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
  }

  private validateUploadInput(input: InitializeUploadInput) {
    if (!input.name.trim() || !input.contentType.trim() || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 0) {
      throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    }
  }

  private assertCompletedObject(
    object: StorageObjectMetadata | null,
    locator: StorageLocator,
    contentType: string,
    sizeBytes: number,
    checksum: string,
  ) {
    if (!object) throw new DocumentPlatformError("DOCUMENT_OBJECT_MISSING");
    if (
      object.locator.ownerId !== locator.ownerId ||
      object.locator.documentId !== locator.documentId ||
      object.locator.versionId !== locator.versionId ||
      object.contentType !== contentType ||
      object.sizeBytes !== sizeBytes ||
      object.checksum !== checksum
    ) throw new DocumentPlatformError("DOCUMENT_OBJECT_METADATA_MISMATCH");
  }
}
