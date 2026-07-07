/**
 * Combines multiple optional `AbortSignal`s into one that aborts as soon as
 * any input signal aborts. Manual implementation (not `AbortSignal.any`,
 * which landed in Node 20.3 — this package targets Node >=18.18).
 */
export function combineSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const present = signals.filter((s): s is AbortSignal => s !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];

  const controller = new AbortController();
  for (const s of present) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

export interface TimeoutSignal {
  /** Pass straight to `fetch`/etc. `undefined` when no timeout and no external signal were given. */
  signal: AbortSignal | undefined;
  /** Clears the internal timer. Always call this once the operation settles, or the timer outlives it. */
  cancel: () => void;
}

/**
 * Produces a signal that aborts after `timeoutMs`, combined with an optional
 * caller-supplied `externalSignal` so both cancellation paths work at once.
 * `timeoutMs <= 0` or `undefined` disables the timeout and just passes
 * `externalSignal` through untouched.
 */
export function withTimeoutSignal(timeoutMs: number | undefined, externalSignal?: AbortSignal): TimeoutSignal {
  if (!timeoutMs || timeoutMs <= 0) {
    return { signal: externalSignal, cancel: () => undefined };
  }

  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    const error = new Error(`Operation timed out after ${timeoutMs}ms`);
    error.name = "TimeoutError";
    timeoutController.abort(error);
  }, timeoutMs);
  if (typeof timer.unref === "function") timer.unref();

  return {
    signal: combineSignals([timeoutController.signal, externalSignal]),
    cancel: () => clearTimeout(timer),
  };
}
