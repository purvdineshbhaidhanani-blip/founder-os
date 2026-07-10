import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-ID propagation per standards/api.md: every error response
 * carries a `requestId` that ties back to server-side logs. Framework-
 * agnostic (works in a Next.js route handler, an Express middleware, or a
 * background job) via AsyncLocalStorage rather than requiring a specific
 * HTTP framework's request object.
 */

export interface RequestContext {
  requestId: string;
  organizationId?: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

/** Wrap a request handler's execution so `getRequestContext()` works anywhere inside it. */
export function runWithRequestContext<T>(context: Partial<RequestContext>, fn: () => T): T {
  const full: RequestContext = { requestId: context.requestId ?? generateRequestId(), ...context };
  return storage.run(full, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Reads an inbound `x-request-id` header if the caller/proxy supplied one, otherwise mints a new one. */
export function resolveRequestId(headers: Headers | Record<string, string | string[] | undefined>): string {
  const incoming =
    headers instanceof Headers
      ? headers.get("x-request-id")
      : Array.isArray(headers["x-request-id"])
        ? headers["x-request-id"][0]
        : headers["x-request-id"];
  return incoming && incoming.trim().length > 0 ? incoming : generateRequestId();
}
