import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("../config/pipeline.json", import.meta.url), "utf8"),
);

export const pipelineStages = Object.freeze(config.stages);
export const terminalStages = Object.freeze(config.terminalStages);

export function isValidStage(stage) {
  return config.stages.includes(stage);
}

export function canTransition(from, to) {
  if (!isValidStage(from) || !isValidStage(to)) return false;
  return config.transitions[from].includes(to);
}

export function createStageEvent({ from, to, actor, reason, at = new Date().toISOString() }) {
  if (from !== null && !canTransition(from, to)) {
    throw new Error(`Transicao invalida: ${from} -> ${to}.`);
  }
  if (from === null && to !== "IDENTIFICADO") {
    throw new Error("Um prospect novo deve iniciar em IDENTIFICADO.");
  }
  if (!actor?.trim() || !reason?.trim()) {
    throw new Error("Mudanca de estagio exige actor e reason.");
  }
  return { from, to, at, actor, reason };
}
