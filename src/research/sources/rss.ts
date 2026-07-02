import type { RawResearchItem, SourceAdapter, SourceAdapterResult, SourceFailureReason } from "../types.js";
import { classifyException, classifyHttpStatus } from "./classify.js";

const TIMEOUT_MS = 8000;
const SOURCE_ID = "rss";

/** Default real-world tech/startup RSS feeds polled when no override is supplied. */
export const DEFAULT_FEED_URLS = [
  "https://techcrunch.com/feed/",
  "https://www.producthunt.com/feed",
  "https://feeds.feedburner.com/venturebeat/SZYF",
];

function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(itemXml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(itemXml);
  if (!match) return undefined;
  return decodeEntities(stripCdata(match[1] ?? "")).trim() || undefined;
}

/**
 * Minimal, dependency-free RSS 2.0 parser. Good enough for standard
 * `<item><title>...</title><link>...</link><pubDate>...</pubDate></item>`
 * structures — not a general-purpose XML parser.
 */
export function parseRssItems(xml: string, sourceId: string = SOURCE_ID): RawResearchItem[] {
  const items: RawResearchItem[] = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const itemXml of itemMatches) {
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    const description = extractTag(itemXml, "description");
    if (!title || !link) continue;
    const publishedAt = pubDate ? new Date(pubDate).toISOString() : undefined;
    items.push({
      title,
      url: link,
      snippet: description,
      publishedAt: Number.isNaN(Date.parse(pubDate ?? "")) ? undefined : publishedAt,
      sourceId,
    });
  }
  return items;
}

function withinWindow(item: RawResearchItem, windowDays: number): boolean {
  if (!item.publishedAt) return true;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return Date.parse(item.publishedAt) >= cutoff;
}

/** Feeds aren't queryable, so topic-awareness is a client-side post-fetch filter on title/snippet. */
function matchesTopic(item: RawResearchItem, topic: string): boolean {
  const needle = topic.toLowerCase();
  return item.title.toLowerCase().includes(needle) || (item.snippet ?? "").toLowerCase().includes(needle);
}

type OneFeedResult =
  | { ok: true; items: RawResearchItem[] }
  | { ok: false; reason: SourceFailureReason; error: string };

/**
 * Fetches and parses a single feed. Never silently collapses a failure to
 * `[]` — every failure is tagged with a classified reason so the caller
 * (`fetchRss`) can distinguish "this feed genuinely has no items in the
 * window" (a legitimate `{ ok: true, items: [] }`) from "this feed's
 * request/parse actually failed".
 */
async function fetchOneFeed(feedUrl: string, windowDays: number, topic?: string): Promise<OneFeedResult> {
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
    let items = parseRssItems(xml).filter((item) => withinWindow(item, windowDays));
    if (topic && topic.trim().length > 0) {
      items = items.filter((item) => matchesTopic(item, topic));
    }
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

async function fetchRss(
  windowDays: number,
  topic: string | undefined,
  feedUrls: string[] = DEFAULT_FEED_URLS,
): Promise<SourceAdapterResult> {
  try {
    const results = await Promise.all(feedUrls.map((feedUrl) => fetchOneFeed(feedUrl, windowDays, topic)));

    const items: RawResearchItem[] = [];
    const failures: Array<{ reason: SourceFailureReason; error: string }> = [];

    for (const result of results) {
      if (result.ok) {
        items.push(...result.items);
      } else {
        failures.push({ reason: result.reason, error: result.error });
      }
    }

    if (failures.length === 0) {
      return { ok: true, items };
    }

    if (failures.length === results.length) {
      // Every feed failed — this is a genuine adapter-level failure, not a
      // silent zero-item success.
      const first = failures[0]!;
      return {
        ok: false,
        reason: first.reason,
        error: failures.map((f) => f.error).join("; "),
      };
    }

    // Some feeds failed but at least one succeeded — report the real items
    // we did get, and flag the partial failure rather than hiding it.
    const first = failures[0]!;
    return {
      ok: true,
      items,
      partialFailure: {
        reason: first.reason,
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

export const rssSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: true,
  fetch: (windowDays: number, topic?: string) => fetchRss(windowDays, topic),
};
