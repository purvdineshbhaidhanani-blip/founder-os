import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Apple App Store Reviews collector.
 * Uses Apple's public RSS feed (no auth required).
 * Options:
 *   appIds?: Array<{id: string; name: string}>  — App Store numeric IDs
 *   country?: string                             — ISO 2-letter country code (default "us")
 */
export class AppleStoreCollector implements ICollector {
  readonly source = "apple-store" as const;
  readonly displayName = "Apple App Store Reviews";

  private readonly DEFAULT_APPS = [
    { id: "1488905827", name: "notion" },
    { id: "803453959", name: "slack" },
    { id: "489670292", name: "asana" },
    { id: "1377063030", name: "monday" },
    { id: "1544400830", name: "linear" },
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = Math.min(config.limit ?? 50, 500);
    const apps = (config.options?.appIds as Array<{ id: string; name: string }> | undefined) ?? this.DEFAULT_APPS;
    const country: string = (config.options?.country as string | undefined) ?? "us";

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    for (const app of apps.slice(0, 5)) {
      try {
        // Apple RSS feed returns up to 500 reviews, paginated by page (1-10)
        const page = 1;
        const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${app.id}/sortBy=mostRecent/json`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          errors.push(makeError("HTTP_ERROR", `Apple Store ${app.name} returned ${res.status}`, { url }));
          continue;
        }
        const json = (await res.json()) as AppleRSSResponse;
        const entries = json.feed?.entry ?? [];
        // First entry is metadata (the app itself), skip it
        const reviews = entries.slice(1, limit + 1);
        for (const entry of reviews) {
          if (config.since && entry.updated?.label && entry.updated.label < config.since) continue;
          const text = [entry.title?.label ?? "", entry.content?.label ?? ""].join("\n");
          if (!text.trim()) continue;
          items.push(
            makeItem("apple-store", {
              source: "apple-store",
              url: `https://apps.apple.com/${country}/app/id${app.id}`,
              author: entry.author?.name?.label ?? "anonymous",
              timestamp: entry.updated?.label ?? new Date().toISOString(),
              language: detectLanguage(text),
              category: classifyCategory(app.name),
              rawContent: text,
              context: `App Store review of ${app.name} — ${entry["im:rating"]?.label}/5`,
              engagement: {
                votes: parseInt(entry["im:voteCount"]?.label ?? "0", 10),
                reviews: 1,
                version: entry["im:version"]?.label,
              },
              metadata: {
                appId: app.id,
                appName: app.name,
                rating: parseInt(entry["im:rating"]?.label ?? "0", 10),
                version: entry["im:version"]?.label ?? "",
                voteCount: parseInt(entry["im:voteCount"]?.label ?? "0", 10),
              },
            }),
          );
        }
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { appId: app.id }));
      }
    }

    return { source: "apple-store", items, fetchedAt, errors };
  }
}

interface AppleRSSEntry {
  author?: { name?: { label: string } };
  title?: { label: string };
  content?: { label: string };
  updated?: { label: string };
  "im:rating"?: { label: string };
  "im:version"?: { label: string };
  "im:voteCount"?: { label: string };
}

interface AppleRSSResponse {
  feed?: {
    entry?: AppleRSSEntry[];
  };
}
