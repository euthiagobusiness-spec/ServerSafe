import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("migration provider-neutral cobre o núcleo persistente e a seleção documental", async () => {
  const sql = await read("infra/postgres/migrations/0001_infrastructure_v1.sql");
  for (const table of [
    "users", "profiles", "projects", "conversations", "messages", "documents",
    "document_versions", "conversation_documents", "message_documents", "jobs",
    "audit_events", "ai_usage", "document_chunks", "embeddings",
  ]) {
    assert.match(sql, new RegExp(`create table serversafe\\.${table}\\s*\\(`));
  }
  assert.match(sql, /create extension vector/);
  assert.match(sql, /message_documents_conversation_owner_document_fkey/);
  assert.match(sql, /document_versions_document_owner_fkey/);
  assert.match(sql, /jobs_document_owner_fkey/);
  assert.match(sql, /document_versions_document_owner_number_key\s+unique\s*\(document_id, owner_id, version_number\)/s);
  assert.match(sql, /documents_current_version_fkey[\s\S]*?foreign key\s*\(document_id, owner_id, current_version\)[\s\S]*?references serversafe\.document_versions\s*\(document_id, owner_id, version_number\)[\s\S]*?deferrable initially deferred/s);
  assert.match(sql, /jobs_document_version_owner_document_fkey[\s\S]*?foreign key\s*\(document_version_id, owner_id, document_id\)[\s\S]*?references serversafe\.document_versions\s*\(version_id, owner_id, document_id\)[\s\S]*?on delete restrict/s);
  assert.match(sql, /conversation_documents_availability_check[\s\S]*?\(available and removed_at is null\)[\s\S]*?or \(not available and removed_at is not null\)/s);
  assert.doesNotMatch(sql, /auth\.users|auth\.uid\(\)|create table public\./i);
  assert.match(sql, /message_documents.*?Somente estas referências podem ser enviadas ao OpenHarness/s);
});

test("Compose é pinado, interno e não contém segredos versionados", async () => {
  const compose = await read("infra/compose/docker-compose.yml");
  const envExample = await read("infra/compose/.env.example");

  assert.match(compose, /pgvector\/pgvector:0\.8\.6-pg16/);
  assert.match(compose, /valkey\/valkey:8\.1\.9-alpine/);
  assert.match(compose, /internal:\s*true/);
  assert.match(compose, /healthcheck:/g);
  assert.match(compose, /docker-entrypoint-initdb\.d:ro/);
  assert.doesNotMatch(compose, /:latest\b/);
  assert.match(envExample, /replace-with-a-local-secret/g);
  assert.equal((envExample.match(/replace-with-a-local-secret/g) ?? []).length, 2);
});

test("contratos futuros não abrem o filesystem nem alteram o OpenHarness atual", async () => {
  const storage = await read("infra/storage/storage.ts");
  const workers = await read("infra/workers/contracts.ts");
  const harness = await read("infra/openharness/contracts.ts");

  for (const method of [
    "createStorageLocator", "put", "get", "delete", "head", "createUploadTarget",
    "createDownloadTarget", "createMultipartUpload", "createUploadPartTarget",
    "completeMultipartUpload", "abortMultipartUpload",
  ]) {
    assert.match(storage, new RegExp(`\\b${method}\\(`));
  }
  assert.match(storage, /StorageLocator/);
  assert.match(storage, /StorageOwnerId/);
  assert.match(storage, /StorageDocumentId/);
  assert.match(storage, /StorageVersionId/);
  assert.match(storage, /Sha256Checksum/);
  assert.match(storage, /WriteCondition/);
  assert.doesNotMatch(storage, /createUploadTarget\(input: \{[\s\S]*key:/);
  assert.match(workers, /queued.*processing.*completed.*failed.*cancelled/s);
  for (const tool of [
    "documents.list", "documents.read", "documents.search", "documents.metadata",
    "spreadsheets.read", "spreadsheets.create", "spreadsheets.update", "jobs.status",
  ]) assert.match(harness, new RegExp(`"${tool.replace(".", "\\.")}"`));
  assert.match(harness, /ownerId/);
  assert.match(harness, /conversationId/);
  assert.doesNotMatch(harness, /read_file|write_file|bash|process\.env/);
});

test("scripts operacionais permanecem separados e protegidos", async () => {
  const names = ["preflight", "bootstrap", "deploy", "health-check", "backup", "restore"];
  for (const name of names) {
    const script = await read(`infra/scripts/${name}.sh`);
    assert.match(script, /^#!\/usr\/bin\/env bash/m);
    assert.match(script, /set -euo pipefail/);
  }
  for (const name of ["bootstrap", "deploy", "backup", "restore"]) {
    const script = await read(`infra/scripts/${name}.sh`);
    assert.match(script, /NOT_IMPLEMENTED/);
    assert.doesNotMatch(script, /exit 0/);
  }
});

test("documentação fixa a fonte de verdade e a política de versões", async () => {
  const readme = await read("infra/README.md");
  const operations = await read("infra/docs/operations.md");
  const costs = await read("infra/docs/costs.md");

  for (const document of [readme, operations]) {
    assert.match(document, /não há[\s\S]*dual-write/i);
    assert.match(document, /fonte oficial/i);
    assert.match(document, /cutover/i);
    assert.match(document, /sem dual-write\s+permanente/i);
  }
  assert.match(costs, /Docker Engine em Ubuntu/);
  assert.match(costs, /Docker Desktop/);
  assert.match(costs, /termos comerciais próprios/i);
  assert.match(operations, /0\.8\.6-pg16/);
  assert.match(operations, /8\.1\.9-alpine/);
  assert.match(operations, /fixadas por digest/);
  assert.match(operations, /não salta\s+para Valkey 9\.x/);
});
