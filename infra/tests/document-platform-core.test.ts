import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  conversationId,
  createTrustedDocumentContext,
  documentId,
  documentVersionId,
  messageId,
  projectId,
} from "../documents/domain";
import { canonicalOwnerId } from "../../src/features/server-safe-ai/security";
import { DocumentPlatformError } from "../documents/errors";
import { InMemoryDocumentRepository } from "../documents/repository";
import { DocumentApplicationService } from "../documents/service";
import { InMemoryJobStore, JobService } from "../jobs/service";
import { LocalStorageAdapter } from "../storage/local";
import {
  createStorageLocator,
  storageChecksum,
  storageDocumentId,
  storageOwnerId,
  storageVersionId,
  type StorageLocator,
  type StorageProvider,
} from "../storage/storage";
import { WORKER_JOB_TYPES } from "../workers/contracts";
import { assertOperationalToolIntent } from "../openharness/contracts";

const canonicalOwnerA = canonicalOwnerId("11111111-1111-4111-8111-111111111111");
const canonicalOwnerB = canonicalOwnerId("22222222-2222-4222-8222-222222222222");
const ownerA = createTrustedDocumentContext(canonicalOwnerA);
const ownerB = createTrustedDocumentContext(canonicalOwnerB);

function platformError(code: string) {
  return (error: unknown) => error instanceof DocumentPlatformError && error.code === code;
}

async function fixture() {
  const repository = new InMemoryDocumentRepository();
  const conversationA = repository.seedConversation(ownerA, conversationId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"));
  const conversationB = repository.seedConversation(ownerA, conversationId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"));
  const foreignConversation = repository.seedConversation(ownerB, conversationId("cccccccc-cccc-4ccc-8ccc-cccccccccccc"));
  const messageA = repository.seedMessage(ownerA, conversationA, messageId("aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa"));
  const messageB = repository.seedMessage(ownerA, conversationB, messageId("bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb"));
  const projectA = repository.seedProject(ownerA, projectId("dddddddd-dddd-4ddd-8ddd-dddddddddddd"));
  const documentA = await repository.createDocument(ownerA, {
    documentId: documentId("aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"),
    projectId: projectA,
    name: "a.txt",
    mediaType: "text/plain",
    sizeBytes: 1,
  });
  const documentB = await repository.createDocument(ownerA, {
    documentId: documentId("bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb"),
    name: "b.txt",
    mediaType: "text/plain",
    sizeBytes: 1,
  });
  const documentC = await repository.createDocument(ownerA, {
    documentId: documentId("cccccccc-1111-4111-8111-cccccccccccc"),
    name: "c.txt",
    mediaType: "text/plain",
    sizeBytes: 1,
  });
  const foreignDocument = await repository.createDocument(ownerB, {
    documentId: documentId("eeeeeeee-1111-4111-8111-eeeeeeeeeeee"),
    name: "foreign.txt",
    mediaType: "text/plain",
    sizeBytes: 1,
  });
  const versionA = documentVersionId("aaaaaaa1-2222-4222-8222-aaaaaaaaaaaa");
  const versionB = documentVersionId("bbbbbbb2-2222-4222-8222-bbbbbbbbbbbb");
  const versionC = documentVersionId("ccccccc3-2222-4222-8222-cccccccccccc");
  const foreignVersion = documentVersionId("eeeeeee4-2222-4222-8222-eeeeeeeeeeee");
  for (const [context, canonicalOwner, document, versionIdValue] of [
    [ownerA, canonicalOwnerA, documentA, versionA],
    [ownerA, canonicalOwnerA, documentB, versionB],
    [ownerA, canonicalOwnerA, documentC, versionC],
    [ownerB, canonicalOwnerB, foreignDocument, foreignVersion],
  ] as const) {
    const locator = createStorageLocator({
      ownerId: storageOwnerId(canonicalOwner),
      documentId: storageDocumentId(document.documentId),
      versionId: storageVersionId(versionIdValue),
    });
    await repository.createVersion(context, {
      documentId: document.documentId,
      versionId: versionIdValue,
      storageLocator: locator,
      checksum: "a".repeat(64),
      sizeBytes: 1,
      mediaType: "text/plain",
    });
    await repository.setCurrentVersion(context, { documentId: document.documentId, versionId: versionIdValue });
    await repository.setDocumentStatus(context, { documentId: document.documentId, status: "ready" });
  }
  await repository.attachToConversation(ownerA, { conversationId: conversationA, documentId: documentA.documentId });
  await repository.attachToConversation(ownerA, { conversationId: conversationA, documentId: documentB.documentId });
  await repository.attachToConversation(ownerA, { conversationId: conversationA, documentId: documentC.documentId });
  await repository.attachToConversation(ownerA, { conversationId: conversationB, documentId: documentB.documentId });
  await repository.attachToConversation(ownerB, { conversationId: foreignConversation, documentId: foreignDocument.documentId });
  return { repository, conversationA, conversationB, foreignConversation, messageA, messageB, projectA, documentA, documentB, documentC, foreignDocument, versionA, versionB, versionC, foreignVersion };
}

test("owner and conversation boundaries are enforced by the document repository", async () => {
  const data = await fixture();

  assert.equal(await data.repository.getDocument(ownerB, data.documentA.documentId), null);
  assert.deepEqual((await data.repository.listDocuments(ownerB)).map((document) => document.documentId), [data.foreignDocument.documentId]);
  await assert.rejects(
    data.repository.listConversationDocuments(ownerA, data.foreignConversation),
    platformError("CONVERSATION_NOT_ACCESSIBLE"),
  );
  await data.repository.detachFromConversation(ownerA, {
    conversationId: data.conversationA,
    documentId: data.documentB.documentId,
  });
  await assert.rejects(
    data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: data.messageA,
      documentIds: [data.documentB.documentId],
    }),
    platformError("DOCUMENT_UNAVAILABLE"),
  );
  await assert.rejects(
    data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: data.messageB,
      documentIds: [data.documentA.documentId],
    }),
    platformError("MESSAGE_NOT_ACCESSIBLE"),
  );
});

test("conversation availability is separate from explicit message selection", async () => {
  const data = await fixture();
  const available = await data.repository.listConversationDocuments(ownerA, data.conversationA);
  assert.deepEqual(available.map((entry) => entry.documentId), [data.documentA.documentId, data.documentB.documentId, data.documentC.documentId]);
  assert.deepEqual(
    await data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: data.messageA,
      documentIds: [],
    }),
    [],
  );
  const selected = await data.repository.selectDocumentsForMessage(ownerA, {
    conversationId: data.conversationA,
    messageId: messageId("aaaaaaaa-0001-4000-8000-aaaaaaaaaaaa"),
    documentIds: [data.documentA.documentId, data.documentB.documentId],
  }).catch(async (error: unknown) => {
    assert.equal((error as DocumentPlatformError).code, "MESSAGE_NOT_ACCESSIBLE");
    const message = data.repository.seedMessage(ownerA, data.conversationA, messageId("aaaaaaaa-0001-4000-8000-aaaaaaaaaaaa"));
    return data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: message,
      documentIds: [data.documentA.documentId, data.documentB.documentId],
    });
  });
  assert.deepEqual(selected.map((entry) => entry.documentId), [data.documentA.documentId, data.documentB.documentId]);
  assert.ok(!selected.some((entry) => entry.documentId === data.documentC.documentId));
});

test("expired, detached, archived and foreign documents cannot be selected", async () => {
  const data = await fixture();
  const expiredMessage = data.repository.seedMessage(ownerA, data.conversationA, messageId("aaaaaaaa-0002-4000-8000-aaaaaaaaaaaa"));
  await data.repository.setDocumentStatus(ownerA, { documentId: data.documentC.documentId, status: "expired" });
  await assert.rejects(
    data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: expiredMessage,
      documentIds: [data.documentC.documentId],
    }),
    platformError("DOCUMENT_UNAVAILABLE"),
  );
  await data.repository.detachFromConversation(ownerA, { conversationId: data.conversationA, documentId: data.documentB.documentId });
  const detachedMessage = data.repository.seedMessage(ownerA, data.conversationA, messageId("aaaaaaaa-0003-4000-8000-aaaaaaaaaaaa"));
  await assert.rejects(
    data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: detachedMessage,
      documentIds: [data.documentB.documentId],
    }),
    platformError("DOCUMENT_UNAVAILABLE"),
  );
  const archived = await data.repository.archiveDocument(ownerA, data.documentA.documentId);
  assert.equal(archived.status, "archived");
  assert.ok(await data.repository.getDocument(ownerA, data.documentA.documentId));
  const archivedMessage = data.repository.seedMessage(ownerA, data.conversationA, messageId("aaaaaaaa-0004-4000-8000-aaaaaaaaaaaa"));
  await assert.rejects(
    data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: archivedMessage,
      documentIds: [data.documentA.documentId],
    }),
    platformError("DOCUMENT_UNAVAILABLE"),
  );
});

test("local storage streams bytes, prevents overwrite, and rejects traversal", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "serversafe-b1-storage-"));
  try {
    const storage = new LocalStorageAdapter({ rootDirectory: root, environment: "test" });
    const document = documentId("99999999-9999-4999-8999-999999999999");
    const version = documentVersionId("88888888-8888-4888-8888-888888888888");
    const locator = createStorageLocator({
      ownerId: storageOwnerId(canonicalOwnerA),
      documentId: storageDocumentId(document),
      versionId: storageVersionId(version),
    });
    const content = Buffer.from("streamed document");
    const checksum = createHash("sha256").update(content).digest("hex");
    async function* chunks() {
      yield content.subarray(0, 8);
      yield content.subarray(8);
    }
    const metadata = await storage.put({
      locator,
      contentType: "text/plain",
      sizeBytes: content.byteLength,
      checksum: storageChecksum(checksum),
      body: chunks(),
      condition: { type: "if-absent" },
    });
    assert.equal(metadata.etag, checksum);
    await assert.rejects(
      storage.put({
        locator,
        contentType: "text/plain",
        sizeBytes: content.byteLength,
        checksum: storageChecksum(checksum),
        body: content,
        condition: { type: "if-absent" },
      }),
      platformError("STORAGE_OBJECT_EXISTS"),
    );
    const object = await storage.get(locator);
    assert.ok(object);
    const received: Uint8Array[] = [];
    for await (const chunk of object.body) received.push(chunk);
    assert.deepEqual(Buffer.concat(received.map((chunk) => Buffer.from(chunk))), content);
    const forged = { ...locator, key: "owners/../../outside" } as unknown as StorageLocator;
    await assert.rejects(storage.head(forged), platformError("STORAGE_METADATA_INVALID"));
    await assert.rejects(
      Promise.resolve().then(() => storageDocumentId("../outside")),
      /STORAGE_DOCUMENT_ID_INVALID/,
    );
    const files = await readdir(root, { recursive: true });
    assert.ok(files.every((entry) => !String(entry).includes("outside")));
    await assert.rejects(storage.createUploadTarget(), platformError("STORAGE_CAPABILITY_UNSUPPORTED"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("upload completion creates a version and metadata-only queued job", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "serversafe-b1-upload-"));
  try {
    const repository = new InMemoryDocumentRepository();
    const jobs = new InMemoryJobStore();
    const storage = new LocalStorageAdapter({ rootDirectory: root, environment: "test" });
    const service = new DocumentApplicationService(repository, storage, new JobService(repository, jobs));
    const content = Buffer.from("hello B1");
    const checksum = createHash("sha256").update(content).digest("hex");
    const initialized = await service.initializeUpload(ownerA, {
      name: "hello.txt",
      contentType: "text/plain",
      sizeBytes: content.byteLength,
      checksum,
    });
    assert.equal(initialized.mode, "direct");
    assert.equal(initialized.target, null);
    await storage.put({
      locator: initialized.locator,
      contentType: "text/plain",
      sizeBytes: content.byteLength,
      checksum: storageChecksum(checksum),
      body: content,
      condition: { type: "if-absent" },
    });
    const result = await service.completeUpload(ownerA, {
      documentId: initialized.document.documentId,
      versionId: initialized.versionId,
      contentType: "text/plain",
      sizeBytes: content.byteLength,
      checksum,
      idempotencyKey: "upload-hello-v1",
    });
    assert.equal(result.document.status, "ready");
    assert.equal(result.document.currentVersion, 1);
    assert.equal(result.job.status, "queued");
    assert.equal(jobs.count(), 1);
    assert.deepEqual(Object.keys(result.job.payload).sort(), ["documentId", "operation", "ownerId", "versionId"]);
    const serialized = JSON.stringify(result.job.payload);
    for (const forbidden of ["content", "text", "documentText", "binary", "prompt"]) assert.doesNotMatch(serialized, new RegExp(forbidden, "i"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("job idempotency is owner-scoped and versions cannot cross documents", async () => {
  const data = await fixture();
  const versionA = data.versionA;
  const versionB = data.versionB;
  const locatorA = createStorageLocator({
    ownerId: storageOwnerId(canonicalOwnerA),
    documentId: storageDocumentId(data.documentA.documentId),
    versionId: storageVersionId(versionA),
  });
  const jobs = new InMemoryJobStore();
  const service = new JobService(data.repository, jobs);
  const first = await service.create(ownerA, {
    documentId: data.documentA.documentId,
    versionId: versionA,
    type: "document.extract",
    idempotencyKey: "same-key",
  });
  const duplicate = await service.create(ownerA, {
    documentId: data.documentA.documentId,
    versionId: versionA,
    type: "document.extract",
    idempotencyKey: "same-key",
  });
  assert.equal(duplicate.jobId, first.jobId);
  assert.equal(jobs.count(), 1);
  await assert.rejects(
    service.create(ownerA, {
      documentId: data.documentA.documentId,
      versionId: versionA,
      type: "document.chunk",
      idempotencyKey: "same-key",
    }),
    platformError("JOB_IDEMPOTENCY_CONFLICT"),
  );
  await assert.rejects(
    data.repository.createVersion(ownerA, {
      documentId: data.documentB.documentId,
      versionId: versionB,
      storageLocator: locatorA,
      checksum: "b".repeat(64),
      sizeBytes: 1,
      mediaType: "text/plain",
    }),
    platformError("DOCUMENT_VERSION_MISMATCH"),
  );
  assert.deepEqual(WORKER_JOB_TYPES, ["document.extract", "document.classify", "document.chunk", "spreadsheet.process"]);
});

test("every document and job operation requires the trusted owner context", async () => {
  const data = await fixture();
  const plainContext = { ownerId: canonicalOwnerA, issuedBy: "authenticated-server" } as never;
  await assert.rejects(
    data.repository.getDocument(plainContext, data.documentA.documentId),
    platformError("TRUSTED_CONTEXT_INVALID"),
  );
  await assert.rejects(
    data.repository.attachToConversation(ownerA, {
      conversationId: data.conversationA,
      documentId: data.foreignDocument.documentId,
    }),
    platformError("DOCUMENT_NOT_ACCESSIBLE"),
  );
  await assert.rejects(
    data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: data.messageA,
      documentIds: [data.foreignDocument.documentId],
    }),
    platformError("DOCUMENT_UNAVAILABLE"),
  );
  const foreignLocator = createStorageLocator({
    ownerId: storageOwnerId(canonicalOwnerB),
    documentId: storageDocumentId(data.foreignDocument.documentId),
    versionId: storageVersionId(data.foreignVersion),
  });
  await assert.rejects(
    data.repository.createVersion(ownerA, {
      documentId: data.foreignDocument.documentId,
      versionId: data.foreignVersion,
      storageLocator: foreignLocator,
      checksum: "a".repeat(64),
      sizeBytes: 1,
      mediaType: "text/plain",
    }),
    platformError("DOCUMENT_NOT_ACCESSIBLE"),
  );
  await assert.rejects(
    data.repository.setCurrentVersion(ownerA, {
      documentId: data.foreignDocument.documentId,
      versionId: data.foreignVersion,
    }),
    platformError("DOCUMENT_NOT_ACCESSIBLE"),
  );
  await assert.rejects(
    data.repository.setDocumentStatus(ownerA, { documentId: data.foreignDocument.documentId, status: "failed" }),
    platformError("DOCUMENT_NOT_ACCESSIBLE"),
  );
  const jobs = new InMemoryJobStore();
  await assert.rejects(
    new JobService(data.repository, jobs).create(ownerA, {
      documentId: data.foreignDocument.documentId,
      versionId: data.foreignVersion,
      type: "document.extract",
      idempotencyKey: "cross-user",
    }),
    platformError("DOCUMENT_NOT_ACCESSIBLE"),
  );
});

test("repository and service reject forged locators and invalid version metadata", async () => {
  const data = await fixture();
  const versionIdValue = documentVersionId("ffffffff-2222-4222-8222-ffffffffffff");
  const locator = createStorageLocator({
    ownerId: storageOwnerId(canonicalOwnerA),
    documentId: storageDocumentId(data.documentA.documentId),
    versionId: storageVersionId(versionIdValue),
  });
  const forgedLocator = { ...locator, key: `${locator.key}/tampered` } as StorageLocator;
  await assert.rejects(
    data.repository.createVersion(ownerA, {
      documentId: data.documentA.documentId,
      versionId: versionIdValue,
      storageLocator: forgedLocator,
      checksum: "a".repeat(64),
      sizeBytes: 1,
      mediaType: "text/plain",
    }),
    platformError("DOCUMENT_VERSION_MISMATCH"),
  );
  const service = new DocumentApplicationService(
    data.repository,
    {} as StorageProvider,
    new JobService(data.repository, new InMemoryJobStore()),
  );
  await assert.rejects(
    service.createVersion(ownerA, {
      documentId: data.documentA.documentId,
      versionId: versionIdValue,
      storageLocator: forgedLocator,
      checksum: "a".repeat(64),
      sizeBytes: 1,
      mediaType: "text/plain",
    }),
    platformError("DOCUMENT_VERSION_MISMATCH"),
  );
  await assert.rejects(
    data.repository.createVersion(ownerA, {
      documentId: data.documentA.documentId,
      versionId: documentVersionId("ffffffff-3333-4333-8333-ffffffffffff"),
      storageLocator: createStorageLocator({
        ownerId: storageOwnerId(canonicalOwnerA),
        documentId: storageDocumentId(data.documentA.documentId),
        versionId: storageVersionId(documentVersionId("ffffffff-3333-4333-8333-ffffffffffff")),
      }),
      checksum: "not-sha256",
      sizeBytes: 1,
      mediaType: "text/plain",
    }),
    platformError("DOCUMENT_VERSION_INVALID"),
  );
});

test("only ready documents may be selected and status transitions stay explicit", async () => {
  const data = await fixture();
  const pending = await data.repository.createDocument(ownerA, {
    documentId: documentId("99999999-1111-4111-8111-999999999999"),
    name: "pending.txt",
    mediaType: "text/plain",
    sizeBytes: 1,
  });
  await data.repository.attachToConversation(ownerA, { conversationId: data.conversationA, documentId: pending.documentId });
  const pendingMessage = data.repository.seedMessage(ownerA, data.conversationA, messageId("99999999-0001-4000-8000-999999999999"));
  await assert.rejects(
    data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: pendingMessage,
      documentIds: [pending.documentId],
    }),
    platformError("DOCUMENT_UNAVAILABLE"),
  );
  await assert.rejects(
    data.repository.setDocumentStatus(ownerA, { documentId: pending.documentId, status: "ready" }),
    platformError("DOCUMENT_VERSION_MISMATCH"),
  );
  await data.repository.setDocumentStatus(ownerA, { documentId: pending.documentId, status: "processing" });
  await data.repository.setDocumentStatus(ownerA, { documentId: pending.documentId, status: "failed" });
  await assert.rejects(
    data.repository.selectDocumentsForMessage(ownerA, {
      conversationId: data.conversationA,
      messageId: pendingMessage,
      documentIds: [pending.documentId],
    }),
    platformError("DOCUMENT_UNAVAILABLE"),
  );
});

test("OpenHarness rejects owner and identity arguments at every nesting level", () => {
  assert.throws(
    () => assertOperationalToolIntent({ name: "documents.read", arguments: { ownerId: "attacker" } }),
    /OPENHARNESS_RESERVED_ARGUMENT/,
  );
  assert.throws(
    () => assertOperationalToolIntent({
      name: "documents.read",
      arguments: { filters: [{ nested: { user_id: "attacker" } }] },
    }),
    /OPENHARNESS_RESERVED_ARGUMENT/,
  );
  assert.throws(
    () => assertOperationalToolIntent({ name: "documents.read", arguments: { principal: { requestId: "x" } } }),
    /OPENHARNESS_RESERVED_ARGUMENT/,
  );
  assert.deepEqual(
    assertOperationalToolIntent({ name: "documents.read", arguments: { query: "contract", limit: 5 } }).arguments,
    { query: "contract", limit: 5 },
  );
});

test("local storage rejects a symlinked object directory when the platform permits symlinks", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "serversafe-b1-symlink-root-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "serversafe-b1-symlink-outside-"));
  try {
    const document = documentId("77777777-7777-4777-8777-777777777777");
    const version = documentVersionId("66666666-6666-4666-8666-666666666666");
    const versionDirectory = path.join(root, "objects", canonicalOwnerA, document, version);
    await mkdir(path.dirname(versionDirectory), { recursive: true });
    try {
      await symlink(outside, versionDirectory, process.platform === "win32" ? "junction" : "dir");
    } catch {
      t.skip("symlink creation is unavailable in this environment");
      return;
    }
    assert.ok((await lstat(versionDirectory)).isSymbolicLink());
    const locator = createStorageLocator({
      ownerId: storageOwnerId(canonicalOwnerA),
      documentId: storageDocumentId(document),
      versionId: storageVersionId(version),
    });
    await assert.rejects(
      new LocalStorageAdapter({ rootDirectory: root, environment: "test" }).head(locator),
      platformError("STORAGE_METADATA_INVALID"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("invalid domain identifiers fail closed", () => {
  assert.throws(() => documentId("not-a-uuid"), /DOCUMENT_ID_INVALID/);
  assert.throws(() => documentVersionId("../escape"), /DOCUMENT_VERSION_ID_INVALID/);
  assert.throws(
    () => createTrustedDocumentContext({ ownerId: canonicalOwnerA, issuedBy: "authenticated-server" } as never),
    /TRUSTED_CONTEXT_INVALID/,
  );
});
