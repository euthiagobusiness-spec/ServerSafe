import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateSalesData } from "../core/store.mjs";

const salesRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(salesRoot, relativePath), "utf8"));
}

const data = {
  prospects: readJson("data/prospects.json"),
  interactions: readJson("data/interactions.json"),
  suppressions: readJson("data/suppressions.json"),
  activityLog: readJson("data/activity-log.json"),
};

const errors = validateSalesData(data);

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Dados comerciais validos: ${data.prospects.length} prospects, ` +
      `${data.interactions.length} interacoes, ${data.suppressions.length} supressoes e ` +
      `${data.activityLog.length} eventos.`,
  );
}
