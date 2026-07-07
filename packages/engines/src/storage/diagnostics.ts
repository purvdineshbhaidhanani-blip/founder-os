import { createHttpReachabilityCheck } from "@platform/shared";
import type { ObjectStorageProvider } from "./object-storage.js";

/** Structurally compatible with the Logging & Monitoring engine's `HealthCheckFn` — see ai/diagnostics.ts for why this isn't imported. */
export type ProviderHealthStatus = "ok" | "degraded" | "down";
export interface ProviderHealthResult {
  status: ProviderHealthStatus;
  details?: string;
}

export interface ObjectStorageReachabilityCheckOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Label included in details, e.g. "s3", "r2". Defaults to "object-storage". */
  label?: string;
}

/**
 * Unauthenticated reachability-only check for an S3/R2/generic-S3-compatible
 * endpoint. Unlike `createObjectStorageHealthCheck`, this does not need a
 * fully-configured, signed `ObjectStorageProvider` instance — only a base
 * URL — which is what makes it usable from a startup/CI script driven by
 * plain environment variables. It cannot verify credentials or write access
 * (`signRequest` is caller-supplied code, not an env var); once you have a
 * real `HttpObjectStorage` instance wired up with signing, prefer
 * `createObjectStorageHealthCheck` for a real put/get/delete round-trip.
 */
export function createObjectStorageReachabilityCheck(
  options: ObjectStorageReachabilityCheckOptions,
): () => Promise<ProviderHealthResult> {
  return createHttpReachabilityCheck({
    url: options.baseUrl,
    headers: options.headers,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    label: options.label ?? "object-storage",
  });
}

export interface ObjectStorageHealthCheckOptions {
  /** Key used for the round-trip probe. Namespaced under a dot-prefixed prefix so it never collides with real data. Defaults to a fixed key. */
  probeKey?: string;
  /** Label included in details, e.g. "s3", "r2". Defaults to "object-storage". */
  label?: string;
}

/**
 * Works against *any* `ObjectStorageProvider` — S3, R2, a generic
 * S3-compatible endpoint, or local disk — because it's written against the
 * interface, not a vendor SDK. Does a real `put` → `get` → `delete`
 * round-trip on a reserved diagnostic key, which is the only way to verify
 * write permission (not just read/list) without guessing at a
 * vendor-specific "ping" endpoint. Cleans up after itself; if the final
 * `delete` fails the check still reports the put/get result, with the
 * leftover key noted in `details` so it isn't silently orphaned.
 */
export function createObjectStorageHealthCheck(
  provider: ObjectStorageProvider,
  options: ObjectStorageHealthCheckOptions = {},
): () => Promise<ProviderHealthResult> {
  const label = options.label ?? "object-storage";
  const key = options.probeKey ?? ".platform-health-check/probe";
  const payload = Buffer.from(`health-check ${new Date().toISOString()}`);

  return async () => {
    try {
      await provider.put(key, payload, { contentType: "text/plain" });
    } catch (error) {
      return { status: "down", details: `${label}: PUT failed — ${error instanceof Error ? error.message : String(error)}` };
    }

    try {
      const read = await provider.get(key);
      if (!read.data.equals(payload)) {
        return { status: "degraded", details: `${label}: GET returned different bytes than were PUT — check consistency/caching.` };
      }
    } catch (error) {
      return { status: "down", details: `${label}: GET failed after a successful PUT — ${error instanceof Error ? error.message : String(error)}` };
    }

    try {
      await provider.delete(key);
    } catch (error) {
      return {
        status: "degraded",
        details: `${label}: put/get succeeded but cleanup DELETE failed — probe key "${key}" was left behind: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    return { status: "ok", details: `${label}: put/get/delete round-trip succeeded.` };
  };
}
