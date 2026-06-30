import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * G2 collector.
 * G2 doesn't have a public API; this adapter scrapes their public review pages
 * via structured fetch (no JavaScript required for the review listing).
 * Options:
 *   products?: string[]  — G2 product slugs to collect reviews from
 *                          e.g. ["salesforce", "hubspot", "zapier"]
 */
export class G2Collector implements ICollector {
  readonly source = "g2" as const;
  readonly displayName = "G2";

  private readonly DEFAULT_PRODUCTS = [
    "salesforce", "hubspot-crm", "zapier", "monday-com",
    "notion", "airtable", "asana", "jira", "linear",
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = config.limit ?? 20;
    const products: string[] = (config.options?.products as string[] | undefined) ?? this.DEFAULT_PRODUCTS;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    for (const slug of products.slice(0, 5)) {
      try {
        const url = `https://www.g2.com/products/${slug}/reviews`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; founder-os-collector/1.0)",
            Accept: "text/html",
          },
        });
        if (!res.ok) {
          errors.push(makeError("HTTP_ERROR", `G2 ${slug} returned ${res.status}`, { url }));
          continue;
        }
        const html = await res.text();
        const parsed = parseG2Reviews(html, slug, limit);
        items.push(...parsed.map((r) =>
          makeItem("g2", {
            source: "g2",
            url: `https://www.g2.com/products/${slug}/reviews#survey-response-${r.id}`,
            author: r.author,
            timestamp: r.date,
            language: detectLanguage(r.text),
            category: classifyCategory(slug),
            rawContent: r.text,
            context: `G2 review of ${slug} — ${r.rating}/5 stars`,
            engagement: {
              reviews: 1,
            },
            metadata: {
              product: slug,
              rating: r.rating,
              reviewId: r.id,
              pros: r.pros,
              cons: r.cons,
            },
          }),
        ));
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { product: slug }));
      }
    }

    return { source: "g2", items, fetchedAt, errors };
  }
}

interface G2Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  pros: string;
  cons: string;
}

function parseG2Reviews(html: string, slug: string, limit: number): G2Review[] {
  const reviews: G2Review[] = [];
  // Extract review blocks via regex patterns on G2's stable HTML structure
  const reviewBlockRe = /<div[^>]*data-survey-response-id="([^"]+)"[^>]*>([\s\S]*?)(?=<div[^>]*data-survey-response-id="|$)/g;
  const ratingRe = /aria-label="(\d(?:\.\d)?) out of 5"/;
  const dateRe = /datetime="([^"]+)"/;
  const authorRe = /<meta[^>]*itemprop="name"[^>]*content="([^"]+)"/;
  const prosRe = /What do you like best[^<]*<\/[^>]+>\s*<p[^>]*>([\s\S]*?)<\/p>/i;
  const consRe = /What do you dislike[^<]*<\/[^>]+>\s*<p[^>]*>([\s\S]*?)<\/p>/i;

  let match: RegExpExecArray | null;
  while ((match = reviewBlockRe.exec(html)) !== null && reviews.length < limit) {
    const id = match[1] ?? generateFallbackId(slug, reviews.length);
    const block = match[2] ?? "";
    const ratingMatch = ratingRe.exec(block);
    const dateMatch = dateRe.exec(block);
    const authorMatch = authorRe.exec(block);
    const prosMatch = prosRe.exec(block);
    const consMatch = consRe.exec(block);

    const pros = stripHtml(prosMatch?.[1] ?? "");
    const cons = stripHtml(consMatch?.[1] ?? "");
    const text = [pros, cons].filter(Boolean).join("\n");
    if (!text.trim()) continue;

    reviews.push({
      id,
      author: stripHtml(authorMatch?.[1] ?? "anonymous"),
      rating: parseFloat(ratingMatch?.[1] ?? "0"),
      date: dateMatch?.[1] ?? new Date().toISOString(),
      text,
      pros,
      cons,
    });
  }
  return reviews;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function generateFallbackId(slug: string, idx: number): string {
  return `${slug}-${idx}-${Date.now()}`;
}
