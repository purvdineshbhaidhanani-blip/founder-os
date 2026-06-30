import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Product Hunt collector.
 * Uses the PH GraphQL API. Requires PRODUCT_HUNT_API_KEY (developer token).
 * Options:
 *   apiKey?: string  — PH API key
 *   topic?: string   — topic slug to filter (e.g. "developer-tools")
 */
export class ProductHuntCollector implements ICollector {
  readonly source = "product-hunt" as const;
  readonly displayName = "Product Hunt";

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = Math.min(config.limit ?? 20, 50);
    const apiKey: string | undefined = config.options?.apiKey as string | undefined;
    const topic: string | undefined = config.options?.topic as string | undefined;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    if (!apiKey) {
      errors.push(makeError("MISSING_KEY", "PRODUCT_HUNT_API_KEY not set. Skipping.", {}));
      return { source: "product-hunt", items, fetchedAt, errors };
    }

    const topicFilter = topic ? `, topic: "${topic}"` : "";
    const query = `{
      posts(first: ${limit}, order: VOTES${topicFilter}) {
        edges {
          node {
            id name tagline description
            url
            createdAt
            votesCount
            commentsCount
            reviewsCount
            reviewsRating
            makers { name }
            topics { edges { node { name } } }
            comments(first: 5) {
              edges { node { body votes user { name } createdAt } }
            }
          }
        }
      }
    }`;

    try {
      const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        errors.push(makeError("HTTP_ERROR", `Product Hunt API ${res.status}`));
        return { source: "product-hunt", items, fetchedAt, errors };
      }
      const json = (await res.json()) as PHResponse;
      for (const { node } of json.data?.posts?.edges ?? []) {
        if (config.since && node.createdAt < config.since) continue;
        const commentTexts = (node.comments?.edges ?? []).map((e) => e.node.body).join("\n");
        const text = [node.name, node.tagline, node.description ?? "", commentTexts].join("\n");
        const topicNames = (node.topics?.edges ?? []).map((e) => e.node.name).join(" ");
        items.push(
          makeItem("product-hunt", {
            source: "product-hunt",
            url: node.url,
            author: node.makers?.[0]?.name ?? "unknown",
            timestamp: node.createdAt,
            language: detectLanguage(text),
            category: classifyCategory(topicNames || text),
            rawContent: text,
            context: `Product Hunt — ${node.name}: ${node.tagline}`,
            engagement: {
              votes: node.votesCount,
              replies: node.commentsCount,
              reviews: node.reviewsCount,
            },
            metadata: {
              productId: node.id,
              reviewsRating: node.reviewsRating,
              topics: (node.topics?.edges ?? []).map((e) => e.node.name),
              makers: (node.makers ?? []).map((m) => m.name),
            },
          }),
        );
      }
    } catch (err) {
      errors.push(makeError("FETCH_FAILED", String(err)));
    }

    return { source: "product-hunt", items, fetchedAt, errors };
  }
}

interface PHResponse {
  data?: {
    posts?: {
      edges: Array<{
        node: {
          id: string;
          name: string;
          tagline: string;
          description?: string;
          url: string;
          createdAt: string;
          votesCount: number;
          commentsCount: number;
          reviewsCount: number;
          reviewsRating: number;
          makers?: Array<{ name: string }>;
          topics?: { edges: Array<{ node: { name: string } }> };
          comments?: { edges: Array<{ node: { body: string; votes: number; user: { name: string }; createdAt: string } }> };
        };
      }>;
    };
  };
}
