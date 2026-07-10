/**
 * Shared error shape per standards/api.md — every error that can cross an
 * API boundary is one of these, never a bare Error with an ad hoc message.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTEGRATION_NOT_CONFIGURED"
  | "INTERNAL_ERROR";

export interface ErrorDetail {
  field: string;
  issue: string;
}

export class PlatformError extends Error {
  readonly code: ErrorCode;
  readonly details: ErrorDetail[] | undefined;
  readonly httpStatus: number;

  constructor(
    code: ErrorCode,
    message: string,
    options: { details?: ErrorDetail[]; httpStatus?: number } = {},
  ) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
    this.details = options.details;
    this.httpStatus = options.httpStatus ?? httpStatusForCode(code);
  }
}

function httpStatusForCode(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHENTICATED":
      return 401;
    case "UNAUTHORIZED":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "INTEGRATION_NOT_CONFIGURED":
      return 503;
    case "INTERNAL_ERROR":
      return 500;
  }
}

export function validationError(details: ErrorDetail[]): PlatformError {
  return new PlatformError("VALIDATION_ERROR", "Request failed validation.", { details });
}

export function unauthenticatedError(message = "Authentication required."): PlatformError {
  return new PlatformError("UNAUTHENTICATED", message);
}

export function unauthorizedError(message = "You do not have permission to perform this action."): PlatformError {
  return new PlatformError("UNAUTHORIZED", message);
}

export function notFoundError(resource: string): PlatformError {
  return new PlatformError("NOT_FOUND", `${resource} not found.`);
}

export function conflictError(message: string): PlatformError {
  return new PlatformError("CONFLICT", message);
}

export function integrationNotConfiguredError(integration: string): PlatformError {
  return new PlatformError(
    "INTEGRATION_NOT_CONFIGURED",
    `${integration} is not configured for this environment yet.`,
  );
}
