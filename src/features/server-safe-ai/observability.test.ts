import assert from "node:assert/strict";
import test from "node:test";
import {
  chatErrorPayload,
  classifyOpenHarnessError,
  classifySandboxCreateError,
  createRuntimeContext,
  logRuntimeEvent,
} from "./observability";

test("classifica falha de Sandbox.create com código seguro", () => {
  assert.equal(classifySandboxCreateError(new Error("provider internals")), "SANDBOX_CREATE_FAILED");
});

test("classifica timeout sem depender de mensagem ou stderr", () => {
  const error = Object.assign(new Error("timeout: private infrastructure detail"), { name: "TimeoutError" });
  assert.equal(classifyOpenHarnessError(error), "OPENHARNESS_TIMEOUT");
});

test("preserva códigos seguros de limites de resposta e stream", () => {
  assert.equal(classifyOpenHarnessError(new Error("RESPONSE_LIMIT")), "RESPONSE_LIMIT");
  assert.equal(classifyOpenHarnessError(new Error("STREAM_LIMIT")), "STREAM_LIMIT");
});

test("evento de erro ao cliente contém somente mensagem genérica e request_id", () => {
  assert.deepEqual(chatErrorPayload("request-123"), {
    message: "A solicitação não pôde ser concluída.",
    request_id: "request-123",
  });
});

test("logs estruturados não incluem prompt, documento, credencial, cookie ou stderr", () => {
  const entries: unknown[] = [];
  const runtime = createRuntimeContext("request-123", (entry) => entries.push(entry));
  const error = new Error("stderr: document-marker credential-marker cookie-marker");
  logRuntimeEvent(runtime, "TURN_FAILED", {
    error_code: classifyOpenHarnessError(error),
    duration_ms: 12,
    aborted: false,
  });

  const serialized = JSON.stringify(entries);
  for (const forbidden of ["document-marker", "credential-marker", "cookie-marker", "stderr"]) {
    assert.equal(serialized.includes(forbidden), false, `dado sensível vazou: ${forbidden}`);
  }
  assert.match(serialized, /serversafe_ai_runtime/);
  assert.match(serialized, /request-123/);
});
