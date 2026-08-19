import test from "node:test";
import assert from "node:assert/strict";

import { canTransition, createStageEvent } from "../core/pipeline.mjs";

test("permite avancar de pesquisa para qualificado", () => {
  assert.equal(canTransition("EM_PESQUISA", "QUALIFICADO"), true);
});

test("nao pula direto de identificado para proposta", () => {
  assert.equal(canTransition("IDENTIFICADO", "PROPOSTA"), false);
});

test("evento de estagio exige autor e motivo", () => {
  assert.throws(
    () => createStageEvent({ from: "IDENTIFICADO", to: "EM_PESQUISA" }),
    /actor e reason/,
  );
});
