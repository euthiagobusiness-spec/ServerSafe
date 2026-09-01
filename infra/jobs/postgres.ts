import { randomUUID } from "node:crypto";
import {
  assertTrustedDocumentContext,
  createTrustedDocumentContext,
  documentId,
  documentVersionId,
  jobId,
  type TrustedDocumentContext,
  type OwnerId,
} from "../documents/domain";
import { DocumentPlatformError } from "../documents/errors";
import { one, type SqlClient, type SqlRow } from "../postgres/sql";
import {
  DOCUMENT_JOB_TYPES,
  type JobRecord,
  type JobStore,
  type JobUpdate,
} from "./service";

const JOB_COLUMNS = `
  job_id, owner_id, document_id, document_version_id, job_type, status,
  attempt, max_attempts, available_at, lease_until, idempotency_key,
  parameters, last_error_code, created_at, updated_at, completed_at`;

export class PostgresJobStore implements JobStore {
  constructor(private readonly client: SqlClient) {}

  async findByIdempotency(context: TrustedDocumentContext, idempotencyKey: string) {
    const owner = this.owner(context);
    const key = this.idempotencyKey(idempotencyKey);
    const result = await this.client.query(`
      select ${JOB_COLUMNS} from serversafe.jobs
      where owner_id = $1::uuid and idempotency_key = $2::text`, [owner, key]);
    const row = one(result);
    return row ? this.job(row) : null;
  }

  async create(job: JobRecord) {
    const result = await this.client.query(`
      with created as (
        insert into serversafe.jobs
          (job_id, owner_id, document_id, document_version_id, job_type, status,
           attempt, max_attempts, available_at, lease_until, idempotency_key,
           parameters, last_error_code, created_at, updated_at, completed_at)
        values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::text, $6::text,
          $7::integer, $8::integer, $9::timestamptz, $10::timestamptz, $11::text,
          $12::jsonb, $13::text, $14::timestamptz, $15::timestamptz, $16::timestamptz)
        returning ${JOB_COLUMNS}
      ), outbox as (
        insert into serversafe.job_outbox
          (outbox_id, owner_id, job_id, event_type, payload, available_at)
        select $17::uuid, created.owner_id, created.job_id, 'job.queued', created.parameters, created.available_at
        from created
        on conflict (job_id, event_type) do nothing
      )
      select ${JOB_COLUMNS} from created`, [
      job.jobId, job.ownerId, job.documentId, job.versionId, job.type, job.status,
      job.attempt, job.maxAttempts, job.availableAt, job.leaseUntil, job.idempotencyKey,
      JSON.stringify(job.payload), job.lastErrorCode, job.createdAt, job.updatedAt, job.completedAt, randomUUID(),
    ]);
    return this.job(this.required(result));
  }

  async get(context: TrustedDocumentContext, id: JobRecord["jobId"]) {
    const owner = this.owner(context);
    const job = this.validJob(id);
    const result = await this.client.query(`
      select ${JOB_COLUMNS} from serversafe.jobs
      where owner_id = $1::uuid and job_id = $2::uuid`, [owner, job]);
    const row = one(result);
    return row ? this.job(row) : null;
  }

  async update(context: TrustedDocumentContext, id: JobRecord["jobId"], update: JobUpdate) {
    const owner = this.owner(context);
    const job = this.validJob(id);
    const status = update.status ?? null;
    const attempt = update.attempt ?? null;
    const availableAt = update.availableAt ?? null;
    const leaseSet = Object.hasOwn(update, "leaseUntil");
    const heartbeatSet = Object.hasOwn(update, "heartbeatAt");
    const errorSet = Object.hasOwn(update, "lastErrorCode");
    const completedSet = Object.hasOwn(update, "completedAt");
    const updatedAt = update.updatedAt ?? new Date().toISOString();
    const result = await this.client.query(`
      update serversafe.jobs
      set status = coalesce($3::text, status),
          attempt = coalesce($4::integer, attempt),
          available_at = coalesce($5::timestamptz, available_at),
          lease_until = case when $6::boolean then $7::timestamptz else lease_until end,
          heartbeat_at = case when $8::boolean then $9::timestamptz else heartbeat_at end,
          last_error_code = case when $10::boolean then $11::text else last_error_code end,
          completed_at = case when $12::boolean then $13::timestamptz else completed_at end,
          updated_at = $14::timestamptz
      where owner_id = $1::uuid and job_id = $2::uuid
      returning ${JOB_COLUMNS}`, [
      owner, job, status, attempt, availableAt, leaseSet, update.leaseUntil ?? null,
      heartbeatSet, update.heartbeatAt ?? null, errorSet, update.lastErrorCode ?? null,
      completedSet, update.completedAt ?? null, updatedAt,
    ]);
    const row = one(result);
    return row ? this.job(row) : null;
  }

  private job(row: SqlRow): JobRecord {
    const owner = this.ownerValue(row.owner_id);
    const documentIdValue = this.uuid(documentId, row.document_id, "DOCUMENT_INPUT_INVALID");
    const versionId = this.uuid(documentVersionId, row.document_version_id, "DOCUMENT_VERSION_INVALID");
    const type = this.string(row.job_type);
    if (!DOCUMENT_JOB_TYPES.includes(type as typeof DOCUMENT_JOB_TYPES[number])) {
      throw new DocumentPlatformError("JOB_INPUT_INVALID");
    }
    const status = this.string(row.status);
    if (!["queued", "processing", "completed", "failed", "cancelled"].includes(status)) {
      throw new DocumentPlatformError("JOB_INPUT_INVALID");
    }
    const payload = this.payload(row.parameters, owner, documentIdValue, versionId, type as typeof DOCUMENT_JOB_TYPES[number]);
    return {
      jobId: this.uuid(jobId, row.job_id, "JOB_INPUT_INVALID"),
      ownerId: owner,
      documentId: documentIdValue,
      versionId,
      type: type as JobRecord["type"],
      status: status as JobRecord["status"],
      attempt: this.integer(row.attempt),
      maxAttempts: this.integer(row.max_attempts),
      idempotencyKey: this.string(row.idempotency_key),
      payload,
      availableAt: this.timestamp(row.available_at),
      leaseUntil: row.lease_until === null ? null : this.timestamp(row.lease_until),
      heartbeatAt: row.heartbeat_at === null ? null : this.timestamp(row.heartbeat_at),
      lastErrorCode: row.last_error_code === null ? null : this.errorCode(row.last_error_code),
      completedAt: row.completed_at === null ? null : this.timestamp(row.completed_at),
      createdAt: this.timestamp(row.created_at),
      updatedAt: this.timestamp(row.updated_at),
    };
  }

  private payload(value: unknown, ownerId: OwnerId, documentIdValue: JobRecord["documentId"], versionId: JobRecord["versionId"], operation: JobRecord["type"]): JobRecord["payload"] {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new DocumentPlatformError("WORKER_ENVELOPE_INVALID");
    const payload = value as Record<string, unknown>;
    if (payload.ownerId !== ownerId || payload.documentId !== documentIdValue || payload.versionId !== versionId || payload.operation !== operation || Object.keys(payload).length !== 4) {
      throw new DocumentPlatformError("WORKER_ENVELOPE_MISMATCH");
    }
    return { ownerId, documentId: documentIdValue, versionId, operation };
  }

  private owner(context: TrustedDocumentContext) {
    try { return assertTrustedDocumentContext(context).ownerId; } catch { throw new DocumentPlatformError("TRUSTED_CONTEXT_INVALID"); }
  }

  private ownerValue(value: unknown) {
    try { return createTrustedDocumentContext(this.string(value) as never).ownerId; } catch { throw new DocumentPlatformError("WORKER_ENVELOPE_INVALID"); }
  }

  private required<Row extends SqlRow>(result: { rows: ReadonlyArray<Row> }) {
    const row = one(result);
    if (!row) throw new DocumentPlatformError("JOB_NOT_FOUND");
    return row;
  }

  private validJob(value: JobRecord["jobId"]) {
    return this.uuid(jobId, value, "JOB_INPUT_INVALID");
  }

  private uuid<T>(factory: (value: string) => T, value: unknown, code: string) {
    try { return factory(this.string(value)); } catch { throw new DocumentPlatformError(code as never); }
  }

  private string(value: unknown) {
    if (typeof value !== "string" || !value) throw new DocumentPlatformError("JOB_INPUT_INVALID");
    return value;
  }

  private integer(value: unknown) {
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isSafeInteger(number)) throw new DocumentPlatformError("JOB_INPUT_INVALID");
    return number;
  }

  private timestamp(value: unknown) {
    const date = value instanceof Date ? value : new Date(this.string(value));
    if (Number.isNaN(date.getTime())) throw new DocumentPlatformError("JOB_INPUT_INVALID");
    return date.toISOString();
  }

  private idempotencyKey(value: string) {
    const key = value.trim();
    if (!key || key.length > 200) throw new DocumentPlatformError("JOB_INPUT_INVALID");
    return key;
  }

  private errorCode(value: unknown) {
    const code = this.string(value).trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").slice(0, 64);
    return code || "JOB_FAILED";
  }
}
