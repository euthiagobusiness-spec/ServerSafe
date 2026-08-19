import test from "node:test";
import assert from "node:assert/strict";

import { validateSalesData } from "../core/store.mjs";

function prospect(id, domain, email, overrides = {}) {
  return {
    id,
    domain,
    contacts: email ? [{ email }] : [],
    stage: "IDENTIFICADO",
    score: null,
    statusHistory: [{ from: null, to: "IDENTIFICADO" }],
    nextAction: null,
    optOut: false,
    ...overrides,
  };
}

test("detecta dominios e emails duplicados normalizados", () => {
  const errors = validateSalesData({
    prospects: [
      prospect("p1", "https://www.example.com", "TI@EXAMPLE.COM"),
      prospect("p2", "example.com", "ti@example.com"),
    ],
    interactions: [],
    suppressions: [],
    activityLog: [],
  });
  assert.ok(errors.some((error) => error.includes("Dominio duplicado")));
  assert.ok(errors.some((error) => error.includes("Email duplicado")));
});

test("opt-out bloqueia proxima acao", () => {
  const errors = validateSalesData({
    prospects: [prospect("p1", "example.com", "ti@example.com", { optOut: true, nextAction: "Enviar email" })],
    interactions: [],
    suppressions: [],
    activityLog: [],
  });
  assert.ok(errors.some((error) => error.includes("opt-out")));
});
