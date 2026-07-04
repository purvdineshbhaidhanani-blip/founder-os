import type { MonitorProvider, MonitorProviderResult, MonitorSnapshotItem } from "../types.js";
import { classifyException, classifyHttpStatus } from "../../research/sources/classify.js";

const TIMEOUT_MS = 8000;
const PROVIDER_ID = "hackernews-launches";

/**
 * Thin wrapper around the same HN Algolia `search_by_date` endpoint used by
 * `src/research/sources/hackernews.ts`, scoped to a monitoring `query`.
 * Discussion volume/points on a query (a competitor name, "Show HN
 * <product>", a funding-round keyword, etc) is used as a lightweight signal
 * for Product Hunt-style launches, funding news, and general market
 * chatter — domains that don't have one single authoritative feed.
 */
interface AlgoliaHit {
  title?: string;
  story_title?: string;
  url?: string | null;
  story_url?: string | null;
  objectID?: string;
  created_at?: string;
  points?: number;
  num_comments?: number;
}

interface AlgoliaResponse {
  hits?: AlgoliaHit[];
}

async function fetchHackerNewsLaunches(query: string, windowDays = 30): Promise<MonitorProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const since = Math.floor((Date.now() - windowDays * 24 * 60 * 60 * 1000) / 1000);
    const params = new URLSearchParams({
      tags: "story",
      numericFilters: `created_at_i>${since}`,
      hitsPerPage: "25",
    });
    if (query.trim().length > 0) params.set("query", query.trim());
    const url = `https://hn.algolia.com/api/v1/search_by_date?${params.toString()}`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return {
        ok: false,
        reason: classifyHttpStatus(response.status),
        error: `Hacker News search failed with status ${response.status}`,
      };
    }

    const body = (await response.json()) as AlgoliaResponse;
    const capturedAt = new Date().toISOString();
    const items: MonitorSnapshotItem[] = (body.hits ?? []).map((hit) => {
      const title = hit.title ?? hit.story_title ?? "untitled-story";
      const url =
        hit.url ??
        hit.story_url ??
        (hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : "https://news.ycombinator.com");
      return {
        id: hit.objectID ?? url,
        title,
        url,
        fields: { points: hit.points, numComments: hit.num_comments },
        capturedAt,
        sourceId: PROVIDER_ID,
      };
    });

    return {
      ok: true,
      snapshot: { providerId: PROVIDER_ID, category: "product-hunt", query, capturedAt, items },
    };
  } catch (error) {
    return {
      ok: false,
      reason: classifyException(error),
      error: error instanceof Error ? error.message : "unknown Hacker News fetch error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export const hackerNewsLaunchesProvider: MonitorProvider = {
  id: PROVIDER_ID,
  keyless: true,
  category: "product-hunt",
  fetch: fetchHackerNewsLaunches,
};
