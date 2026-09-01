import { randomUUID } from "node:crypto";
import {
  assertTrustedDocumentContext,
  createTrustedDocumentContext,
  conversationId,
  documentId,
  documentVersionId,
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
} from "../documents/domain";
import { DocumentPlatformError } from "../documents/errors";
import type {
  DocumentListFilter,
  ConversationDocumentInput,
  CurrentVersionInput,
  DocumentRepository,
  DocumentSelectionInput,
  DocumentStatusInput,
} from "../documents/repository";
import {
  createStorageLocator,
  storageChecksum,
  storageDocumentId,
  storageOwnerId,
  storageVersionId,
  type StorageLocator,
} from "../storage/storage";
import { one, type SqlClient, type SqlRow } from "./sql";

const DOCUMENT_COLUMNS = `
  document_id, owner_id, project_id, name, media_type, size_bytes,
  status, current_version, created_at, updated_at`;
const DOCUMENT_COLUMNS_D = `
  d.document_id, d.owner_id, d.project_id, d.name, d.media_type, d.size_bytes,
  d.status, d.current_version, d.created_at, d.updated_at`;
const VERSION_COLUMNS = `
  version_id, owner_id, document_id, version_number, storage_key,
  checksum, size_bytes, media_type, created_at`;

export class PostgresDocumentRepository implements DocumentRepository {
  constructor(private readonly client: SqlClient) {}

  async createDocument(context: TrustedDocumentContext, input: CreateDocumentInput) {
    const owner = this.owner(context);
    this.validateDocument(input);
    const project = input.projectId === undefined || input.projectId === null ? null : this.validProject(input.projectId);
    const row = await this.client.query(`
      insert into serversafe.documents
        (document_id, owner_id, project_id, name, media_type, size_bytes)
      values ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::bigint)
      returning ${DOCUMENT_COLUMNS}`, [
      input.documentId ?? cryptoUuid(), owner, project, input.name.trim(), input.mediaType.trim(), input.sizeBytes,
    ]);
    return this.document(this.required(row));
  }

  async getDocument(context: TrustedDocumentContext, id: DocumentId) {
    const owner = this.owner(context);
    const document = this.validDocument(id);
    const result = await this.client.query(`
      select ${DOCUMENT_COLUMNS} from serversafe.documents
      where owner_id = $1::uuid and document_id = $2::uuid`, [owner, document]);
    const row = one(result);
    return row ? this.document(row) : null;
  }

  async listDocuments(context: TrustedDocumentContext, filter: DocumentListFilter = {}) {
    const owner = this.owner(context);
    const projectMode = filter.projectId === undefined ? "none" : filter.projectId === null ? "null" : "value";
    const project = filter.projectId === undefined || filter.projectId === null ? null : this.validProject(filter.projectId);
    const conversation = filter.conversationId === undefined ? null : this.validConversation(filter.conversationId);
    if (conversation) await this.requireConversation(owner, conversation);
    const statuses = filter.status === undefined
      ? null
      : (Array.isArray(filter.status) ? filter.status : [filter.status]).map((status) => this.validStatus(status));
    const limit = this.pageSize(filter.limit);
    const offset = this.pageOffset(filter.offset);
    const result = await this.client.query(`
      select ${DOCUMENT_COLUMNS} from serversafe.documents d
      where d.owner_id = $1::uuid
        and ($2::text = 'none'
          or ($2::text = 'null' and d.project_id is null)
          or ($2::text = 'value' and d.project_id = $3::uuid))
        and ($4::uuid is null or exists (
          select 1 from serversafe.conversation_documents cd
          where cd.owner_id = $1::uuid and cd.conversation_id = $4::uuid
            and cd.document_id = d.document_id and cd.available = true
        ))
        and ($5::text[] is null or d.status = any($5::text[]))
      order by d.created_at asc, d.document_id asc
      limit $6::integer offset $7::integer`, [owner, projectMode, project, conversation, statuses, limit, offset]);
    return result.rows.map((row) => this.document(row));
  }

  async createVersion(context: TrustedDocumentContext, input: CreateVersionInput) {
    const owner = this.owner(context);
    const document = this.validDocument(input.documentId);
    const version = this.validVersion(input.versionId);
    const locator = this.expectedLocator(owner, document, version);
    if (!this.sameLocator(input.storageLocator, locator)) throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    const checksum = this.validChecksum(input.checksum);
    const size = this.validSize(input.sizeBytes);
    const mediaType = this.validMediaType(input.mediaType);
    const existingDocument = await this.getDocument(context, document);
    if (!existingDocument) throw new DocumentPlatformError("DOCUMENT_NOT_ACCESSIBLE");
    if (existingDocument.status === "archived" || existingDocument.status === "deleted") {
      throw new DocumentPlatformError("DOCUMENT_ARCHIVED");
    }
    if (existingDocument.sizeBytes !== size || existingDocument.mediaType !== mediaType) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_METADATA_MISMATCH");
    }
    if (input.versionNumber !== undefined && (!Number.isSafeInteger(input.versionNumber) || input.versionNumber < 1)) {
      throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    }
    const row = await this.client.query(`
      insert into serversafe.document_versions
        (version_id, owner_id, document_id, version_number, storage_key, checksum, size_bytes, media_type)
      values (
        $1::uuid, $2::uuid, $3::uuid,
        coalesce($4::integer, (select coalesce(max(version_number), 0) + 1
          from serversafe.document_versions where owner_id = $2::uuid and document_id = $3::uuid)),
        $5::text, $6::text, $7::bigint, $8::text
      )
      returning ${VERSION_COLUMNS}`, [
      version, owner, document, input.versionNumber ?? null, locator.key, checksum, size, mediaType,
    ]);
    return this.version(this.required(row));
  }

  async getVersion(context: TrustedDocumentContext, id: DocumentId, versionIdValue: DocumentVersionId) {
    const owner = this.owner(context);
    const document = this.validDocument(id);
    const version = this.validVersion(versionIdValue);
    const result = await this.client.query(`
      select ${VERSION_COLUMNS} from serversafe.document_versions
      where owner_id = $1::uuid and document_id = $2::uuid and version_id = $3::uuid`, [owner, document, version]);
    const row = one(result);
    return row ? this.version(row) : null;
  }

  async setCurrentVersion(context: TrustedDocumentContext, input: CurrentVersionInput) {
    const owner = this.owner(context);
    const document = this.validDocument(input.documentId);
    const version = this.validVersion(input.versionId);
    const result = await this.client.query(`
      update serversafe.documents d
      set current_version = v.version_number, updated_at = now()
      from serversafe.document_versions v
      where d.owner_id = $1::uuid and d.document_id = $2::uuid
        and v.owner_id = $1::uuid and v.document_id = d.document_id and v.version_id = $3::uuid
        and d.status not in ('expired', 'archived', 'deleted')
      returning ${DOCUMENT_COLUMNS_D}`, [owner, document, version]);
    const row = one(result);
    if (!row) throw new DocumentPlatformError("DOCUMENT_UNAVAILABLE");
    return this.document(row);
  }

  async setDocumentStatus(context: TrustedDocumentContext, input: DocumentStatusInput) {
    const owner = this.owner(context);
    const document = this.validDocument(input.documentId);
    const status = this.validStatus(input.status);
    const current = await this.getDocument(context, document);
    if (!current) throw new DocumentPlatformError("DOCUMENT_NOT_ACCESSIBLE");
    if (!isDocumentStatusTransitionAllowed(current.status, status)) {
      throw new DocumentPlatformError("DOCUMENT_STATUS_TRANSITION_INVALID");
    }
    if (status === "ready" && current.currentVersion === null) throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    const result = await this.client.query(`
      update serversafe.documents
      set status = $3::text, updated_at = now()
      where owner_id = $1::uuid and document_id = $2::uuid
      returning ${DOCUMENT_COLUMNS}`, [owner, document, status]);
    return this.document(this.required(result));
  }

  async archiveDocument(context: TrustedDocumentContext, id: DocumentId) {
    const owner = this.owner(context);
    const document = this.validDocument(id);
    const result = await this.client.query(`
      with archived as (
        update serversafe.documents
        set status = 'archived', updated_at = now()
        where owner_id = $1::uuid and document_id = $2::uuid
        returning ${DOCUMENT_COLUMNS}
      ), disabled as (
        update serversafe.conversation_documents cd
        set available = false, removed_at = coalesce(cd.removed_at, now())
        from archived a
        where cd.owner_id = a.owner_id and cd.document_id = a.document_id and cd.available = true
        returning cd.document_id
      )
      select ${DOCUMENT_COLUMNS} from archived`, [owner, document]);
    const row = one(result);
    if (!row) throw new DocumentPlatformError("DOCUMENT_NOT_ACCESSIBLE");
    return this.document(row);
  }

  async attachToConversation(context: TrustedDocumentContext, input: ConversationDocumentInput) {
    const owner = this.owner(context);
    const conversation = this.validConversation(input.conversationId);
    const document = this.validDocument(input.documentId);
    const result = await this.client.query(`
      insert into serversafe.conversation_documents
        (conversation_id, owner_id, document_id, available, added_at, removed_at)
      select $1::uuid, $2::uuid, d.document_id, true, now(), null
      from serversafe.documents d
      where d.owner_id = $2::uuid and d.document_id = $3::uuid
        and d.status not in ('expired', 'archived', 'deleted')
        and exists (
          select 1 from serversafe.conversations c
          where c.owner_id = $2::uuid and c.conversation_id = $1::uuid
        )
      on conflict (conversation_id, document_id) do update
        set available = true, removed_at = null
      returning conversation_id, owner_id, document_id, available, added_at, removed_at`, [conversation, owner, document]);
    const row = one(result);
    if (!row) throw new DocumentPlatformError("DOCUMENT_UNAVAILABLE");
    return this.membership(row);
  }

  async detachFromConversation(context: TrustedDocumentContext, input: ConversationDocumentInput) {
    const owner = this.owner(context);
    const conversation = this.validConversation(input.conversationId);
    const document = this.validDocument(input.documentId);
    const result = await this.client.query(`
      update serversafe.conversation_documents
      set available = false, removed_at = now()
      where owner_id = $1::uuid and conversation_id = $2::uuid and document_id = $3::uuid and available = true
      returning conversation_id, owner_id, document_id, available, added_at, removed_at`, [owner, conversation, document]);
    const row = one(result);
    if (!row) throw new DocumentPlatformError("CONVERSATION_DOCUMENT_NOT_FOUND");
    return this.membership(row);
  }

  async listConversationDocuments(context: TrustedDocumentContext, conversationIdValue: ConversationId) {
    const owner = this.owner(context);
    const conversation = this.validConversation(conversationIdValue);
    await this.requireConversation(owner, conversation);
    const result = await this.client.query(`
      select conversation_id, owner_id, document_id, available, added_at, removed_at
      from serversafe.conversation_documents
      where owner_id = $1::uuid and conversation_id = $2::uuid
      order by added_at asc, document_id asc`, [owner, conversation]);
    return result.rows.map((row) => this.membership(row));
  }

  async selectDocumentsForMessage(context: TrustedDocumentContext, input: DocumentSelectionInput) {
    const owner = this.owner(context);
    const conversation = this.validConversation(input.conversationId);
    const message = this.validMessage(input.messageId);
    const documents = input.documentIds.map((value) => this.validDocument(value));
    if (new Set(documents).size !== documents.length) throw new DocumentPlatformError("SELECTION_INPUT_INVALID");
    const access = await this.client.query(`
      select
        exists (
          select 1 from serversafe.messages
          where owner_id = $1::uuid and conversation_id = $2::uuid and message_id = $3::uuid
        ) as message_access,
        (select count(*) from serversafe.conversation_documents cd
          join serversafe.documents d on d.owner_id = cd.owner_id and d.document_id = cd.document_id
          where cd.owner_id = $1::uuid and cd.conversation_id = $2::uuid and cd.available = true
            and d.status = 'ready' and d.current_version is not null and cd.document_id = any($4::uuid[])) as eligible_count,
        (select count(*) from serversafe.message_documents md
          where md.owner_id = $1::uuid and md.message_id = $3::uuid
            and not (md.document_id = any($4::uuid[]))) as selection_conflict`,
      [owner, conversation, message, documents],
    );
    const accessRow = this.required(access);
    if (accessRow.message_access !== true) throw new DocumentPlatformError("MESSAGE_NOT_ACCESSIBLE");
    if (Number(accessRow.eligible_count) !== documents.length) throw new DocumentPlatformError("DOCUMENT_UNAVAILABLE");
    if (Number(accessRow.selection_conflict) !== 0) throw new DocumentPlatformError("MESSAGE_SELECTION_CONFLICT");
    if (documents.length === 0) return [];
    await this.client.query(`
      insert into serversafe.message_documents (message_id, owner_id, conversation_id, document_id)
      select $1::uuid, $2::uuid, $3::uuid, value
      from unnest($4::uuid[]) as requested(value)
      on conflict (message_id, document_id) do nothing`, [message, owner, conversation, documents]);
    const result = await this.client.query(`
      select message_id, owner_id, conversation_id, document_id, created_at
      from serversafe.message_documents
      where owner_id = $2::uuid and message_id = $1::uuid and document_id = any($4::uuid[])
      order by created_at asc, document_id asc`, [message, owner, conversation, documents]);
    const rows = result.rows;
    if (rows.length !== documents.length) throw new DocumentPlatformError("DOCUMENT_UNAVAILABLE");
    return rows.map((row) => this.selection(row));
  }

  private owner(context: TrustedDocumentContext) {
    try { return assertTrustedDocumentContext(context).ownerId; } catch { throw new DocumentPlatformError("TRUSTED_CONTEXT_INVALID"); }
  }

  private async requireConversation(owner: string, conversation: ConversationId) {
    const result = await this.client.query(`
      select 1 from serversafe.conversations
      where owner_id = $1::uuid and conversation_id = $2::uuid`, [owner, conversation]);
    if (!one(result)) throw new DocumentPlatformError("CONVERSATION_NOT_ACCESSIBLE");
  }

  private document(row: SqlRow): Document {
    const status = this.validStatus(this.string(row.status));
    return {
      documentId: this.validDocument(this.string(row.document_id)),
      ownerId: this.ownerValue(row.owner_id),
      projectId: row.project_id === null ? null : projectId(this.string(row.project_id)),
      name: this.string(row.name),
      mediaType: this.string(row.media_type),
      sizeBytes: this.integer(row.size_bytes),
      status,
      currentVersion: row.current_version === null ? null : this.integer(row.current_version),
      createdAt: this.timestamp(row.created_at),
      updatedAt: this.timestamp(row.updated_at),
    };
  }

  private version(row: SqlRow): DocumentVersion {
    const owner = this.ownerValue(row.owner_id);
    const document = this.validDocument(this.string(row.document_id));
    const version = this.validVersion(this.string(row.version_id));
    const locator = this.expectedLocator(owner, document, version);
    if (this.string(row.storage_key) !== locator.key) throw new DocumentPlatformError("DOCUMENT_VERSION_MISMATCH");
    return {
      versionId: version,
      ownerId: owner,
      documentId: document,
      versionNumber: this.integer(row.version_number),
      storageLocator: locator,
      checksum: this.validChecksum(this.string(row.checksum)),
      sizeBytes: this.integer(row.size_bytes),
      mediaType: this.validMediaType(this.string(row.media_type)),
      createdAt: this.timestamp(row.created_at),
    };
  }

  private membership(row: SqlRow): ConversationDocument {
    return {
      conversationId: this.validConversation(this.string(row.conversation_id)),
      ownerId: this.ownerValue(row.owner_id),
      documentId: this.validDocument(this.string(row.document_id)),
      available: row.available === true,
      addedAt: this.timestamp(row.added_at),
      removedAt: row.removed_at === null ? null : this.timestamp(row.removed_at),
    };
  }

  private selection(row: SqlRow): DocumentSelection {
    return {
      messageId: this.validMessage(this.string(row.message_id)),
      ownerId: this.ownerValue(row.owner_id),
      conversationId: this.validConversation(this.string(row.conversation_id)),
      documentId: this.validDocument(this.string(row.document_id)),
      createdAt: this.timestamp(row.created_at),
    };
  }

  private required<Row extends SqlRow>(result: { rows: ReadonlyArray<Row> }) {
    const row = one(result);
    if (!row) throw new DocumentPlatformError("DOCUMENT_NOT_FOUND");
    return row;
  }

  private validateDocument(input: CreateDocumentInput) {
    if (!input.name.trim() || !input.mediaType.trim() || !Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 0) {
      throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    }
  }

  private expectedLocator(owner: string, document: DocumentId, version: DocumentVersionId): StorageLocator {
    return createStorageLocator({
      ownerId: storageOwnerId(owner), documentId: storageDocumentId(document), versionId: storageVersionId(version),
    });
  }

  private sameLocator(left: StorageLocator, right: StorageLocator) {
    return left.ownerId === right.ownerId && left.documentId === right.documentId &&
      left.versionId === right.versionId && left.key === right.key;
  }

  private ownerValue(value: unknown) {
    try { return createTrustedDocumentContext(this.string(value) as never).ownerId; } catch {
      throw new DocumentPlatformError("DOCUMENT_NOT_ACCESSIBLE");
    }
  }

  private validDocument(value: string | DocumentId) {
    try { return documentId(value); } catch { throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID"); }
  }

  private validVersion(value: string | DocumentVersionId) {
    try { return documentVersionId(value); } catch { throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID"); }
  }

  private validConversation(value: string | ConversationId) {
    try { return conversationId(value); } catch { throw new DocumentPlatformError("CONVERSATION_NOT_ACCESSIBLE"); }
  }

  private validMessage(value: string | MessageId) {
    try { return messageId(value); } catch { throw new DocumentPlatformError("MESSAGE_NOT_ACCESSIBLE"); }
  }

  private validProject(value: string) {
    try { return projectId(value); } catch { throw new DocumentPlatformError("PROJECT_NOT_ACCESSIBLE"); }
  }

  private validChecksum(value: string) {
    try { return storageChecksum(value); } catch { throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID"); }
  }

  private validStatus(value: string | DocumentStatus) {
    if (!["pending", "processing", "ready", "failed", "expired", "archived", "deleted"].includes(value)) {
      throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    }
    return value as DocumentStatus;
  }

  private validSize(value: number) {
    if (!Number.isSafeInteger(value) || value < 0) throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    return value;
  }

  private validMediaType(value: string) {
    const mediaType = value.trim();
    if (!/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(mediaType)) throw new DocumentPlatformError("DOCUMENT_VERSION_INVALID");
    return mediaType;
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

  private string(value: unknown) {
    if (typeof value !== "string" || !value) throw new DocumentPlatformError("DOCUMENT_NOT_FOUND");
    return value;
  }

  private integer(value: unknown) {
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isSafeInteger(number)) throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    return number;
  }

  private timestamp(value: unknown) {
    const date = value instanceof Date ? value : new Date(this.string(value));
    if (Number.isNaN(date.getTime())) throw new DocumentPlatformError("DOCUMENT_INPUT_INVALID");
    return date.toISOString();
  }
}

function cryptoUuid() {
  return randomUUID();
}
