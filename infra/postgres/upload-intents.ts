import { randomUUID } from "node:crypto";
import {
  assertTrustedDocumentContext,
  createTrustedDocumentContext,
  documentId,
  documentVersionId,
  type DocumentId,
  type DocumentVersionId,
  type TrustedDocumentContext,
} from "../documents/domain";
import { DocumentPlatformError } from "../documents/errors";
import {
  storageChecksum,
} from "../storage/storage";
import { one, type SqlClient, type SqlRow } from "./sql";
import type {
  CreateUploadIntentInput,
  UploadIntent,
  UploadIntentStore,
} from "../documents/upload-intents";

const UPLOAD_INTENT_COLUMNS = `
  upload_intent_id, owner_id, document_id, document_version_id,
  expected_checksum, expected_size_bytes, media_type, status,
  expires_at, created_at, completed_at`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PostgresUploadIntentStore implements UploadIntentStore {
  constructor(private readonly client: SqlClient) {}

  async create(context: TrustedDocumentContext, input: CreateUploadIntentInput) {
    const owner = this.owner(context);
    const document = this.validDocument(input.documentId);
    const version = this.validVersion(input.versionId);
    const checksum = this.validChecksum(input.expectedChecksum);
    const mediaType = input.mediaType.trim();
    const expiresAt = this.validFutureTimestamp(input.expiresAt);
    if (!mediaType || !Number.isSafeInteger(input.expectedSizeBytes) || input.expectedSizeBytes < 0) {
      throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    }
    const result = await this.client.query(`
      insert into serversafe.upload_intents
        (upload_intent_id, owner_id, document_id, document_version_id,
         expected_checksum, expected_size_bytes, media_type, status, expires_at)
      values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::text, $6::bigint, $7::text, 'pending', $8::timestamptz)
      returning ${UPLOAD_INTENT_COLUMNS}`, [
      cryptoUuid(), owner, document, version, checksum, input.expectedSizeBytes, mediaType, expiresAt,
    ]);
    return this.intent(this.required(result));
  }

  async get(context: TrustedDocumentContext, documentIdValue: DocumentId, versionIdValue: DocumentVersionId) {
    const owner = this.owner(context);
    const document = this.validDocument(documentIdValue);
    const version = this.validVersion(versionIdValue);
    await this.client.query(`
      update serversafe.upload_intents
      set status = 'expired'
      where owner_id = $1::uuid and document_id = $2::uuid and document_version_id = $3::uuid
        and status = 'pending' and expires_at <= now()`, [owner, document, version]);
    const result = await this.client.query(`
      select ${UPLOAD_INTENT_COLUMNS} from serversafe.upload_intents
      where owner_id = $1::uuid and document_id = $2::uuid and document_version_id = $3::uuid`, [owner, document, version]);
    const row = one(result);
    return row ? this.intent(row) : null;
  }

  async markCompleted(context: TrustedDocumentContext, documentIdValue: DocumentId, versionIdValue: DocumentVersionId) {
    return this.mark(context, documentIdValue, versionIdValue, "completed");
  }

  async markExpired(context: TrustedDocumentContext, documentIdValue: DocumentId, versionIdValue: DocumentVersionId) {
    return this.mark(context, documentIdValue, versionIdValue, "expired");
  }

  private async mark(
    context: TrustedDocumentContext,
    documentIdValue: DocumentId,
    versionIdValue: DocumentVersionId,
    status: "completed" | "expired",
  ) {
    const owner = this.owner(context);
    const document = this.validDocument(documentIdValue);
    const version = this.validVersion(versionIdValue);
    const result = await this.client.query(`
      update serversafe.upload_intents
      set status = $4::text, completed_at = case when $4::text = 'completed' then now() else completed_at end
      where owner_id = $1::uuid and document_id = $2::uuid and document_version_id = $3::uuid
        and status = 'pending' and expires_at > now()
      returning ${UPLOAD_INTENT_COLUMNS}`, [owner, document, version, status]);
    const row = one(result);
    if (row) return this.intent(row);
    const existing = await this.get(context, document, version);
    if (!existing) throw new DocumentPlatformError("UPLOAD_INTENT_NOT_FOUND");
    if (status === "expired" && existing.status === "expired") return existing;
    if (existing.status === "expired") throw new DocumentPlatformError("UPLOAD_INTENT_EXPIRED");
    throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
  }

  private intent(row: SqlRow): UploadIntent {
    return {
      uploadIntentId: this.uuidString(row.upload_intent_id),
      ownerId: this.ownerValue(row.owner_id),
      documentId: this.validDocument(this.uuidString(row.document_id)),
      versionId: this.validVersion(this.uuidString(row.document_version_id)),
      expectedChecksum: this.validChecksum(this.string(row.expected_checksum)),
      expectedSizeBytes: this.integer(row.expected_size_bytes),
      mediaType: this.string(row.media_type),
      status: this.validStatus(this.string(row.status)),
      expiresAt: this.timestamp(row.expires_at),
      createdAt: this.timestamp(row.created_at),
      completedAt: row.completed_at === null ? null : this.timestamp(row.completed_at),
    };
  }

  private owner(context: TrustedDocumentContext) {
    try { return assertTrustedDocumentContext(context).ownerId; } catch { throw new DocumentPlatformError("TRUSTED_CONTEXT_INVALID"); }
  }

  private ownerValue(value: unknown) {
    try { return createTrustedDocumentContext(this.uuidString(value) as never).ownerId; } catch {
      throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    }
  }

  private validDocument(value: string | DocumentId) {
    try { return documentId(value); } catch { throw new DocumentPlatformError("UPLOAD_INTENT_INVALID"); }
  }

  private validVersion(value: string | DocumentVersionId) {
    try { return documentVersionId(value); } catch { throw new DocumentPlatformError("UPLOAD_INTENT_INVALID"); }
  }

  private validChecksum(value: string) {
    try { return storageChecksum(value); } catch { throw new DocumentPlatformError("UPLOAD_INTENT_INVALID"); }
  }

  private validFutureTimestamp(value: string) {
    if (Number.isNaN(Date.parse(value)) || Date.parse(value) <= Date.now()) {
      throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    }
    return new Date(value).toISOString();
  }

  private validStatus(value: string): UploadIntent["status"] {
    if (!["pending", "completed", "expired", "failed"].includes(value)) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    return value as UploadIntent["status"];
  }

  private required<Row extends SqlRow>(result: { rows: ReadonlyArray<Row> }) {
    const row = one(result);
    if (!row) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    return row;
  }

  private string(value: unknown) {
    if (typeof value !== "string" || !value) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    return value;
  }

  private uuidString(value: unknown) {
    const uuid = this.string(value);
    if (!UUID_PATTERN.test(uuid)) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    return uuid;
  }

  private integer(value: unknown) {
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isSafeInteger(number) || number < 0) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    return number;
  }

  private timestamp(value: unknown) {
    const date = value instanceof Date ? value : new Date(this.string(value));
    if (Number.isNaN(date.getTime())) throw new DocumentPlatformError("UPLOAD_INTENT_INVALID");
    return date.toISOString();
  }
}

function cryptoUuid() {
  return randomUUID();
}
