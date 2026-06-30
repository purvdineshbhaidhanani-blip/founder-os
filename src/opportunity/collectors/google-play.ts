import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Google Play Reviews collector.
 * Uses the unofficial Google Play RSS feed (no auth required for public apps).
 * Options:
 *   appIds?: string[]  — Google Play app IDs (e.g. ["com.notion.id", "com.slack"])
 */
export class GooglePlayCollector implements ICollector {
  readonly source = "google-play" as const;
  readonly displayName = "Google Play Reviews";

  private readonly DEFAULT_APPS = [
    "com.slack", "com.notion.id", "com.asana.app",
    "com.monday.monday", "com.hubspot.android", "com.zapier.android",
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = config.limit ?? 20;
    const appIds: string[] = (config.options?.appIds as string[] | undefined) ?? this.DEFAULT_APPS;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    for (const appId of appIds.slice(0, 5)) {
      try {
        // Google Play public RSS feed for reviews
        const url = `https://play.google.com/store/apps/details?id=${appId}&hl=en&showAllReviews=true`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
            Accept: "text/html",
          },
        });
        if (!res.ok) {
          errors.push(makeError("HTTP_ERROR", `Google Play ${appId} returned ${res.status}`));
          continue;
        }
        const html = await res.text();
        const parsed = parsePlayReviews(html, appId, limit);
        items.push(...parsed.map((r) =>
          makeItem("google-play", {
            source: "google-play",
            url: `https://play.google.com/store/apps/details?id=${appId}`,
            author: r.author,
            timestamp: r.date,
            language: detectLanguage(r.text),
            category: classifyCategory(appId),
            rawContent: r.text,
            context: `Google Play review of ${appId} — ${r.rating}/5`,
            engagement: { votes: r.thumbsUp, reviews: 1 },
            metadata: {
              appId,
              rating: r.rating,
              version: r.version,
              thumbsUp: r.thumbsUp,
            },
          }),
        ));
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { appId }));
      }
    }

    return { source: "google-play", items, fetchedAt, errors };
  }
}

interface PlayReview {
  author: string;
  rating: number;
  date: string;
  text: string;
  version: string;
  thumbsUp: number;
}

function parsePlayReviews(html: string, appId: string, limit: number): PlayReview[] {
  const reviews: PlayReview[] = [];
  // Google Play embeds reviews in JSON inside a script tag: AF_initDataCallback({...})
  const dataRe = /AF_initDataCallback\(\{key:\s*'ds:[\w]+',.*?data:([\s\S]*?),\s*sideChannel/g;
  let m: RegExpExecArray | null;
  while ((m = dataRe.exec(html)) !== null && reviews.length < limit) {
    try {
      const raw = JSON.parse(m[1] ?? "null");
      // Reviews are nested deep in the structure; traverse carefully
      const extracted = extractReviewsFromAFData(raw);
      reviews.push(...extracted.slice(0, limit - reviews.length));
    } catch {
      // skip malformed blocks
    }
  }

  // Fallback: LD+JSON AggregateRating
  if (reviews.length === 0) {
    const ldRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    while ((m = ldRe.exec(html)) !== null && reviews.length < limit) {
      try {
        const data = JSON.parse(m[1] ?? "{}");
        if (data["@type"] === "SoftwareApplication" && data.review) {
          for (const r of [data.review].flat().slice(0, limit)) {
            reviews.push({
              author: r.author?.name ?? "anonymous",
              rating: r.reviewRating?.ratingValue ?? 0,
              date: r.datePublished ?? new Date().toISOString(),
              text: r.reviewBody ?? "",
              version: "",
              thumbsUp: 0,
            });
          }
        }
      } catch {
        // skip
      }
    }
  }

  return reviews;
}

function extractReviewsFromAFData(data: unknown): PlayReview[] {
  const reviews: PlayReview[] = [];
  if (!Array.isArray(data)) return reviews;
  // Google Play data is deeply nested arrays; reviews contain [author, date, rating, text, ...]
  function recurse(node: unknown, depth: number): void {
    if (depth > 8 || !Array.isArray(node)) return;
    // Heuristic: review nodes are arrays where [0] is author string, [2] is rating 1-5, [4] is text
    if (
      typeof node[0] === "string" && node[0].length > 0 &&
      typeof node[2] === "number" && node[2] >= 1 && node[2] <= 5 &&
      typeof node[4] === "string" && node[4].length > 10
    ) {
      reviews.push({
        author: node[0] as string,
        rating: node[2] as number,
        date: typeof node[5] === "string" ? node[5] : new Date().toISOString(),
        text: node[4] as string,
        version: typeof node[10] === "string" ? node[10] : "",
        thumbsUp: typeof node[6] === "number" ? node[6] : 0,
      });
    } else {
      for (const child of node) recurse(child, depth + 1);
    }
  }
  recurse(data, 0);
  return reviews;
}
