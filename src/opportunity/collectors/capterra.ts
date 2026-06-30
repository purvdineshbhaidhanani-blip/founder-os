import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Capterra collector.
 * Scrapes public Capterra review pages (no API available).
 * Options:
 *   products?: string[]  — Capterra product slugs
 */
export class CapterraCollector implements ICollector {
  readonly source = "capterra" as const;
  readonly displayName = "Capterra";

  private readonly DEFAULT_PRODUCTS = [
    "salesforce-crm", "hubspot-crm", "monday", "asana", "notion",
    "quickbooks", "sage", "netsuite", "zendesk", "freshdesk",
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = config.limit ?? 20;
    const products: string[] = (config.options?.products as string[] | undefined) ?? this.DEFAULT_PRODUCTS;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    for (const slug of products.slice(0, 5)) {
      try {
        const url = `https://www.capterra.com/p/reviews/${slug}/`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; founder-os-collector/1.0)",
            Accept: "text/html",
          },
        });
        if (!res.ok) {
          errors.push(makeError("HTTP_ERROR", `Capterra ${slug} returned ${res.status}`, { url }));
          continue;
        }
        const html = await res.text();
        const parsed = parseCapterraReviews(html, slug, limit);
        items.push(...parsed.map((r) =>
          makeItem("capterra", {
            source: "capterra",
            url: `https://www.capterra.com/p/reviews/${slug}/`,
            author: r.author,
            timestamp: r.date,
            language: detectLanguage(r.text),
            category: classifyCategory(slug),
            rawContent: r.text,
            context: `Capterra review of ${slug} — ${r.rating}/5`,
            engagement: { reviews: 1 },
            metadata: {
              product: slug,
              rating: r.rating,
              pros: r.pros,
              cons: r.cons,
            },
          }),
        ));
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { product: slug }));
      }
    }

    return { source: "capterra", items, fetchedAt, errors };
  }
}

interface CapterraReview {
  author: string;
  rating: number;
  date: string;
  text: string;
  pros: string;
  cons: string;
}

function parseCapterraReviews(html: string, slug: string, limit: number): CapterraReview[] {
  const reviews: CapterraReview[] = [];
  // Capterra embeds review JSON in script[type="application/ld+json"] blocks
  const ldJsonRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;

  while ((match = ldJsonRe.exec(html)) !== null && reviews.length < limit) {
    try {
      const data = JSON.parse(match[1] ?? "{}") as LdJsonReview;
      if (data["@type"] !== "Review" && !Array.isArray(data.review)) continue;
      const reviewList: LdJsonReviewItem[] = Array.isArray(data.review)
        ? data.review
        : [data as unknown as LdJsonReviewItem];
      for (const r of reviewList) {
        if (reviews.length >= limit) break;
        const pros = r.positiveNotes ?? r.reviewBody ?? "";
        const cons = r.negativeNotes ?? "";
        const text = [pros, cons].filter(Boolean).join("\n");
        if (!text.trim()) continue;
        reviews.push({
          author: r.author?.name ?? "anonymous",
          rating: r.reviewRating?.ratingValue ?? 0,
          date: r.datePublished ?? new Date().toISOString(),
          text,
          pros,
          cons,
        });
      }
    } catch {
      // malformed JSON block — skip
    }
  }

  // Fallback: regex-based extraction when LD+JSON is absent
  if (reviews.length === 0) {
    const prosRe = /<div[^>]*class="[^"]*pros[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const consRe = /<div[^>]*class="[^"]*cons[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const prosTexts = [...html.matchAll(prosRe)].map((m) => stripHtml(m[1] ?? "")).filter(Boolean);
    const consTexts = [...html.matchAll(consRe)].map((m) => stripHtml(m[1] ?? "")).filter(Boolean);
    for (let i = 0; i < Math.min(limit, prosTexts.length); i++) {
      reviews.push({
        author: "anonymous",
        rating: 0,
        date: new Date().toISOString(),
        text: [prosTexts[i], consTexts[i] ?? ""].join("\n"),
        pros: prosTexts[i] ?? "",
        cons: consTexts[i] ?? "",
      });
    }
  }

  return reviews;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

interface LdJsonReviewItem {
  "@type"?: string;
  author?: { name: string };
  reviewRating?: { ratingValue: number };
  datePublished?: string;
  reviewBody?: string;
  positiveNotes?: string;
  negativeNotes?: string;
}

interface LdJsonReview {
  "@type"?: string;
  review?: LdJsonReviewItem | LdJsonReviewItem[];
}
