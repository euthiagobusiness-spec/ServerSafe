import { Writable } from "node:stream";
import { Sandbox } from "@vercel/sandbox";
import { AI_BASE_URL, AI_LIMITS } from "./config";
import { safeActivityLabel } from "./core";
import { SERVERSAFE_AI_SYSTEM_PROMPT } from "./instructions";
import { throwIfAborted } from "./chat-stream";
import { providerModelIdForKey } from "./models";
import type { ModelKey } from "./types";
import {
  classifyOpenHarnessError, classifyOpenHarnessExit, classifySandboxCreateError,
  isRequestAbortError, logRuntimeEvent, RuntimeFailure,
} from "./observability";
import type { RuntimeContext } from "./observability";

export const OPENHARNESS_ALLOWED_TOOLS = ["skill", "tool_search", "web_fetch", "web_search", "brief"];
export const OPENHARNESS_DENIED_TOOLS = [
  "bash", "ask_user_question", "read_file", "write_file", "edit_file", "notebook_edit", "lsp",
  "mcp_auth", "glob", "grep", "image_to_text", "config", "sleep", "enter_worktree", "exit_worktree",
  "todo_write", "enter_plan_mode", "exit_plan_mode", "cron_create", "cron_list", "cron_delete",
  "cron_toggle", "remote_trigger", "task_create", "task_get", "task_list", "task_stop", "task_output",
  "task_update", "agent", "send_message", "team_create", "team_delete",
];

export type HarnessEvent =
  | { type: "activity"; label: string }
  | { type: "delta"; text: string };

export function buildOpenHarnessCommandArgs(prompt: string, apiKey: string, modelKey: ModelKey) {
  const providerModelId = providerModelIdForKey(modelKey);
  return [
    "-i",
    "HOME=/vercel/sandbox/home",
    "PATH=/opt/openharness/bin:/usr/local/bin:/usr/bin:/bin",
    "LANG=C.UTF-8",
    "OPENHARNESS_SANDBOX_ENABLED=1",
    "OPENHARNESS_SANDBOX_FAIL_IF_UNAVAILABLE=1",
    "OPENHARNESS_SANDBOX_BACKEND=srt",
    "/opt/openharness/bin/openharness",
    "-p", prompt,
    "--system-prompt", SERVERSAFE_AI_SYSTEM_PROMPT,
    "--model", providerModelId,
    "--base-url", AI_BASE_URL,
    "--api-key", apiKey,
    "--max-turns", String(AI_LIMITS.maxTurns),
    "--output-format", "stream-json",
    "--permission-mode", "plan",
    "--allowed-tools", OPENHARNESS_ALLOWED_TOOLS.join(","),
    "--disallowed-tools", OPENHARNESS_DENIED_TOOLS.join(","),
  ];
}

export async function runOpenHarness(
  prompt: string,
  modelKey: ModelKey,
  onEvent: (event: HarnessEvent) => void,
  signal?: AbortSignal,
  runtime?: RuntimeContext,
) {
  const snapshotId = process.env.SERVERSAFE_AI_SANDBOX_SNAPSHOT_ID;
  const apiKey = process.env.SERVERSAFE_BEDROCK_API_KEY;
  if (!snapshotId || !apiKey) throw new Error("AI_RUNTIME_NOT_CONFIGURED");
  throwIfAborted(signal);

  const sandboxStartedAt = Date.now();
  let sandbox;
  try {
    sandbox = await Sandbox.create({
      source: { type: "snapshot", snapshotId },
      timeout: 60_000,
      persistent: false,
    });
  } catch (error) {
    if (signal?.aborted || isRequestAbortError(error)) throw error;
    const errorCode = classifySandboxCreateError(error);
    if (runtime) logRuntimeEvent(runtime, "SANDBOX_CREATE", {
      error_code: errorCode,
      duration_ms: Date.now() - sandboxStartedAt,
      aborted: false,
    });
    throw new RuntimeFailure(errorCode);
  }
  if (runtime) {
    logRuntimeEvent(runtime, "SANDBOX_CREATE", { duration_ms: Date.now() - sandboxStartedAt });
    logRuntimeEvent(runtime, "SANDBOX_CREATED", {});
  }

  let buffer = "";
  let answer = "";
  let streamChars = 0;
  let outputFailure: RuntimeFailure | null = null;
  const processLine = (line: string) => {
    throwIfAborted(signal);
    if (!line.trim()) return;
    let event: Record<string, unknown>;
    try { event = JSON.parse(line) as Record<string, unknown>; } catch { return; }
    if (event.type === "assistant_delta") {
      const text = String(event.text ?? "");
      if (answer.length + text.length > AI_LIMITS.responseChars) throw new Error("RESPONSE_LIMIT");
      answer += text;
      onEvent({ type: "delta", text });
    } else if (event.type === "assistant_complete" && !answer) {
      const text = String(event.text ?? "");
      if (text.length > AI_LIMITS.responseChars) throw new Error("RESPONSE_LIMIT");
      answer = text;
      onEvent({ type: "delta", text });
    } else if (event.type === "tool_started") {
      onEvent({ type: "activity", label: safeActivityLabel(event.tool_name, event.tool_input) });
    } else if (event.type === "tool_completed") {
      onEvent({ type: "activity", label: "Processando resultado..." });
    } else if (event.type === "compact_progress") {
      onEvent({ type: "activity", label: "Organizando contexto..." });
    }
  };

  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      try {
        const value = chunk.toString("utf8");
        streamChars += value.length;
        if (streamChars > AI_LIMITS.streamBufferChars) throw new Error("STREAM_LIMIT");
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(processLine);
        callback();
      } catch (error) {
        const errorCode = classifyOpenHarnessError(error);
        outputFailure ??= new RuntimeFailure(errorCode, { timeout: errorCode === "OPENHARNESS_TIMEOUT" });
        callback(outputFailure);
      }
    },
  });
  stdout.on("error", () => undefined);
  const stderr = new Writable({ write(_chunk, _encoding, callback) { callback(); } });

  try {
    throwIfAborted(signal);
    onEvent({ type: "activity", label: "Iniciando ambiente isolado..." });
    if (runtime) logRuntimeEvent(runtime, "OPENHARNESS_START", {});
    const harnessStartedAt = Date.now();
    try {
      const result = await sandbox.runCommand({
        cmd: "/usr/bin/env",
        args: buildOpenHarnessCommandArgs(prompt, apiKey, modelKey),
        cwd: "/vercel/sandbox/workspace",
        stdout,
        stderr,
        signal,
        timeoutMs: AI_LIMITS.sandboxTimeoutMs,
      });
      throwIfAborted(signal);
      if (outputFailure) throw outputFailure;
      if (buffer.trim()) processLine(buffer);
      const errorCode = classifyOpenHarnessExit(result.exitCode);
      if (errorCode) throw new RuntimeFailure(errorCode, { exitCode: result.exitCode });
      if (runtime) logRuntimeEvent(runtime, "OPENHARNESS_EXIT", {
        duration_ms: Date.now() - harnessStartedAt,
        exit_code: result.exitCode,
      });
      return answer.trim();
    } catch (error) {
      if (signal?.aborted || isRequestAbortError(error)) throw error;
      const errorCode = classifyOpenHarnessError(error);
      if (runtime) logRuntimeEvent(runtime, "OPENHARNESS_EXIT", {
        error_code: errorCode,
        duration_ms: Date.now() - harnessStartedAt,
        exit_code: error instanceof RuntimeFailure ? error.exitCode : undefined,
        timeout: errorCode === "OPENHARNESS_TIMEOUT",
        aborted: false,
      });
      if (error instanceof RuntimeFailure) throw error;
      throw new RuntimeFailure(errorCode, { timeout: errorCode === "OPENHARNESS_TIMEOUT" });
    }
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}
