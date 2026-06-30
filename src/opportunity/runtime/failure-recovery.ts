import { nowIso } from "../../utils/id.js";
import type { AuditLog } from "./audit-log.js";
import type { QueueManager } from "./queue-manager.js";

// ---------------------------------------------------------------------------
// Failure Recovery — exponential backoff auto-retry with circuit breaker
// ---------------------------------------------------------------------------

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureAt: string | null;
  openSince: string | null;
}

const DEFAULT_OPTS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 16000,
};

export class FailureRecovery {
  private readonly breakers = new Map<string, CircuitBreakerState>();
  private readonly BREAKER_FAILURE_THRESHOLD = 5;
  private readonly BREAKER_RESET_MS = 5 * 60 * 1000;

  constructor(
    private readonly queue: QueueManager,
    private readonly audit: AuditLog,
  ) {}

  async withRetry<T>(
    operationName: string,
    fn: () => Promise<T>,
    opts: RetryOptions = {},
  ): Promise<T> {
    const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTS, ...opts };

    if (this.isBreakerOpen(operationName)) {
      throw new Error(`Circuit breaker open for: ${operationName}`);
    }

    let lastError: Error = new Error("Unknown error");
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        this.recordSuccess(operationName);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxAttempts) {
          const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
          this.audit.log("job-retried", {
            operationName,
            attempt,
            maxAttempts,
            delayMs: delay,
            error: lastError.message,
          });
          await sleep(delay);
        }
      }
    }

    this.recordFailure(operationName);
    throw lastError;
  }

  recoverQueueFailures(): number {
    const requeued = this.queue.requeueRetrying();
    if (requeued > 0) {
      this.audit.log("failure-recovered", { requeuedJobs: requeued });
    }
    return requeued;
  }

  private isBreakerOpen(name: string): boolean {
    const state = this.breakers.get(name);
    if (!state?.openSince) return false;
    const openMs = Date.now() - new Date(state.openSince).getTime();
    if (openMs > this.BREAKER_RESET_MS) {
      state.failures = 0;
      state.openSince = null;
      return false;
    }
    return true;
  }

  private recordSuccess(name: string): void {
    const state = this.breakers.get(name);
    if (state) {
      state.failures = 0;
      state.openSince = null;
    }
  }

  private recordFailure(name: string): void {
    const state = this.breakers.get(name) ?? { failures: 0, lastFailureAt: null, openSince: null };
    state.failures++;
    state.lastFailureAt = nowIso();
    if (state.failures >= this.BREAKER_FAILURE_THRESHOLD) {
      state.openSince = nowIso();
    }
    this.breakers.set(name, state);
  }

  getBreakerStatus(): Record<string, { open: boolean; failures: number }> {
    const result: Record<string, { open: boolean; failures: number }> = {};
    for (const [name, state] of this.breakers) {
      result[name] = { open: this.isBreakerOpen(name), failures: state.failures };
    }
    return result;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
