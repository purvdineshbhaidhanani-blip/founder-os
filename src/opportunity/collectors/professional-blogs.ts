import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Professional Blogs collector.
 * Pulls from professional tech/business blogs via their RSS/Atom feeds.
 * No auth required (all feeds are public).
 * Options:
 *   feeds?: string[]  — RSS/Atom feed URLs to pull from
 */
export class ProfessionalBlogsCollector implements ICollector {
  readonly source = "professional-blogs" as const;
  readonly displayName = "Professional Blogs";

  private readonly DEFAULT_FEEDS = [
    "https://feeds.feedburner.com/oreilly/radar",
    "https://martinfowler.com/feed.atom",
    "https://netflixtechblog.com/feed",
    "https://engineering.atspotify.com/feed/",
    "https://slack.engineering/feed",
    "https://dropbox.tech/feed",
    "https://medium.com/feed/better-programming",
    "https://dev.to/feed",
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = config.limit ?? 10;
    const feeds: string[] = (config.options?.feeds as string[] | undefined) ?? this.DEFAULT_FEEDS;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    for (const feedUrl of feeds.slice(0, 6)) {
      try {
        const res = await fetch(feedUrl, {
          headers: {
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
            "User-Agent": "founder-os-collector/1.0",
          },
        });
        if (!res.ok) {
          errors.push(makeError("HTTP_ERROR", `Blog feed ${feedUrl} returned ${res.status}`));
          continue;
        }
        const xml = await res.text();
        const parsed = parseRSSOrAtom(xml, limit);
        for (const entry of parsed) {
          if (config.since && entry.date < config.since) continue;
          items.push(
            makeItem("professional-blogs", {
              source: "professional-blogs",
              url: entry.url,
              author: entry.author,
              timestamp: entry.date,
              language: detectLanguage(entry.text),
              category: classifyCategory(entry.text),
              rawContent: entry.text,
              context: `Blog: ${entry.title}`,
              engagement: {},
              metadata: {
                feedUrl,
                title: entry.title,
              },
            }),
          );
        }
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { feedUrl }));
      }
    }

    return { source: "professional-blogs", items, fetchedAt, errors };
  }
}

interface FeedEntry {
  url: string;
  author: string;
  date: string;
  title: string;
  text: string;
}

function parseRSSOrAtom(xml: string, limit: number): FeedEntry[] {
  const entries: FeedEntry[] = [];
  // Atom: <entry>
  const atomRe = /<entry>([\s\S]*?)<\/entry>/g;
  // RSS: <item>
  const rssRe = /<item>([\s\S]*?)<\/item>/g;

  const pattern = xml.includes("<entry>") ? atomRe : rssRe;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null && entries.length < limit) {
    const block = match[1] ?? "";
    const url = extractTag(block, "link") || extractAtomLink(block);
    const author = extractTag(block, "author") || extractTag(block, "dc:creator") || "unknown";
    const date = extractTag(block, "published") || extractTag(block, "pubDate") || extractTag(block, "updated") || new Date().toISOString();
    const title = stripHtml(extractTag(block, "title") || "");
    const content = stripHtml(
      extractTag(block, "content:encoded") ||
      extractTag(block, "content") ||
      extractTag(block, "description") ||
      "",
    ).slice(0, 2000);

    if (!content.trim() || !url) continue;
    entries.push({
      url,
      author: stripHtml(author),
      date: normaliseDate(date),
      title,
      text: [title, content].join("\n"),
    });
  }

  return entries;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  return re.exec(xml)?.[1]?.trim() ?? "";
}

function extractAtomLink(xml: string): string {
  return /<link[^>]*href="([^"]+)"/.exec(xml)?.[1] ?? "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normaliseDate(raw: string): string {
  try {
    return new Date(raw).toISOString();
  } catch {
    return new Date().toISOString();
  }
}
