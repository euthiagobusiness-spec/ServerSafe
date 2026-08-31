import {
  classifyRuntimeError,
  isRequestAbortError,
  logRuntimeEvent,
} from "./observability";
import type { RuntimeContext } from "./observability";

export type ChatTurnResult = "completed" | "aborted" | "failed";

export const isAbortError = isRequestAbortError;

export function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  if (isAbortError(signal.reason)) throw signal.reason;
  const error = new Error("ABORTED");
  error.name = "AbortError";
  throw error;
}

export function linkedAbortController(source: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(source.reason);
  if (source.aborted) abort();
  else source.addEventListener("abort", abort, { once: true });
  return {
    controller,
    dispose() { source.removeEventListener("abort", abort); },
  };
}

export function onceAsync(task: () => Promise<void>) {
  let result: Promise<void> | null = null;
  return () => {
    result ??= task();
    return result;
  };
}

export async function executeCancellableTurn({
  signal,
  run,
  persist,
  onDone,
  onError,
  cleanup,
  runtime,
}: {
  signal: AbortSignal;
  run: () => Promise<string>;
  persist: (answer: string) => Promise<void>;
  onDone: () => void;
  onError: (error: unknown) => void;
  cleanup: () => Promise<void>;
  runtime?: RuntimeContext;
}): Promise<ChatTurnResult> {
  try {
    throwIfAborted(signal);
    const answer = await run();
    throwIfAborted(signal);
    const persistStartedAt = Date.now();
    if (runtime) logRuntimeEvent(runtime, "PERSIST_START", {});
    try {
      await persist(answer);
    } catch (error) {
      if (signal.aborted || isAbortError(error)) throw error;
      if (runtime) {
        logRuntimeEvent(runtime, "TURN_FAILED", {
          error_code: "REDIS_PERSIST_FAILED",
          duration_ms: Date.now() - runtime.startedAt,
          aborted: false,
        });
      }
      onError(error);
      return "failed";
    }
    if (runtime) logRuntimeEvent(runtime, "PERSIST_SUCCESS", { duration_ms: Date.now() - persistStartedAt });
    throwIfAborted(signal);
    onDone();
    return "completed";
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      if (runtime) {
        logRuntimeEvent(runtime, "TURN_FAILED", {
          error_code: "REQUEST_ABORTED",
          duration_ms: Date.now() - runtime.startedAt,
          aborted: true,
        });
      }
      return "aborted";
    }
    if (runtime) {
      logRuntimeEvent(runtime, "TURN_FAILED", {
        error_code: classifyRuntimeError(error),
        duration_ms: Date.now() - runtime.startedAt,
        aborted: false,
      });
    }
    onError(error);
    return "failed";
  } finally {
    await cleanup();
  }
}
