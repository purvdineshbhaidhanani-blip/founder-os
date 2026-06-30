import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Stack Overflow collector.
 * Uses the Stack Exchange API v2.3 (no auth required for read-only, 300 req/day).
 * Options:
 *   tags?: string[]  — SO tags to query (default: professional software tags)
 *   key?: string     — SE API key (raises quota to 10k/day)
 */
export class StackOverflowCollector implements ICollector {
  readonly source = "stackoverflow" as const;
  readonly displayName = "Stack Overflow";

  private readonly DEFAULT_TAGS = [
    "devops", "kubernetes", "docker", "aws", "saas",
    "api", "automation", "typescript", "python", "llm",
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = Math.min(config.limit ?? 30, 100);
    const tags: string[] = (config.options?.tags as string[] | undefined) ?? this.DEFAULT_TAGS;
    const key: string | undefined = config.options?.key as string | undefined;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    const fromdate = config.since
      ? Math.floor(Date.parse(config.since) / 1000)
      : Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

    for (const tag of tags.slice(0, 5)) {
      try {
        let url = `https://api.stackexchange.com/2.3/questions?tagged=${encodeURIComponent(tag)}&order=desc&sort=votes&site=stackoverflow&pagesize=${limit}&fromdate=${fromdate}&filter=withbody`;
        if (key) url += `&key=${key}`;

        const res = await fetch(url, { headers: { "Accept-Encoding": "gzip" } });
        if (!res.ok) {
          errors.push(makeError("HTTP_ERROR", `Stack Overflow API ${res.status}`, { tag }));
          continue;
        }
        const json = (await res.json()) as SOResponse;
        for (const q of json.items) {
          const text = [q.title, q.body ?? ""].join("\n").replace(/<[^>]+>/g, " ");
          items.push(
            makeItem("stackoverflow", {
              source: "stackoverflow",
              url: q.link,
              author: q.owner?.display_name ?? "unknown",
              timestamp: new Date(q.creation_date * 1000).toISOString(),
              language: "en",
              category: classifyCategory(q.tags.join(" ")),
              rawContent: text,
              context: `SO tag:${tag} — ${q.title}`,
              engagement: {
                replies: q.answer_count,
                votes: q.score,
              },
              metadata: {
                questionId: q.question_id,
                tags: q.tags,
                viewCount: q.view_count,
                isAnswered: q.is_answered,
              },
            }),
          );
        }
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { tag }));
      }
    }

    return { source: "stackoverflow", items, fetchedAt, errors };
  }
}

interface SOResponse {
  items: Array<{
    question_id: number;
    title: string;
    body?: string;
    link: string;
    tags: string[];
    score: number;
    answer_count: number;
    view_count: number;
    creation_date: number;
    is_answered: boolean;
    owner?: { display_name: string };
  }>;
}
