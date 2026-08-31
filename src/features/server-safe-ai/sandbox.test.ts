import assert from "node:assert/strict";
import test from "node:test";
import { SERVERSAFE_AI_SYSTEM_PROMPT } from "./instructions";
import {
  buildOpenHarnessCommandArgs,
  OPENHARNESS_ALLOWED_TOOLS,
  OPENHARNESS_DENIED_TOOLS,
} from "./sandbox";
import {
  classifyOpenHarnessError,
  classifyOpenHarnessExit,
  classifySandboxCreateError,
} from "./observability";
import type { ModelKey } from "./types";

function optionValue(args: string[], option: string) {
  const index = args.indexOf(option);
  assert.notEqual(index, -1, `Opção ausente: ${option}`);
  return args[index + 1];
}

test("aplica a instrução autoritativa separadamente em toda execução do OpenHarness", () => {
  const userPrompt = "Explique a Revolução Francesa sem anexos.";
  const args = buildOpenHarnessCommandArgs(userPrompt, "test-api-key", "opus-5");
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
    const args = buildOpenHarnessCommandArgs(prompt, "test-api-key", "opus-5");
    assert.equal(optionValue(args, "-p"), prompt);
    assert.equal(optionValue(args, "--system-prompt"), SERVERSAFE_AI_SYSTEM_PROMPT);
  }
});

test("mantém plan mode e ferramentas perigosas explicitamente negadas", () => {
  const args = buildOpenHarnessCommandArgs("Ajude com uma tarefa cotidiana.", "test-api-key", "opus-5");
  assert.equal(optionValue(args, "--permission-mode"), "plan");
  assert.equal(args.includes("--dangerously-skip-permissions"), false);
  assert.equal(optionValue(args, "--allowed-tools"), OPENHARNESS_ALLOWED_TOOLS.join(","));
  assert.equal(optionValue(args, "--disallowed-tools"), OPENHARNESS_DENIED_TOOLS.join(","));
  for (const tool of ["bash", "read_file", "write_file", "edit_file", "agent", "send_message", "team_create"]) {
    assert.ok(OPENHARNESS_DENIED_TOOLS.includes(tool), `Ferramenta perigosa não negada: ${tool}`);
  }
});

test("resolve model_key no servidor e altera realmente o argumento --model", () => {
  const mappings: Array<[ModelKey, string]> = [
    ["haiku-4-5", "anthropic.claude-haiku-4-5"],
    ["sonnet-5", "anthropic.claude-sonnet-5"],
    ["opus-5", "anthropic.claude-opus-5"],
  ];
  for (const [modelKey, providerModelId] of mappings) {
    const args = buildOpenHarnessCommandArgs("Teste.", "test-api-key", modelKey);
    assert.equal(optionValue(args, "--model"), providerModelId);
  }
  assert.throws(() => buildOpenHarnessCommandArgs(
    "Teste.",
    "test-api-key",
    "anthropic.claude-opus-5" as ModelKey,
  ));
});

test("falha de Sandbox.create recebe código seguro sem expor detalhes", () => {
  assert.equal(classifySandboxCreateError(new Error("sandbox provider detail")), "SANDBOX_CREATE_FAILED");
});

test("exit code diferente de zero recebe código específico do OpenHarness", () => {
  assert.equal(classifyOpenHarnessExit(1), "OPENHARNESS_EXIT_NONZERO");
  assert.equal(classifyOpenHarnessExit(0), null);
});

test("timeout do runCommand recebe código específico", () => {
  const error = Object.assign(new Error("private timeout detail"), { code: "COMMAND_TIMEOUT" });
  assert.equal(classifyOpenHarnessError(error), "OPENHARNESS_TIMEOUT");
});
