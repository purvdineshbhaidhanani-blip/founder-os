export interface ObjectStorageError extends Error {
  providerId: string;
  retryable: boolean;
  statusCode?: number;
}

/** Mirrors `createProviderError` in the AI engine — same shape, same reasoning, one per engine that talks HTTP to a vendor. */
export function createObjectStorageError(
  providerId: string,
  message: string,
  options: { retryable?: boolean; statusCode?: number; cause?: unknown } = {},
): ObjectStorageError {
  const error = new Error(message, { cause: options.cause }) as ObjectStorageError;
  error.providerId = providerId;
  error.retryable = options.retryable ?? false;
  error.statusCode = options.statusCode;
  return error;
}

export function isObjectStorageError(error: unknown): error is ObjectStorageError {
  return error instanceof Error && typeof (error as ObjectStorageError).providerId === "string";
}
