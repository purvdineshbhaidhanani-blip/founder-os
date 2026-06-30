import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Hacker News collector.
 * Uses the official HN Algolia Search API (no auth required).
 * Focuses on "Ask HN:" posts and top comments for pain signals.
 * Options:
 *   query?: string   — search query (default: pain-signal keywords)
 *   tags?: string    — HN Algolia tag filter (default: "ask_hn,story")
 */
export class HackerNewsCollector implements ICollector {
  readonly source = "hacker-news" as const;
  readonly displayName = "Hacker News";

  private readonly DEFAULT_QUERY =
    "pain OR frustrated OR broken OR \"we had to\" OR workaround OR missing OR \"would pay\" OR alternative OR replace";

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = Math.min(config.limit ?? 30, 50);
    const query: string = (config.options?.query as string | undefined) ?? this.DEFAULT_QUERY;
    const tags: string = (config.options?.tags as string | undefined) ?? "story";

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    const numericFilters = config.since
      ? `&numericFilters=created_at_i>${Math.floor(Date.parse(config.since) / 1000)}`
      : "";

    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=${tags}&hitsPerPage=${limit}${numericFilters}`;
      const res = await fetch(url);
      if (!res.ok) {
        errors.push(makeError("HTTP_ERROR", `HN Algolia API ${res.status}`, { url }));
        return { source: "hacker-news", items, fetchedAt, errors };
      }
      const json = (await res.json()) as HNResponse;
      for (const hit of json.hits) {
        const text = [hit.title ?? "", hit.story_text ?? hit.comment_text ?? ""].join("\n");
        if (!text.trim()) continue;
        items.push(
          makeItem("hacker-news", {
            source: "hacker-news",
            url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
            author: hit.author,
            timestamp: hit.created_at,
            language: detectLanguage(text),
            category: classifyCategory(text),
            rawContent: text,
            context: `HN — ${hit.title ?? `comment by ${hit.author}`}`,
            engagement: {
              votes: hit.points ?? 0,
              replies: hit.num_comments ?? 0,
            },
            metadata: {
              objectId: hit.objectID,
              storyId: hit.story_id,
              type: hit._tags?.includes("ask_hn") ? "ask_hn" : hit._tags?.includes("show_hn") ? "show_hn" : "story",
            },
          }),
        );
      }
    } catch (err) {
      errors.push(makeError("FETCH_FAILED", String(err)));
    }

    return { source: "hacker-news", items, fetchedAt, errors };
  }
}

interface HNResponse {
  hits: Array<{
    objectID: string;
    title?: string;
    story_text?: string;
    comment_text?: string;
    url?: string;
    author: string;
    created_at: string;
    points?: number;
    num_comments?: number;
    story_id?: number;
    _tags?: string[];
  }>;
}
