import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Reddit collector.
 * Uses the public JSON API (no auth required for read-only).
 * Searches r/all restricted to professional subreddits via flair/query.
 * Options:
 *   subreddits?: string[]   — override default subreddit list
 *   query?: string          — search query (default: pain-signal keywords)
 */
export class RedditCollector implements ICollector {
  readonly source = "reddit" as const;
  readonly displayName = "Reddit";

  private readonly DEFAULT_SUBREDDITS = [
    "SaaS", "startups", "entrepreneur", "devops", "programming",
    "webdev", "MachineLearning", "artificial", "ProductManagement",
    "sysadmin", "cscareerquestions", "datascience", "marketing",
    "smallbusiness", "aws", "docker", "kubernetes", "automation",
    "nocode", "lowcode",
  ];

  private readonly PAIN_QUERY =
    "hate OR frustrated OR broken OR wish OR missing OR alternative OR replace OR workaround OR pain OR expensive OR slow OR buggy";

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = config.limit ?? 25;
    const subreddits: string[] = (config.options?.subreddits as string[] | undefined) ?? this.DEFAULT_SUBREDDITS;
    const query: string = (config.options?.query as string | undefined) ?? this.PAIN_QUERY;
    const since = config.since ? Math.floor(Date.parse(config.since) / 1000) : undefined;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    for (const sub of subreddits.slice(0, 5)) {
      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${limit}&t=week`;
        const res = await fetch(url, { headers: { "User-Agent": "founder-os-collector/1.0" } });
        if (!res.ok) {
          errors.push(makeError("HTTP_ERROR", `Reddit r/${sub} returned ${res.status}`, { url }));
          continue;
        }
        const json = (await res.json()) as RedditSearchResponse;
        for (const child of json.data.children) {
          const post = child.data;
          if (since && post.created_utc < since) continue;
          const text = [post.title, post.selftext].filter(Boolean).join("\n");
          if (!text.trim()) continue;
          items.push(
            makeItem("reddit", {
              source: "reddit",
              url: `https://reddit.com${post.permalink}`,
              author: post.author,
              timestamp: new Date(post.created_utc * 1000).toISOString(),
              language: detectLanguage(text),
              category: classifyCategory(`${post.subreddit} ${post.title}`),
              rawContent: text,
              context: `r/${post.subreddit} — ${post.title}`,
              engagement: {
                replies: post.num_comments,
                votes: post.score,
              },
              metadata: {
                subreddit: post.subreddit,
                postId: post.id,
                flair: post.link_flair_text,
                upvoteRatio: post.upvote_ratio,
              },
            }),
          );
        }
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { subreddit: sub }));
      }
    }

    return { source: "reddit", items, fetchedAt, errors };
  }
}

// Minimal typing for the Reddit JSON API response
interface RedditSearchResponse {
  data: {
    children: Array<{
      data: {
        id: string;
        title: string;
        selftext: string;
        author: string;
        permalink: string;
        subreddit: string;
        score: number;
        upvote_ratio: number;
        num_comments: number;
        created_utc: number;
        link_flair_text?: string;
      };
    }>;
  };
}
