import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTrustedDocumentContext,
  documentVersionId,
  type Document,
  type DocumentVersion,
} from "../documents/domain";
import { DocumentPlatformError } from "../documents/errors";
import { InMemoryDocumentRepository } from "../documents/repository";
import { DocumentApplicationService } from "../documents/service";
import { InMemoryDocumentUnitOfWork } from "../documents/transaction";
import { InMemoryUploadIntentStore } from "../documents/upload-intents";
import { InMemoryJobStore, JobService } from "../jobs/service";
import { InMemoryValkeyQueue } from "../jobs/queue";
import { createWorkerJobEnvelope, assertWorkerJobEnvelope } from "../workers/contracts";
import { DocumentWorkerRuntime } from "../workers/runtime";
import { PostgresDocumentRepository } from "../postgres/repository";
import type { SqlClient, SqlResult } from "../postgres/sql";
import { storageChecksum, createStorageLocator, storageDocumentId, storageOwnerId, storageVersionId, type StorageProvider } from "../storage/storage";
import { buildChatPrompt, selectChatAttachments, type StoredAttachment } from "../../src/features/server-safe-ai/attachments";

const ownerA = createTrustedDocumentContext("11111111-1111-4111-8111-111111111111" as never);
const ownerB = createTrustedDocumentContext("22222222-2222-4222-8222-222222222222" as never);
const documentIdA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Document["documentId"];
const versionIdA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as DocumentVersion["versionId"];
const checksum = createHash("sha256").update("B2").digest("hex");

function platformError(code: string) {
  return (error: unknown) => error instanceof DocumentPlatformError && error.code === code;
}

async function readyFixture() {
  const repository = new InMemoryDocumentRepository();
  const document = await repository.createDocument(ownerA, {
    documentId: documentIdA,
    name: "B2.txt",
    mediaType: "text/plain",
    sizeBytes: 2,
  });
  const locator = createStorageLocator({
    ownerId: storageOwnerId(ownerA.ownerId),
    documentId: storageDocumentId(document.documentId),
    versionId: storageVersionId(versionIdA),
  });
  const version = await repository.createVersion(ownerA, {
    documentId: document.documentId,
    versionId: versionIdA,
    storageLocator: locator,
    checksum,
    sizeBytes: 2,
    mediaType: "text/plain",
  });
  const current = await repository.setCurrentVersion(ownerA, {
    documentId: document.documentId,
    versionId: version.versionId,
  });
  const ready = await repository.setDocumentStatus(ownerA, {
    documentId: document.documentId,
    status: "ready",
  });
  return { repository, document: ready, version, locator, current };
}

test("B2 unit of work rolls back document and upload intent atomically", async () => {
  const repository = new InMemoryDocumentRepository();
  const jobStore = new InMemoryJobStore();
  const jobs = new JobService(repository, jobStore);
  const intents = new InMemoryUploadIntentStore(() => new Date("2026-09-01T00:00:00.000Z"));
  const unitOfWork = new InMemoryDocumentUnitOfWork(repository, jobs, intents);
  await assert.rejects(
    unitOfWork.run(async ({ repository: scoped, uploadIntents }) => {
      const document = await scoped.createDocument(ownerA, {
        name: "rollback.txt",
        mediaType: "text/plain",
        sizeBytes: 2,
      });
      const locator = createStorageLocator({
        ownerId: storageOwnerId(ownerA.ownerId),
        documentId: storageDocumentId(document.documentId),
        versionId: storageVersionId(versionIdA),
      });
      await scoped.createVersion(ownerA, {
        documentId: document.documentId,
        versionId: versionIdA,
        storageLocator: locator,
        checksum,
        sizeBytes: 2,
        mediaType: "text/plain",
      });
      await scoped.setCurrentVersion(ownerA, { documentId: document.documentId, versionId: versionIdA });
      await scoped.setDocumentStatus(ownerA, { documentId: document.documentId, status: "ready" });
      await uploadIntents.create(ownerA, {
        documentId: document.documentId,
        versionId: versionIdA,
        expectedChecksum: checksum,
        expectedSizeBytes: 2,
        mediaType: "text/plain",
        expiresAt: "2026-09-01T00:15:00.000Z",
      });
      await jobs.create(ownerA, {
        documentId: document.documentId,
        versionId: versionIdA,
        type: "document.extract",
        idempotencyKey: "rollback-job",
      });
      throw new Error("intentional rollback");
    }),
    /intentional rollback/,
  );
  assert.deepEqual(await repository.listDocuments(ownerA), []);
  assert.equal(jobStore.count(), 0);
  assert.equal(await intents.get(ownerA, documentIdA, versionIdA), null);
});

test("upload intent is owner-scoped, completes with metadata, and expires", async () => {
  let now = new Date("2026-09-01T00:00:00.000Z");
  const repository = new InMemoryDocumentRepository(() => now);
  const jobs = new JobService(repository, new InMemoryJobStore(), () => now);
  const intents = new InMemoryUploadIntentStore(() => now);
  const unitOfWork = new InMemoryDocumentUnitOfWork(repository, jobs, intents);
  const locatorById = new Map<string, ReturnType<typeof createStorageLocator>>();
  const storage = {
    async createUploadTarget() { throw new DocumentPlatformError("STORAGE_CAPABILITY_UNSUPPORTED"); },
    async head(locator: ReturnType<typeof createStorageLocator>) {
      const stored = locatorById.get(locator.versionId);
      return stored ? {
        locator: stored,
        contentType: "text/plain",
        sizeBytes: 2,
        checksum: storageChecksum(checksum),
        createdAt: now.toISOString(),
      } : null;
    },
  } as unknown as StorageProvider;
  const service = new DocumentApplicationService(repository, storage, jobs, { unitOfWork, uploadIntents: intents, clock: () => now });
  const initialized = await service.initializeUpload(ownerA, {
    name: "intent.txt",
    contentType: "text/plain",
    sizeBytes: 2,
    checksum,
  });
  const pending = await intents.get(ownerA, initialized.document.documentId, initialized.versionId);
  assert.equal(pending?.status, "pending");
  assert.equal(await intents.get(ownerB, initialized.document.documentId, initialized.versionId), null);
  locatorById.set(initialized.locator.versionId, initialized.locator);
  const completed = await service.completeUpload(ownerA, {
    documentId: initialized.document.documentId,
    versionId: initialized.versionId,
    contentType: "text/plain",
    sizeBytes: 2,
    checksum,
    idempotencyKey: "b2-upload",
  });
  assert.equal(completed.document.status, "ready");
  assert.equal((await intents.get(ownerA, initialized.document.documentId, initialized.versionId))?.status, "completed");

  const expired = await service.initializeUpload(ownerA, {
    name: "expired.txt",
    contentType: "text/plain",
    sizeBytes: 2,
    checksum,
  });
  now = new Date("2026-09-01T00:16:00.000Z");
  await assert.rejects(
    service.completeUpload(ownerA, {
      documentId: expired.document.documentId,
      versionId: expired.versionId,
      contentType: "text/plain",
      sizeBytes: 2,
      checksum,
      idempotencyKey: "expired-upload",
    }),
    platformError("UPLOAD_INTENT_EXPIRED"),
  );
});

test("job lifecycle has leases, heartbeat, retry, terminal failure, and cancellation", async () => {
  let now = new Date("2026-09-01T00:00:00.000Z");
  const fixture = await readyFixture();
  const store = new InMemoryJobStore();
  const jobs = new JobService(fixture.repository, store, () => now);
  const first = await jobs.create(ownerA, {
    documentId: fixture.document.documentId,
    versionId: fixture.version.versionId,
    type: "document.extract",
    idempotencyKey: "lifecycle-1",
  });
  const processing = await jobs.startProcessing(ownerA, first.jobId, "2026-09-01T00:01:00.000Z");
  assert.equal(processing?.status, "processing");
  const heartbeat = await jobs.heartbeat(ownerA, first.jobId, "2026-09-01T00:02:00.000Z");
  assert.equal(heartbeat?.heartbeatAt, now.toISOString());
  const retried = await jobs.fail(ownerA, first.jobId, "transient provider error", true);
  assert.equal(retried?.status, "queued");
  assert.equal(retried?.lastErrorCode, "TRANSIENT_PROVIDER_ERROR");
  const secondProcessing = await jobs.startProcessing(ownerA, first.jobId, "2026-09-01T00:03:00.000Z");
  assert.equal(secondProcessing?.attempt, 2);
  const terminal = await jobs.fail(ownerA, first.jobId, "permanent failure", false);
  assert.equal(terminal?.status, "failed");
  assert.equal(terminal?.completedAt, now.toISOString());
  const cancelled = await jobs.create(ownerA, {
    documentId: fixture.document.documentId,
    versionId: fixture.version.versionId,
    type: "document.chunk",
    idempotencyKey: "lifecycle-cancel",
  });
  assert.equal((await jobs.cancel(ownerA, cancelled.jobId))?.status, "cancelled");
  now = new Date("2026-09-01T00:10:00.000Z");
  await assert.rejects(jobs.heartbeat(ownerA, first.jobId, "2026-09-01T00:11:00.000Z"), platformError("JOB_LEASE_INVALID"));
});

test("Valkey-compatible queue provides idempotency, leases, retry, and DLQ", async () => {
  let now = new Date("2026-09-01T00:00:00.000Z");
  const fixture = await readyFixture();
  const jobs = new JobService(fixture.repository, new InMemoryJobStore(), () => now);
  const job = await jobs.create(ownerA, {
    documentId: fixture.document.documentId,
    versionId: fixture.version.versionId,
    type: "document.extract",
    idempotencyKey: "queue-1",
  });
  const envelope = createWorkerJobEnvelope(job);
  const queue = new InMemoryValkeyQueue(() => now);
  await queue.enqueue("documents", envelope);
  await queue.enqueue("documents", envelope);
  assert.equal(queue.size(), 1);
  const reservation = await queue.reserve("documents", 1);
  assert.ok(reservation);
  now = new Date("2026-09-01T00:00:02.000Z");
  await assert.rejects(queue.ack(reservation!), platformError("QUEUE_LEASE_EXPIRED"));
  const reclaimed = await queue.reserve("documents", 30);
  assert.ok(reclaimed);
  await queue.retry(reclaimed!, { availableAt: "2026-09-01T00:00:03.000Z", errorCode: "transient" });
  assert.equal(await queue.reserve("documents"), null);
  now = new Date("2026-09-01T00:00:04.000Z");
  const failed = await queue.reserve("documents");
  assert.ok(failed);
  await queue.fail(failed!, "bad payload");
  assert.equal(queue.deadLetters()[0]?.errorCode, "BAD_PAYLOAD");
});

test("worker ignores forged queue ownership and invokes handlers only after official comparison", async () => {
  const fixture = await readyFixture();
  const store = new InMemoryJobStore();
  const jobs = new JobService(fixture.repository, store);
  const official = await jobs.create(ownerA, {
    documentId: fixture.document.documentId,
    versionId: fixture.version.versionId,
    type: "document.extract",
    idempotencyKey: "worker-1",
  });
  const queue = new InMemoryValkeyQueue();
  await queue.enqueue("documents", createWorkerJobEnvelope(official));
  let handled = 0;
  const runtime = new DocumentWorkerRuntime(
    queue,
    jobs,
    async () => ownerA,
    { "document.extract": async ({ job }) => { handled += 1; assert.equal(job.documentId, fixture.document.documentId); } },
  );
  assert.deepEqual(await runtime.runOnce("documents"), { status: "completed", jobId: official.jobId });
  assert.equal(handled, 1);

  const forged = { ...createWorkerJobEnvelope(official), ownerId: ownerB.ownerId, payload: {
    ...createWorkerJobEnvelope(official).payload,
    ownerId: ownerB.ownerId,
  } };
  const forgedQueue = new InMemoryValkeyQueue();
  await forgedQueue.enqueue("documents", forged);
  const forgedRuntime = new DocumentWorkerRuntime(forgedQueue, jobs, async () => ownerB, {});
  const result = await forgedRuntime.runOnce("documents");
  assert.equal(result.status, "failed");
  assert.equal(forgedQueue.deadLetters()[0]?.errorCode, "WORKER_ENVELOPE_MISMATCH");
  assert.equal(handled, 1);
});

test("worker envelope rejects extra fields and queue payloads contain metadata only", async () => {
  const fixture = await readyFixture();
  const jobs = new JobService(fixture.repository, new InMemoryJobStore());
  const job = await jobs.create(ownerA, {
    documentId: fixture.document.documentId,
    versionId: fixture.version.versionId,
    type: "document.extract",
    idempotencyKey: "metadata-only",
  });
  const envelope = createWorkerJobEnvelope(job);
  assert.deepEqual(Object.keys(envelope).sort(), ["attempt", "documentId", "idempotencyKey", "jobId", "maxAttempts", "operation", "ownerId", "payload", "status", "versionId"]);
  assert.throws(() => assertWorkerJobEnvelope({ ...envelope, prompt: "secret" }), platformError("WORKER_ENVELOPE_INVALID"));
  assert.doesNotMatch(JSON.stringify(envelope), /content|prompt|stdout|stderr|secret/i);
});

test("archive remains distinct from delete and preserves the official version", async () => {
  const fixture = await readyFixture();
  const archived = await fixture.repository.archiveDocument(ownerA, fixture.document.documentId);
  assert.equal(archived.status, "archived");
  assert.ok(await fixture.repository.getVersion(ownerA, fixture.document.documentId, fixture.version.versionId));
  await assert.rejects(
    fixture.repository.createVersion(ownerA, {
      documentId: fixture.document.documentId,
      versionId: documentVersionId("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
      storageLocator: fixture.locator,
      checksum,
      sizeBytes: 2,
      mediaType: "text/plain",
    }),
    platformError("DOCUMENT_ARCHIVED"),
  );
  const deleted = await fixture.repository.setDocumentStatus(ownerA, {
    documentId: fixture.document.documentId,
    status: "deleted",
  });
  assert.equal(deleted.status, "deleted");
});

test("SSAI-004 selection still builds prompts only from explicitly selected attachments", () => {
  const base = {
    media_type: "text/plain" as const,
    size_bytes: 1,
    extracted_chars: 1,
    created_at: "2026-09-01T00:00:00.000Z",
    expires_at: "2026-09-02T00:00:00.000Z",
  };
  const metadata = [
    { ...base, attachment_id: "11111111-1111-4111-8111-111111111111", name: "A.txt" },
    { ...base, attachment_id: "22222222-2222-4222-8222-222222222222", name: "B.txt" },
  ];
  const selected: StoredAttachment = { ...metadata[0], conversation_id: "conversation", text: "A only" };
  const result = selectChatAttachments({ metadata, attachmentIds: [metadata[0].attachment_id], storedValues: [selected], conversationId: "conversation", permanenceEnabled: false, now: Date.parse("2026-09-01T12:00:00.000Z") });
  const prompt = buildChatPrompt("", "Use A", result.documents);
  assert.match(prompt, /A only/);
  assert.doesNotMatch(prompt, /B\.txt/);
});

class RecordingSqlClient implements SqlClient {
  readonly calls: Array<{ text: string; values: ReadonlyArray<unknown> }> = [];

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values: ReadonlyArray<unknown>): Promise<SqlResult<Row>> {
    this.calls.push({ text, values });
    return {
      rows: [{
        document_id: documentIdA,
        owner_id: ownerA.ownerId,
        project_id: null,
        name: String(values[3] ?? "safe"),
        media_type: "text/plain",
        size_bytes: 2,
        status: "pending",
        current_version: null,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      } as unknown as Row],
      rowCount: 1,
    };
  }
}

test("PostgreSQL layer uses placeholders and never interpolates untrusted values", async () => {
  const client = new RecordingSqlClient();
  const repository = new PostgresDocumentRepository(client);
  const malicious = "name'); drop table serversafe.documents; --";
  await repository.createDocument(ownerA, {
    documentId: documentIdA,
    name: malicious,
    mediaType: "text/plain",
    sizeBytes: 2,
  });
  const call = client.calls[0];
  assert.ok(call);
  assert.doesNotMatch(call.text, /name'\); drop table/i);
  assert.ok(call.values.includes(malicious));
  assert.match(call.text, /\$4::text/);
});

test("0002 migration declares B2 lifecycle, dotted jobs, archive, and upload intents", async () => {
  const migration = await readFile("infra/postgres/migrations/0002_infrastructure_b2.sql", "utf8");
  assert.match(migration, /status in \('pending'[\s\S]*'archived'[\s\S]*'deleted'\)/);
  assert.match(migration, /document\.extract/);
  assert.match(migration, /heartbeat_at/);
  assert.match(migration, /last_error_code/);
  assert.match(migration, /create table if not exists serversafe\.upload_intents/);
  assert.match(migration, /raw binaries remain in object storage/);
});
