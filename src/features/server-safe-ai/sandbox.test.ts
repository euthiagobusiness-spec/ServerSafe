import assert from "node:assert/strict";
import test from "node:test";
import { SERVERSAFE_AI_SYSTEM_PROMPT } from "./instructions";
import {
  buildOpenHarnessCommandArgs,
  OPENHARNESS_ALLOWED_TOOLS,
  OPENHARNESS_DENIED_TOOLS,
} from "./sandbox";

function optionValue(args: string[], option: string) {
  const index = args.indexOf(option);
  assert.notEqual(index, -1, `Opção ausente: ${option}`);
  return args[index + 1];
}

test("aplica a instrução autoritativa separadamente em toda execução do OpenHarness", () => {
  const userPrompt = "Explique a Revolução Francesa sem anexos.";
  const args = buildOpenHarnessCommandArgs(userPrompt, "test-api-key");
  assert.equal(optionValue(args, "--system-prompt"), SERVERSAFE_AI_SYSTEM_PROMPT);
  assert.equal(optionValue(args, "-p"), userPrompt);
  assert.notEqual(optionValue(args, "--system-prompt"), optionValue(args, "-p"));
});

test("preserva pedidos jurídicos, técnicos, históricos, empresariais, cotidianos e gerais", () => {
  const prompts = [
    "Analise os riscos desta cláusula contratual.",
    "Explique como funciona uma função assíncrona em TypeScript.",
    "Quais foram as causas da Revolução Francesa?",
    "Ajude a estruturar um plano de negócios para uma pequena empresa.",
    "Monte uma lista de compras para sete refeições simples.",
    "Explique por que o céu muda de cor ao entardecer.",
  ];
  for (const prompt of prompts) {
    const args = buildOpenHarnessCommandArgs(prompt, "test-api-key");
    assert.equal(optionValue(args, "-p"), prompt);
    assert.equal(optionValue(args, "--system-prompt"), SERVERSAFE_AI_SYSTEM_PROMPT);
  }
});

test("mantém plan mode e ferramentas perigosas explicitamente negadas", () => {
  const args = buildOpenHarnessCommandArgs("Ajude com uma tarefa cotidiana.", "test-api-key");
  assert.equal(optionValue(args, "--permission-mode"), "plan");
  assert.equal(args.includes("--dangerously-skip-permissions"), false);
  assert.equal(optionValue(args, "--allowed-tools"), OPENHARNESS_ALLOWED_TOOLS.join(","));
  assert.equal(optionValue(args, "--disallowed-tools"), OPENHARNESS_DENIED_TOOLS.join(","));
  for (const tool of ["bash", "read_file", "write_file", "edit_file", "agent", "send_message", "team_create"]) {
    assert.ok(OPENHARNESS_DENIED_TOOLS.includes(tool), `Ferramenta perigosa não negada: ${tool}`);
  }
});
