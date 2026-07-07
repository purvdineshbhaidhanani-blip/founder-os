import { withTimeoutSignal } from "@platform/shared";

/**
 * Same return shape as `HealthCheckFn` in the Logging & Monitoring engine
 * (`{ status, details? }`), reproduced structurally instead of imported —
 * engines don't import from sibling engines (see PLATFORM_ENGINES.md's
 * "no cross-engine imports" convention); `HealthCheckRegistry.register(name,
 * check)` accepts this by structural compatibility.
 */
export type ProviderHealthStatus = "ok" | "degraded" | "down";
export interface ProviderHealthResult {
  status: ProviderHealthStatus;
  details?: string;
}

const DEFAULT_HEALTH_TIMEOUT_MS = 10_000;

export interface AIHealthCheckOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

async function probeModelsEndpoint(
  label: string,
  baseUrl: string,
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<ProviderHealthResult> {
  const { signal, cancel } = withTimeoutSignal(timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}/models`, { method: "GET", headers, signal });
    if (response.ok) return { status: "ok", details: `${label}: reachable, credentials accepted.` };
    if (response.status === 401 || response.status === 403) {
      return { status: "down", details: `${label}: authentication rejected (HTTP ${response.status}).` };
    }
    if (response.status === 404) {
      // Endpoint path may differ by API version — reachable, but this check couldn't confirm auth.
      return { status: "degraded", details: `${label}: reachable, but GET /models returned 404 — verify baseUrl/API version.` };
    }
    return { status: "down", details: `${label}: unexpected HTTP ${response.status}.` };
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      return { status: "down", details: `${label}: timed out after ${timeoutMs}ms.` };
    }
    return { status: "down", details: `${label}: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    cancel();
  }
}

/**
 * Non-billable connectivity + auth check: calls the standard `GET /models`
 * listing endpoint (no completion is generated, so no token cost). Reports
 * "down" on missing config without making a network call.
 */
export function createOpenAIHealthCheck(options: AIHealthCheckOptions): () => Promise<ProviderHealthResult> {
  const baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  return async () => {
    if (!options.apiKey) return { status: "down", details: "openai: no apiKey configured." };
    return probeModelsEndpoint("openai", baseUrl, { authorization: `Bearer ${options.apiKey}` }, fetchImpl, timeoutMs);
  };
}

/**
 * Non-billable connectivity + auth check against Anthropic's `GET /models`
 * listing endpoint. If your deployment's API version predates that
 * endpoint, a 404 is reported as "degraded" (reachable, unverified) rather
 * than "down" — this check does not send a `POST /messages` because that
 * would consume real usage on every health check.
 */
export function createAnthropicHealthCheck(options: AIHealthCheckOptions): () => Promise<ProviderHealthResult> {
  const baseUrl = options.baseUrl ?? "https://api.anthropic.com/v1";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  return async () => {
    if (!options.apiKey) return { status: "down", details: "anthropic: no apiKey configured." };
    return probeModelsEndpoint(
      "anthropic",
      baseUrl,
      { "x-api-key": options.apiKey, "anthropic-version": "2023-06-01" },
      fetchImpl,
      timeoutMs,
    );
  };
}
