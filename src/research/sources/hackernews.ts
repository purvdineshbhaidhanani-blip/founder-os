import type { RawResearchItem, SourceAdapter, SourceAdapterResult } from "../types.js";

const TIMEOUT_MS = 8000;
const SOURCE_ID = "hackernews";

interface AlgoliaHit {
  title?: string;
  story_title?: string;
  url?: string | null;
  story_url?: string | null;
  objectID?: string;
  created_at?: string;
}

interface AlgoliaResponse {
  hits?: AlgoliaHit[];
}

async function fetchHackerNews(windowDays: number): Promise<SourceAdapterResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const since = Math.floor((Date.now() - windowDays * 24 * 60 * 60 * 1000) / 1000);
    const params = new URLSearchParams({
      tags: "story",
      numericFilters: `created_at_i>${since}`,
      hitsPerPage: "25",
    });
    const url = `https://hn.algolia.com/api/v1/search_by_date?${params.toString()}`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, error: `Hacker News search failed with status ${response.status}` };
    }

    const body = (await response.json()) as AlgoliaResponse;
    const items: RawResearchItem[] = (body.hits ?? []).map((hit) => {
      const title = hit.title ?? hit.story_title ?? "untitled-story";
      const url =
        hit.url ??
        hit.story_url ??
        (hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : "https://news.ycombinator.com");
      return {
        title,
        url,
        publishedAt: hit.created_at,
        sourceId: SOURCE_ID,
      };
    });

    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown Hacker News fetch error" };
  } finally {
    clearTimeout(timer);
  }
}

export const hackerNewsSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: true,
  fetch: fetchHackerNews,
};
