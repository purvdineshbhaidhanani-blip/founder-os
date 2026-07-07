export interface NotificationChannelError extends Error {
  providerId: string;
  retryable: boolean;
  statusCode?: number;
}

/** Mirrors `createProviderError` in the AI engine — same shape, same reasoning, one per engine that talks HTTP to a vendor. */
export function createNotificationChannelError(
  providerId: string,
  message: string,
  options: { retryable?: boolean; statusCode?: number; cause?: unknown } = {},
): NotificationChannelError {
  const error = new Error(message, { cause: options.cause }) as NotificationChannelError;
  error.providerId = providerId;
  error.retryable = options.retryable ?? false;
  error.statusCode = options.statusCode;
  return error;
}

export function isNotificationChannelError(error: unknown): error is NotificationChannelError {
  return error instanceof Error && typeof (error as NotificationChannelError).providerId === "string";
}
