import type { RawResearchItem, SourceAdapter, SourceAdapterResult } from "../types.js";

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

async function fetchOneFeed(feedUrl: string, windowDays: number): Promise<RawResearchItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(feedUrl, { signal: controller.signal });
    if (!response.ok) return [];
    const xml = await response.text();
    return parseRssItems(xml).filter((item) => withinWindow(item, windowDays));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRss(windowDays: number, feedUrls: string[] = DEFAULT_FEED_URLS): Promise<SourceAdapterResult> {
  try {
    const results = await Promise.allSettled(feedUrls.map((feedUrl) => fetchOneFeed(feedUrl, windowDays)));
    const items: RawResearchItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") items.push(...result.value);
    }
    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown RSS fetch error" };
  }
}

export const rssSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: true,
  fetch: (windowDays: number) => fetchRss(windowDays),
};
