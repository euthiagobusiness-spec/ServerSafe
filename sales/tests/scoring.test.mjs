import test from "node:test";
import assert from "node:assert/strict";

import { calculateLeadScore, scoringFactors } from "../core/scoring.mjs";

function assessments(kind, rating = 5) {
  return Object.fromEntries(
    scoringFactors.map((factor) => [
      factor.key,
      {
        rating,
        evidence: [
          {
            kind,
            statement: "Evidencia de teste.",
            source: "https://example.com/source",
          },
        ],
      },
    ]),
  );
}

test("fatos com nota maxima produzem score 100", () => {
  const result = calculateLeadScore(assessments("fact"));
  assert.equal(result.score, 100);
  assert.equal(result.classification, "OPORTUNIDADE_EXCEPCIONAL");
});

test("inferencias recebem desconto de confianca", () => {
  const result = calculateLeadScore(assessments("inference"));
  assert.equal(result.score, 65);
  assert.equal(result.classification, "PROSPECTAR");
});

test("hipoteses nao somam pontos", () => {
  const result = calculateLeadScore(assessments("hypothesis"));
  assert.equal(result.score, 0);
});

test("nota positiva sem evidencia e rejeitada", () => {
  assert.throws(
    () => calculateLeadScore({ companySize: { rating: 3, evidence: [] } }),
    /sem evidencia/,
  );
});
