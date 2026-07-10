import { PlatformError, type ErrorDetail } from "../errors/index.js";

/**
 * The one error response shape every product's API returns, per
 * standards/api.md. Route handlers catch PlatformError (or anything) and
 * call toErrorResponseBody — never hand-roll an error JSON body.
 */
export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
}

export function toErrorResponseBody(err: unknown, requestId: string): { body: ErrorResponseBody; status: number } {
  if (err instanceof PlatformError) {
    return {
      status: err.httpStatus,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
          requestId,
        },
      },
    };
  }

  // Unexpected error: log with full context elsewhere (the caller's catch
  // block), but never leak internals to the client — standards/api.md.
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId,
      },
    },
  };
}

export interface SuccessResponseBody<T> {
  data: T;
}

export function toSuccessResponseBody<T>(data: T): SuccessResponseBody<T> {
  return { data };
}
