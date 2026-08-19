import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("../config/scoring.json", import.meta.url), "utf8"),
);

const evidenceKinds = new Set(Object.keys(config.evidenceMultipliers));

if (config.factors.reduce((sum, factor) => sum + factor.weight, 0) !== 100) {
  throw new Error("Os pesos do scoring devem somar 100.");
}

export const scoringFactors = Object.freeze(config.factors);

export function classifyScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("Score deve estar entre 0 e 100.");
  }

  if (score <= 39) return "BAIXA_PRIORIDADE";
  if (score <= 59) return "INVESTIGAR";
  if (score <= 74) return "PROSPECTAR";
  if (score <= 89) return "ALTA_PRIORIDADE";
  return "OPORTUNIDADE_EXCEPCIONAL";
}

export function calculateLeadScore(assessments) {
  const breakdown = [];
  let rawTotal = 0;

  for (const factor of config.factors) {
    const assessment = assessments[factor.key] ?? { rating: 0, evidence: [] };
    const rating = assessment.rating ?? 0;
    const evidence = assessment.evidence ?? [];

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      throw new RangeError(`${factor.key}.rating deve ser inteiro entre 0 e 5.`);
    }

    for (const item of evidence) {
      if (!evidenceKinds.has(item.kind)) {
        throw new Error(`${factor.key} contem tipo de evidencia invalido.`);
      }
      if (!item.statement || !item.source) {
        throw new Error(`${factor.key} exige statement e source em cada evidencia.`);
      }
    }

    if (rating > 0 && evidence.length === 0) {
      throw new Error(`${factor.key} tem nota positiva sem evidencia.`);
    }

    const confidence = evidence.reduce(
      (highest, item) => Math.max(highest, config.evidenceMultipliers[item.kind]),
      0,
    );
    const contribution = factor.weight * (rating / 5) * confidence;
    rawTotal += contribution;

    breakdown.push({
      key: factor.key,
      label: factor.label,
      weight: factor.weight,
      rating,
      confidence,
      contribution: Number(contribution.toFixed(2)),
      evidence,
      rationale: assessment.rationale ?? "",
    });
  }

  const score = Math.round(rawTotal);
  return { score, classification: classifyScore(score), breakdown };
}
