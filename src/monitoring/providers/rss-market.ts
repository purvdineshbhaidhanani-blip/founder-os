import type { MonitorProvider, MonitorProviderResult, MonitorSnapshotItem } from "../types.js";
import { classifyException, classifyHttpStatus } from "../../research/sources/classify.js";
import { parseRssItems, DEFAULT_FEED_URLS } from "../../research/sources/rss.js";

const TIMEOUT_MS = 8000;
const PROVIDER_ID = "rss-market";

/**
 * Thin wrapper around the same minimal RSS parser (`parseRssItems`) and
 * default feed list already used by `src/research/sources/rss.ts` — read-only
 * reuse, no duplicated parsing logic. Feeds aren't queryable server-side, so
 * (matching `rss.ts`'s own approach) `query` is applied as a client-side
 * title/snippet filter. Covers the "funding news" / "market changes" /
 * general "competitor launches" monitoring domains, which tend to surface in
 * tech-press RSS feeds rather than any single structured API.
 */
function withinWindow(item: MonitorSnapshotItem, windowDays: number): boolean {
  const publishedAt = item.fields?.publishedAt;
  if (typeof publishedAt !== "string") return true;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return Date.parse(publishedAt) >= cutoff;
}

function matchesQuery(item: MonitorSnapshotItem, query: string): boolean {
  const needle = query.toLowerCase();
  if (needle.trim().length === 0) return true;
  const snippet = typeof item.metadata?.snippet === "string" ? item.metadata.snippet : "";
  return item.title.toLowerCase().includes(needle) || snippet.toLowerCase().includes(needle);
}

async function fetchOneFeed(feedUrl: string): Promise<
  { ok: true; items: MonitorSnapshotItem[] } | { ok: false; reason: ReturnType<typeof classifyHttpStatus>; error: string }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(feedUrl, { signal: controller.signal });
    if (!response.ok) {
      return {
        ok: false,
        reason: classifyHttpStatus(response.status),
        error: `RSS feed request failed with status ${response.status} (${feedUrl})`,
      };
    }
    const xml = await response.text();
    const capturedAt = new Date().toISOString();
    const items: MonitorSnapshotItem[] = parseRssItems(xml, PROVIDER_ID).map((raw) => ({
      id: raw.url,
      title: raw.title,
      url: raw.url,
      fields: { publishedAt: raw.publishedAt },
      capturedAt,
      sourceId: PROVIDER_ID,
      metadata: raw.snippet ? { snippet: raw.snippet } : undefined,
    }));
    return { ok: true, items };
  } catch (error) {
    return {
      ok: false,
      reason: classifyException(error),
      error: error instanceof Error ? error.message : `unknown RSS fetch error (${feedUrl})`,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRssMarket(
  query: string,
  windowDays = 30,
  feedUrls: string[] = DEFAULT_FEED_URLS,
): Promise<MonitorProviderResult> {
  try {
    const results = await Promise.all(feedUrls.map((feedUrl) => fetchOneFeed(feedUrl)));

    const allItems: MonitorSnapshotItem[] = [];
    const failures: Array<{ reason: ReturnType<typeof classifyHttpStatus>; error: string }> = [];

    for (const result of results) {
      if (result.ok) {
        allItems.push(...result.items);
      } else {
        failures.push({ reason: result.reason, error: result.error });
      }
    }

    if (failures.length === results.length && results.length > 0) {
      const first = failures[0]!;
      return { ok: false, reason: first.reason, error: failures.map((f) => f.error).join("; ") };
    }

    const capturedAt = new Date().toISOString();
    const items = allItems.filter((item) => withinWindow(item, windowDays)).filter((item) => matchesQuery(item, query));
    const snapshot = { providerId: PROVIDER_ID, category: "market" as const, query, capturedAt, items };

    if (failures.length === 0) {
      return { ok: true, snapshot };
    }

    return {
      ok: true,
      snapshot,
      partialFailure: {
        reason: failures[0]!.reason,
        detail: `${failures.length}/${results.length} RSS feed(s) failed: ${failures.map((f) => f.error).join("; ")}`,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: classifyException(error),
      error: error instanceof Error ? error.message : "unknown RSS fetch error",
    };
  }
}

export const rssMarketProvider: MonitorProvider = {
  id: PROVIDER_ID,
  keyless: true,
  category: "market",
  fetch: (query: string, windowDays?: number) => fetchRssMarket(query, windowDays),
};
