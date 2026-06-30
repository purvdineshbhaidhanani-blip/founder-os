import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Trustpilot collector.
 * Uses Trustpilot's public Business Units API (no auth for public read).
 * Options:
 *   domains?: string[]  — business domain names to collect reviews for
 *                         e.g. ["salesforce.com", "notion.so"]
 */
export class TrustpilotCollector implements ICollector {
  readonly source = "trustpilot" as const;
  readonly displayName = "Trustpilot";

  private readonly DEFAULT_DOMAINS = [
    "salesforce.com", "notion.so", "monday.com",
    "asana.com", "hubspot.com", "zapier.com", "airtable.com",
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = Math.min(config.limit ?? 20, 20);
    const domains: string[] = (config.options?.domains as string[] | undefined) ?? this.DEFAULT_DOMAINS;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    for (const domain of domains.slice(0, 4)) {
      try {
        // Step 1: resolve business unit id
        const buRes = await fetch(
          `https://api.trustpilot.com/v1/business-units/find?name=${encodeURIComponent(domain)}`,
          { headers: { Accept: "application/json" } },
        );
        if (!buRes.ok) {
          errors.push(makeError("BU_LOOKUP_FAILED", `Trustpilot BU lookup failed for ${domain}: ${buRes.status}`));
          continue;
        }
        const bu = (await buRes.json()) as { id: string; displayName: string };

        // Step 2: fetch reviews
        const reviewsRes = await fetch(
          `https://api.trustpilot.com/v1/business-units/${bu.id}/reviews?perPage=${limit}&orderBy=createdat.desc`,
          { headers: { Accept: "application/json" } },
        );
        if (!reviewsRes.ok) {
          errors.push(makeError("REVIEWS_FAILED", `Trustpilot reviews for ${domain}: ${reviewsRes.status}`));
          continue;
        }
        const data = (await reviewsRes.json()) as TPReviewsResponse;
        for (const r of data.reviews ?? []) {
          if (config.since && r.createdAt < config.since) continue;
          const text = [r.title, r.text].filter(Boolean).join("\n");
          items.push(
            makeItem("trustpilot", {
              source: "trustpilot",
              url: r.links?.find((l) => l.rel === "self")?.href ?? `https://www.trustpilot.com/review/${domain}`,
              author: r.consumer?.displayName ?? "anonymous",
              timestamp: r.createdAt,
              language: r.language ?? detectLanguage(text),
              category: classifyCategory(domain),
              rawContent: text,
              context: `Trustpilot review of ${bu.displayName} — ${r.stars}/5 stars`,
              engagement: { reviews: 1 },
              metadata: {
                businessUnit: domain,
                stars: r.stars,
                verified: r.isVerified,
                id: r.id,
              },
            }),
          );
        }
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { domain }));
      }
    }

    return { source: "trustpilot", items, fetchedAt, errors };
  }
}

interface TPReviewsResponse {
  reviews?: Array<{
    id: string;
    title: string;
    text: string;
    stars: number;
    language?: string;
    createdAt: string;
    isVerified: boolean;
    consumer?: { displayName: string };
    links?: Array<{ rel: string; href: string }>;
  }>;
}
