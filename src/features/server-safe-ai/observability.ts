import { randomUUID } from "node:crypto";

export const RUNTIME_PHASES = [
  "CHAT_ACCEPTED",
  "SANDBOX_CREATE",
  "SANDBOX_CREATED",
  "OPENHARNESS_START",
  "OPENHARNESS_EXIT",
  "PERSIST_START",
  "PERSIST_SUCCESS",
  "TURN_FAILED",
] as const;

export type RuntimePhase = (typeof RUNTIME_PHASES)[number];

export const RUNTIME_ERROR_CODES = [
  "SANDBOX_CREATE_FAILED",
  "OPENHARNESS_FAILED",
  "OPENHARNESS_EXIT_NONZERO",
  "OPENHARNESS_TIMEOUT",
  "REQUEST_ABORTED",
  "STREAM_LIMIT",
  "RESPONSE_LIMIT",
  "REDIS_PERSIST_FAILED",
  "UNKNOWN_RUNTIME_ERROR",
] as const;

export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[number];

export const GENERIC_CHAT_ERROR_MESSAGE = "A solicitação não pôde ser concluída.";

export type RuntimeLogEntry = {
  event: "serversafe_ai_runtime";
  request_id: string;
  phase: RuntimePhase;
  error_code?: RuntimeErrorCode;
  duration_ms: number;
  model_key?: string;
  exit_code?: number;
  timeout?: boolean;
  aborted?: boolean;
};

export type RuntimeLogger = (entry: RuntimeLogEntry) => void;

export type RuntimeContext = {
  requestId: string;
  modelKey?: string;
  startedAt: number;
  logger: RuntimeLogger;
};

type RuntimeEventFields = {
  error_code?: RuntimeErrorCode;
  duration_ms?: number;
  exit_code?: number;
  timeout?: boolean;
  aborted?: boolean;
};

type RuntimeFailureDetails = {
  exitCode?: number;
  timeout?: boolean;
};

function defaultRuntimeLogger(entry: RuntimeLogEntry) {
  console.info(JSON.stringify(entry));
}

function safeDuration(value: number | undefined) {
  return Number.isFinite(value) && value !== undefined && value >= 0 ? Math.floor(value) : 0;
}

function safeExitCode(value: number | undefined) {
  return Number.isInteger(value) ? value : undefined;
}

export function createRuntimeContext(
  requestId: string = randomUUID(),
  logger: RuntimeLogger = defaultRuntimeLogger,
): RuntimeContext {
  return {
    requestId,
    startedAt: Date.now(),
    logger,
  };
}

/**
 * Emits only the allow-listed runtime fields. Arbitrary error objects and
 * infrastructure details cannot reach the server log through this function.
 */
export function logRuntimeEvent(
  context: RuntimeContext,
  phase: RuntimePhase,
  fields: RuntimeEventFields = {},
) {
  const entry: RuntimeLogEntry = {
    event: "serversafe_ai_runtime",
    request_id: context.requestId,
    phase,
    duration_ms: safeDuration(fields.duration_ms),
  };
  if (context.modelKey) entry.model_key = context.modelKey;
  if (fields.error_code) entry.error_code = fields.error_code;
  const exitCode = safeExitCode(fields.exit_code);
  if (exitCode !== undefined) entry.exit_code = exitCode;
  if (fields.timeout !== undefined) entry.timeout = fields.timeout;
  if (fields.aborted !== undefined) entry.aborted = fields.aborted;
  context.logger(entry);
}

export class RuntimeFailure extends Error {
  readonly code: RuntimeErrorCode;
  readonly exitCode?: number;
  readonly timeout?: boolean;

  constructor(code: RuntimeErrorCode, details: RuntimeFailureDetails = {}) {
    super(code);
    this.name = "RuntimeFailure";
    this.code = code;
    this.exitCode = safeExitCode(details.exitCode);
    this.timeout = details.timeout;
  }
}

export function isRequestAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.message === "ABORTED");
}

function isRuntimeErrorCode(value: unknown): value is RuntimeErrorCode {
  return typeof value === "string" && RUNTIME_ERROR_CODES.includes(value as RuntimeErrorCode);
}

function property(error: unknown, name: string) {
  if (!error || typeof error !== "object") return undefined;
  return (error as Record<string, unknown>)[name];
}

export function isTimeoutError(error: unknown) {
  const name = property(error, "name");
  const code = property(error, "code");
  const status = property(error, "status");
  const responseStatus = property(property(error, "response"), "status");
  return name === "TimeoutError"
    || code === "ETIMEDOUT"
    || code === "TIMEOUT"
    || code === "COMMAND_TIMEOUT"
    || status === 408
    || status === 504
    || responseStatus === 408
    || responseStatus === 504;
}

export function classifyRuntimeError(
  error: unknown,
  fallback: RuntimeErrorCode = "UNKNOWN_RUNTIME_ERROR",
): RuntimeErrorCode {
  if (isRequestAbortError(error)) return "REQUEST_ABORTED";
  if (error instanceof RuntimeFailure) return error.code;
  const message = error instanceof Error ? error.message : undefined;
  if (isRuntimeErrorCode(message)) return message;
  if (isTimeoutError(error)) return "OPENHARNESS_TIMEOUT";
  return fallback;
}

export function classifySandboxCreateError(error: unknown): RuntimeErrorCode {
  return isRequestAbortError(error) ? "REQUEST_ABORTED" : "SANDBOX_CREATE_FAILED";
}

export function classifyOpenHarnessError(error: unknown): RuntimeErrorCode {
  return classifyRuntimeError(error, "OPENHARNESS_FAILED");
}

export function classifyOpenHarnessExit(exitCode: number) {
  return Number.isInteger(exitCode) && exitCode !== 0
    ? "OPENHARNESS_EXIT_NONZERO" as const
    : null;
}

export function chatErrorPayload(requestId: string) {
  return {
    message: GENERIC_CHAT_ERROR_MESSAGE,
    request_id: requestId,
  };
}
