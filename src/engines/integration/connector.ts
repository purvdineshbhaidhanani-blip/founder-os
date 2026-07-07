import { withRetry, type RetryPolicy } from "../shared/retry.js";
import type { RateLimiter } from "./rate-limiter.js";
import type { AuthStrategy, ConnectorConfig } from "./types.js";

export interface ConnectorRequestOptions {
  method?: string;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ConnectorOptions extends ConnectorConfig {
  rateLimiter?: RateLimiter;
  retry?: RetryPolicy;
  fetchImpl?: typeof fetch;
}

/**
 * Base connector: composes an `AuthStrategy`, an optional `RateLimiter`, and
 * a retry policy around plain `fetch`. Concrete connectors (Slack, GitHub,
 * Stripe, an internal service, ...) extend this and add their own typed
 * methods — none of that provider-specific code touches auth, rate limiting,
 * or retry, which all live here once.
 */
export class Connector {
  private readonly auth: AuthStrategy;
  private readonly rateLimiter?: RateLimiter;
  private readonly retry?: RetryPolicy;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: ConnectorOptions) {
    this.auth = config.auth;
    this.rateLimiter = config.rateLimiter;
    this.retry = config.retry;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  get id(): string {
    return this.config.id;
  }

  async request<T = unknown>(options: ConnectorRequestOptions): Promise<T> {
    if (this.rateLimiter) await this.rateLimiter.acquire();

    return withRetry(async () => {
      const headers: Record<string, string> = { "content-type": "application/json", ...options.headers };
      const query: Record<string, string> = { ...options.query };
      await this.auth.applyAuth({ headers, query });

      const url = new URL(options.path, this.config.baseUrl);
      for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

      const response = await this.fetchImpl(url.toString(), {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const body = await response.text();
        const error = new Error(`Connector "${this.config.id}" request failed (${response.status}): ${body}`);
        (error as Error & { statusCode?: number }).statusCode = response.status;
        throw error;
      }

      const contentType = response.headers.get("content-type") ?? "";
      return (contentType.includes("application/json") ? await response.json() : await response.text()) as T;
    }, this.retry);
  }
}
