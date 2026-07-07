export interface RetryPolicy {
  maxAttempts: number;
  /** Base delay in ms. Actual delay is `baseDelayMs * backoffMultiplier^(attempt-1)`. */
  baseDelayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  /** Return false to abort retrying immediately (e.g. non-retryable error). Defaults to always retry. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export interface RetryAttempt {
  attempt: number;
  error: unknown;
  delayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 250,
  backoffMultiplier: 2,
  maxDelayMs: 10_000,
};

export function computeBackoffDelay(policy: RetryPolicy, attempt: number): number {
  const multiplier = policy.backoffMultiplier ?? 2;
  const delay = policy.baseDelayMs * multiplier ** (attempt - 1);
  return policy.maxDelayMs ? Math.min(delay, policy.maxDelayMs) : delay;
}

/**
 * Runs `fn`, retrying on failure per `policy`. Shared by the Workflow Engine
 * (step retry) and the Integration Framework (connector retry policies) so
 * backoff math lives in exactly one place.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  onAttemptFailed?: (info: RetryAttempt) => void,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = policy.shouldRetry ? policy.shouldRetry(error, attempt) : true;
      if (!canRetry || attempt === policy.maxAttempts) throw error;
      const delayMs = computeBackoffDelay(policy, attempt);
      onAttemptFailed?.({ attempt, error, delayMs });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
