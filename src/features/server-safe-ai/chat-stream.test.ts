import assert from "node:assert/strict";
import test from "node:test";
import {
  executeCancellableTurn, isAbortError, linkedAbortController, onceAsync, throwIfAborted,
} from "./chat-stream";
import { createRuntimeContext } from "./observability";

test("cancelamento interrompe o turno sem persistir resposta parcial nem emitir erro comum", async () => {
  const controller = new AbortController();
  let persisted = false;
  let normalError = false;
  let cleanupCount = 0;
  const events: Array<{ phase: string; error_code?: string; aborted?: boolean }> = [];
  const runtime = createRuntimeContext("request-aborted", (entry) => events.push(entry));

  const result = await executeCancellableTurn({
    signal: controller.signal,
    run: async () => {
      controller.abort();
      throwIfAborted(controller.signal);
      return "resposta parcial";
    },
    persist: async () => { persisted = true; },
    onDone: () => assert.fail("turno cancelado não pode concluir"),
    onError: () => { normalError = true; },
    cleanup: onceAsync(async () => { cleanupCount += 1; }),
    runtime,
  });

  assert.equal(result, "aborted");
  assert.equal(persisted, false);
  assert.equal(normalError, false);
  assert.equal(cleanupCount, 1);
  assert.equal(events.at(-1)?.phase, "TURN_FAILED");
  assert.equal(events.at(-1)?.error_code, "REQUEST_ABORTED");
  assert.equal(events.at(-1)?.aborted, true);
});

test("sinal do request é propagado ao controlador interno", () => {
  const source = new AbortController();
  const linked = linkedAbortController(source.signal);
  source.abort();
  assert.equal(linked.controller.signal.aborted, true);
  assert.throws(() => throwIfAborted(linked.controller.signal), isAbortError);
  linked.dispose();
});

test("cleanup idempotente libera recursos uma única vez", async () => {
  let count = 0;
  const cleanup = onceAsync(async () => { count += 1; });
  await Promise.all([cleanup(), cleanup(), cleanup()]);
  assert.equal(count, 1);
});

test("falha de persistência após resposta é classificada sem expor a resposta", async () => {
  const events: Array<{ phase: string; error_code?: string; aborted?: boolean }> = [];
  const runtime = createRuntimeContext("request-persist", (entry) => events.push(entry));
  let receivedError = false;

  const result = await executeCancellableTurn({
    signal: new AbortController().signal,
    run: async () => "resposta que não deve ir para o log",
    persist: async () => { throw new Error("Redis indisponível"); },
    onDone: () => assert.fail("persistência falhou e não pode concluir"),
    onError: () => { receivedError = true; },
    cleanup: async () => undefined,
    runtime,
  });

  assert.equal(result, "failed");
  assert.equal(receivedError, true);
  assert.deepEqual(events.map(({ phase, error_code, aborted }) => ({ phase, error_code, aborted })), [
    { phase: "PERSIST_START", error_code: undefined, aborted: undefined },
    { phase: "TURN_FAILED", error_code: "REDIS_PERSIST_FAILED", aborted: false },
  ]);
  assert.equal(JSON.stringify(events).includes("resposta que não deve ir para o log"), false);
});

test("turno concluído registra início e sucesso da persistência", async () => {
  const events: Array<{ phase: string; error_code?: string }> = [];
  const runtime = createRuntimeContext("request-success", (entry) => events.push(entry));

  const result = await executeCancellableTurn({
    signal: new AbortController().signal,
    run: async () => "resposta",
    persist: async () => undefined,
    onDone: () => undefined,
    onError: () => assert.fail("turno não deveria falhar"),
    cleanup: async () => undefined,
    runtime,
  });

  assert.equal(result, "completed");
  assert.deepEqual(events.map(({ phase, error_code }) => ({ phase, error_code })), [
    { phase: "PERSIST_START", error_code: undefined },
    { phase: "PERSIST_SUCCESS", error_code: undefined },
  ]);
});
