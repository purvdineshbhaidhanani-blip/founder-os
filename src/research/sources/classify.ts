import type { SourceFailureReason } from "../types.js";

/**
 * Shared HTTP-status -> failure-reason classification, used by every source
 * adapter so the mapping stays consistent across sources instead of each
 * adapter inventing its own ad hoc rule.
 *
 *   - 401/403 -> "authentication-failure": every keyed API this codebase
 *     calls (GitHub, YouTube, Stack Exchange) returns 401/403 for a missing,
 *     revoked, or invalid credential. Reddit's public JSON endpoints also
 *     return 403 when a request is blocked/rate-limited without a
 *     recognizable User-Agent, which is why reddit.ts treats 403 the same
 *     way (see reddit.ts's own comment for the caveat this can also mean
 *     "blocked", not just "unauthenticated").
 *   - 429 -> "api-limit": the conventional "Too Many Requests" status used
 *     by Reddit, Stack Exchange, and the GitHub REST API for rate limiting.
 *   - everything else non-2xx -> "unknown-error": a catch-all for status
 *     codes (500s, 404, etc.) that don't cleanly map to a specific reason
 *     without deeper per-endpoint knowledge.
 */
export function classifyHttpStatus(status: number): SourceFailureReason {
  if (status === 401 || status === 403) return "authentication-failure";
  if (status === 429) return "api-limit";
  return "unknown-error";
}

/**
 * Shared thrown-exception -> failure-reason classification.
 *
 *   - `SyntaxError` (thrown by `JSON.parse`/`response.json()` on malformed
 *     bodies) -> "parsing-failure".
 *   - `AbortError` (our own `AbortController` timeout) or any error whose
 *     name/message mentions "abort"/"timeout"/"network"/"fetch failed"
 *     (Node's `fetch` throws `TypeError: fetch failed` for DNS/connection
 *     errors) -> "network-failure".
 *   - anything else -> "unknown-error".
 */
export function classifyException(error: unknown): SourceFailureReason {
  if (error instanceof SyntaxError) return "parsing-failure";
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();
    if (
      name === "aborterror" ||
      message.includes("abort") ||
      message.includes("timeout") ||
      name === "typeerror" ||
      message.includes("fetch failed") ||
      message.includes("network")
    ) {
      return "network-failure";
    }
  }
  return "unknown-error";
}
