import { z } from "zod";
import { validateSnapshotTargetUrl } from "../../../monitoring/providers/web-snapshot.js";
import type { ToolDefinition } from "../types.js";

/**
 * HTTP Tools — every request is validated through the EXISTING SSRF guard
 * (`validateSnapshotTargetUrl`, `src/monitoring/providers/web-snapshot.ts`,
 * exported for this reuse) before it is sent, blocking loopback/private/
 * link-local/cloud-metadata targets. Same documented caveat as that guard:
 * a basic hostname/scheme check, not full DNS-rebinding protection.
 *
 * GET is `"read-only"` (still SSRF-guarded, same trust level the existing
 * autonomous web-snapshot provider already runs at); POST/PUT/PATCH/DELETE
 * are `"ask-user"` since they can cause a real side effect on a remote
 * system. Timeout and retry are handled by `ToolExecutor` (not duplicated
 * here) — this module only builds and sends the request.
 */

const MAX_BODY_CHARS = 500_000;
const requestSchema = z.object({
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

interface HttpToolOutput {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
}

async function sendRequest(method: string, input: z.infer<typeof requestSchema>, signal: AbortSignal | undefined): Promise<HttpToolOutput> {
  const validated = validateSnapshotTargetUrl(input.url);
  if (!validated.ok) throw new Error(`Blocked request target: ${validated.reason}`);

  const response = await fetch(validated.url.toString(), {
    method,
    headers: input.headers,
    ...(input.body !== undefined ? { body: input.body } : {}),
    signal,
  });

  const raw = await response.text();
  const truncated = raw.length > MAX_BODY_CHARS;
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => (headers[key] = value));

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body: truncated ? raw.slice(0, MAX_BODY_CHARS) : raw,
    truncated,
  };
}

const RETRY_NETWORK = { maxAttempts: 2, baseDelayMs: 500 };

function makeTool(id: string, name: string, method: string, mode: "read-only" | "ask-user"): ToolDefinition<z.infer<typeof requestSchema>, HttpToolOutput> {
  return {
    id,
    name,
    description: `Sends an HTTP ${method} request (SSRF-guarded: loopback/private/link-local/metadata hosts are blocked).`,
    capabilities: ["http", mode === "ask-user" ? "network-write" : "read"],
    permission: {
      mode,
      reason: mode === "ask-user" ? `${method} can cause a side effect on the remote system.` : "Read-only request, SSRF-guarded.",
    },
    inputSchema: requestSchema,
    timeoutMs: 20_000,
    retryPolicy: RETRY_NETWORK,
    async run(input, context) {
      return sendRequest(method, input, context.signal);
    },
  };
}

export const HTTP_TOOLS: ToolDefinition[] = [
  makeTool("http_get", "HTTP GET", "GET", "read-only") as ToolDefinition,
  makeTool("http_post", "HTTP POST", "POST", "ask-user") as ToolDefinition,
  makeTool("http_put", "HTTP PUT", "PUT", "ask-user") as ToolDefinition,
  makeTool("http_patch", "HTTP PATCH", "PATCH", "ask-user") as ToolDefinition,
  makeTool("http_delete", "HTTP DELETE", "DELETE", "ask-user") as ToolDefinition,
];
