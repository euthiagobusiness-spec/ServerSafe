import assert from "node:assert/strict";
import test from "node:test";
import { AI_LIMITS, AI_SLUG_PATTERN } from "./config";
import { buildRecentHistory, canStoreTurn, normalizedTitle, safeActivityLabel } from "./core";

test("slug privado exige formato forte", () => {
  assert.equal(AI_SLUG_PATTERN.test("curto"), false);
  assert.equal(AI_SLUG_PATTERN.test("server_safe_ai_2026"), true);
  assert.equal(AI_SLUG_PATTERN.test("invalido/com/barra"), false);
});

test("historico respeita limite e preserva mensagens recentes", () => {
  const result = buildRecentHistory(Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const, text: `mensagem-${index}` })));
  assert.ok(result.length <= AI_LIMITS.historyChars);
  assert.match(result, /mensagem-19/);
  assert.doesNotMatch(result, /mensagem-0\b/);
});

test("rotulos de atividade nunca exibem entrada arbitraria", () => {
  assert.equal(safeActivityLabel("skill", { name: "review<script>" }), "Executando Skill: reviewscript");
  assert.equal(safeActivityLabel("web_fetch", { url: "https://secret" }), "Pesquisando na Web...");
});

test("titulos sao normalizados e truncados", () => {
  assert.equal(normalizedTitle("  um   titulo  "), "um titulo");
  assert.equal(normalizedTitle(""), "Nova conversa");
  assert.equal(normalizedTitle("x".repeat(100)).length, 80);
});

test("armazenamento reserva espaco para a resposta maxima", () => {
  const now = new Date().toISOString();
  const conversation = { conversation_id: "1", project_id: null, title: "t", created_at: now, updated_at: now, messages: [{ role: "user" as const, text: "x".repeat(AI_LIMITS.conversationChars) }] };
  assert.equal(canStoreTurn(conversation, "oi"), false);
});

test("limites de armazenamento permanecem abaixo do payload maximo do Redis", () => {
  assert.ok(AI_LIMITS.ownerStorageChars <= 900_000);
  assert.ok(AI_LIMITS.maxConversations <= 200);
  assert.ok(AI_LIMITS.maxProjects <= 100);
});
