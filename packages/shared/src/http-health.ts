import { withTimeoutSignal } from "./timeout.js";

export type HttpHealthStatus = "ok" | "degraded" | "down";
export interface HttpHealthResult {
  status: HttpHealthStatus;
  details?: string;
}

export interface HttpReachabilityCheckOptions {
  url: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  label?: string;
  /** Defaults to "OPTIONS" — cheap, side-effect-free on most REST APIs, and doesn't trip a POST-only endpoint's real handler. */
  method?: string;
}

/**
 * Generic "is this HTTP endpoint reachable and answering" probe, shared by
 * every engine that needs a connectivity-only health check for an HTTP
 * vendor API without exercising (and potentially side-effecting) its real
 * endpoint. Does not interpret the response body — 2xx-4xx all count as
 * "reachable" (many APIs 404/405 an OPTIONS probe); only a network failure,
 * timeout, or 5xx count as "down".
 */
export function createHttpReachabilityCheck(options: HttpReachabilityCheckOptions): () => Promise<HttpHealthResult> {
  const label = options.label ?? "http";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const method = options.method ?? "OPTIONS";
  return async () => {
    if (!options.url) return { status: "down", details: `${label}: no endpoint configured.` };
    const { signal, cancel } = withTimeoutSignal(timeoutMs);
    try {
      const response = await fetchImpl(options.url, { method, headers: options.headers, signal });
      if (response.status >= 500) return { status: "down", details: `${label}: server error (HTTP ${response.status}).` };
      return { status: "ok", details: `${label}: endpoint reachable (HTTP ${response.status}).` };
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        return { status: "down", details: `${label}: timed out after ${timeoutMs}ms.` };
      }
      return { status: "down", details: `${label}: ${error instanceof Error ? error.message : String(error)}` };
    } finally {
      cancel();
    }
  };
}
