import { createHash } from "node:crypto";
import type { MonitorProvider, MonitorProviderResult } from "../types.js";
import { classifyException, classifyHttpStatus } from "../../research/sources/classify.js";

const TIMEOUT_MS = 8000;
const PROVIDER_ID = "web-snapshot";

/**
 * Generic single-URL page monitor. `query` here is the target URL itself
 * (e.g. a competitor's public pricing page) rather than a search term — most
 * pricing pages have no feed/API, so the only reliable signal is "did this
 * page's content change". Produces exactly one `MonitorSnapshotItem` per
 * fetch, keyed by the URL, with:
 *   - `fields.price`: the first `$<number>`-shaped substring found in the
 *     page body (best-effort; `undefined` when no such pattern is found —
 *     callers monitoring non-pricing pages can ignore this field),
 *   - `fields.contentHash`: a SHA-256 hex digest of the raw response body,
 *     letting the diff engine detect ANY textual change even when no price
 *     pattern was extracted.
 * This is the primary monitor for the "pricing changes" domain, and doubles
 * as a general page-change detector for e.g. a competitor's changelog page
 * (feature releases).
 */
const PRICE_PATTERN = /\$\s?\d[\d,]*(?:\.\d{2})?/;

/**
 * Blocks the obvious SSRF targets (loopback/private/link-local ranges,
 * the cloud-metadata address) by hostname/IP-literal inspection. This is a
 * basic allowlist-of-schemes + blocklist-of-hosts check, NOT full
 * DNS-rebinding protection — a hostname that resolves to a private address
 * only at request time (after this check runs) would still get through.
 * Closing that fully would require controlling DNS resolution at the
 * socket layer, which this fetch-based provider doesn't do. Flagged here
 * rather than silently treated as solved.
 */
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local, includes the cloud-metadata address (169.254.169.254)
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?fe80:/i, // IPv6 link-local
];

function validateSnapshotTargetUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: `"${rawUrl}" is not a valid URL` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: `scheme "${parsed.protocol}" is not allowed — only http/https are permitted targets` };
  }
  if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    return { ok: false, reason: `host "${parsed.hostname}" resolves to a private/loopback/link-local range and is blocked` };
  }
  return { ok: true, url: parsed };
}

async function fetchWebSnapshot(query: string): Promise<MonitorProviderResult> {
  const trimmed = query.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    if (!trimmed) {
      return { ok: false, reason: "unknown-error", error: "web-snapshot provider requires a target URL as its query" };
    }

    const validated = validateSnapshotTargetUrl(trimmed);
    if (!validated.ok) {
      return { ok: false, reason: "unknown-error", error: `web-snapshot rejected target: ${validated.reason}` };
    }
    const url = validated.url.toString();

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return {
        ok: false,
        reason: classifyHttpStatus(response.status),
        error: `Page request failed with status ${response.status} (${url})`,
      };
    }

    const body = await response.text();
    const capturedAt = new Date().toISOString();
    const priceMatch = PRICE_PATTERN.exec(body);
    const contentHash = createHash("sha256").update(body).digest("hex");

    return {
      ok: true,
      snapshot: {
        providerId: PROVIDER_ID,
        category: "pricing",
        query: url,
        capturedAt,
        items: [
          {
            id: url,
            title: url,
            url,
            fields: {
              price: priceMatch?.[0]?.replace(/\s/g, ""),
              contentHash,
              contentLength: body.length,
            },
            capturedAt,
            sourceId: PROVIDER_ID,
          },
        ],
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: classifyException(error),
      error: error instanceof Error ? error.message : `unknown page fetch error (${trimmed})`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const webSnapshotProvider: MonitorProvider = {
  id: PROVIDER_ID,
  keyless: true,
  category: "pricing",
  fetch: fetchWebSnapshot,
};
