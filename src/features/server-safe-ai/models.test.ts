import assert from "node:assert/strict";
import test from "node:test";
import {
  createConversationRecord,
  DEFAULT_MODEL_KEY,
  InvalidModelKeyError,
  modelKeyForNewConversation,
  providerModelIdForKey,
  PUBLIC_MODEL_METADATA,
  resolveConversationModelKey,
  setConversationModel,
} from "./models";
import type { Conversation } from "./types";

function conversation(modelKey?: Conversation["model_key"]): Conversation {
  return {
    conversation_id: "conversation-model",
    project_id: null,
    ...(modelKey ? { model_key: modelKey } : {}),
    title: "Modelo",
    created_at: "2026-08-24T00:00:00.000Z",
    updated_at: "2026-08-24T00:00:00.000Z",
    messages: [],
  };
}

test("registry fechado expõe somente metadata segura e define Opus 5 como padrão", () => {
  assert.equal(DEFAULT_MODEL_KEY, "opus-5");
  assert.deepEqual(PUBLIC_MODEL_METADATA, [
    { key: "haiku-4-5", displayName: "Claude Haiku 4.5", default: false },
    { key: "sonnet-5", displayName: "Claude Sonnet 5", default: false },
    { key: "opus-5", displayName: "Claude Opus 5", default: true },
  ]);
  assert.equal(JSON.stringify(PUBLIC_MODEL_METADATA).includes("anthropic."), false);
});

test("criação aceita model_key permitido, usa Opus por padrão e rejeita valor arbitrário", () => {
  assert.equal(modelKeyForNewConversation("sonnet-5"), "sonnet-5");
  assert.equal(modelKeyForNewConversation(undefined), "opus-5");
  assert.equal(createConversationRecord(
    "conversation-sonnet",
    "sonnet-5",
    "2026-08-24T00:00:00.000Z",
  ).model_key, "sonnet-5");
  assert.equal(createConversationRecord(
    "conversation-default",
    undefined,
    "2026-08-24T00:00:00.000Z",
  ).model_key, "opus-5");
  assert.throws(() => modelKeyForNewConversation("anthropic.claude-opus-5"), InvalidModelKeyError);
  assert.throws(() => createConversationRecord("conversation-invalid", "provider-injetado"), InvalidModelKeyError);
});

test("alteração persiste somente model_key permitido e não modifica conversa em erro", () => {
  const value = conversation("haiku-4-5");
  setConversationModel(value, "opus-5", "2026-08-24T01:00:00.000Z");
  assert.equal(value.model_key, "opus-5");
  assert.equal(value.updated_at, "2026-08-24T01:00:00.000Z");
  assert.throws(() => setConversationModel(value, "provider-injetado"), InvalidModelKeyError);
  assert.equal(value.model_key, "opus-5");
});

test("conversa legada sem model_key resolve para Opus e chave persistida inválida falha fechada", () => {
  assert.equal(resolveConversationModelKey(conversation()), "opus-5");
  const corrupted = { ...conversation(), model_key: "modelo-arbitrário" } as unknown as Conversation;
  assert.throws(() => resolveConversationModelKey(corrupted), InvalidModelKeyError);
});

test("mapeamento interno aceita somente chaves da allowlist", () => {
  assert.equal(providerModelIdForKey("haiku-4-5"), "anthropic.claude-haiku-4-5");
  assert.equal(providerModelIdForKey("sonnet-5"), "anthropic.claude-sonnet-5");
  assert.equal(providerModelIdForKey("opus-5"), "anthropic.claude-opus-5");
  assert.throws(() => providerModelIdForKey("anthropic.claude-opus-5"), InvalidModelKeyError);
});
