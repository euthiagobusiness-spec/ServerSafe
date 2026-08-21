export type ChatTurnResult = "completed" | "aborted" | "failed";

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

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
}: {
  signal: AbortSignal;
  run: () => Promise<string>;
  persist: (answer: string) => Promise<void>;
  onDone: () => void;
  onError: (error: unknown) => void;
  cleanup: () => Promise<void>;
}): Promise<ChatTurnResult> {
  try {
    throwIfAborted(signal);
    const answer = await run();
    throwIfAborted(signal);
    await persist(answer);
    throwIfAborted(signal);
    onDone();
    return "completed";
  } catch (error) {
    if (signal.aborted || isAbortError(error)) return "aborted";
    onError(error);
    return "failed";
  } finally {
    await cleanup();
  }
}
