import assert from "node:assert/strict";
import test from "node:test";
import {
  executeCancellableTurn, isAbortError, linkedAbortController, onceAsync, throwIfAborted,
} from "./chat-stream";

test("cancelamento interrompe o turno sem persistir resposta parcial nem emitir erro comum", async () => {
  const controller = new AbortController();
  let persisted = false;
  let normalError = false;
  let cleanupCount = 0;

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
  });

  assert.equal(result, "aborted");
  assert.equal(persisted, false);
  assert.equal(normalError, false);
  assert.equal(cleanupCount, 1);
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
