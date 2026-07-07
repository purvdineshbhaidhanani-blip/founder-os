export interface RateLimiter {
  /** Resolves once a slot is available; may wait. */
  acquire(): Promise<void>;
  /** Non-blocking check — true if a slot is available right now (and consumes it). */
  tryAcquire(): boolean;
}

export interface TokenBucketOptions {
  /** Maximum burst size. */
  capacity: number;
  /** Tokens replenished per second. */
  refillPerSecond: number;
}

/**
 * Classic token-bucket limiter: shared by any connector that needs to stay
 * under a provider's rate limit. Works entirely in-process; swap for a
 * Redis-backed bucket via the same interface if the limiter must be shared
 * across processes.
 */
export class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number;
  private lastRefill = Date.now();

  constructor(private readonly options: TokenBucketOptions) {
    this.tokens = options.capacity;
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.options.capacity, this.tokens + elapsedSeconds * this.options.refillPerSecond);
    this.lastRefill = now;
  }

  tryAcquire(): boolean {
    this.refill();
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      const waitMs = Math.max(10, (1 / this.options.refillPerSecond) * 1000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}
