import { createLogger } from "../logging/index.js";
import { getRequestContext } from "../logging/request-context.js";

/**
 * Error capture, provider-agnostic per the same abstraction philosophy as
 * SH-AI: this package never imports `@sentry/node` or any specific error-
 * tracking SDK directly. A product registers its own sink (Sentry,
 * Datadog, etc.) once at startup; until it does, errors still land in
 * structured logs (never silently dropped).
 */

const errorLogger = createLogger({ service: "monitoring" });

export type ErrorSink = (err: unknown, context: Record<string, unknown>) => void;

let registeredSink: ErrorSink | undefined;

export function registerErrorSink(sink: ErrorSink): void {
  registeredSink = sink;
}

export function captureError(err: unknown, context: Record<string, unknown> = {}): void {
  const requestId = getRequestContext()?.requestId;
  const fullContext = { ...context, ...(requestId ? { requestId } : {}) };

  errorLogger.error({ event: "error.captured", ...fullContext }, err);

  if (registeredSink) {
    try {
      registeredSink(err, fullContext);
    } catch (sinkError) {
      errorLogger.error({ event: "error.sink_failed" }, sinkError);
    }
  }
}

/** Wraps an async function so any thrown error is captured before rethrowing — for route handlers and background jobs. */
export function withErrorCapture<Args extends unknown[], Return>(
  fn: (...args: Args) => Promise<Return>,
  context: Record<string, unknown> = {},
): (...args: Args) => Promise<Return> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      captureError(err, context);
      throw err;
    }
  };
}
