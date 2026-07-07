import type { AIProviderError } from "./types.js";

export function createProviderError(
  providerId: string,
  message: string,
  options: { retryable?: boolean; statusCode?: number; cause?: unknown } = {},
): AIProviderError {
  const error = new Error(message, { cause: options.cause }) as AIProviderError;
  error.providerId = providerId;
  error.retryable = options.retryable ?? false;
  error.statusCode = options.statusCode;
  return error;
}

export function isAIProviderError(error: unknown): error is AIProviderError {
  return error instanceof Error && typeof (error as AIProviderError).providerId === "string";
}
