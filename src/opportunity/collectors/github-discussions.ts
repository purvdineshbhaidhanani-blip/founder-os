import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * GitHub Discussions collector.
 * Uses the GitHub GraphQL API (requires token for discussions).
 * Options:
 *   token?: string   — GitHub personal access token (required for GraphQL)
 *   repos?: Array<{owner: string; repo: string}> — repos to query
 */
export class GitHubDiscussionsCollector implements ICollector {
  readonly source = "github-discussions" as const;
  readonly displayName = "GitHub Discussions";

  private readonly DEFAULT_REPOS = [
    { owner: "vercel", repo: "next.js" },
    { owner: "supabase", repo: "supabase" },
    { owner: "prisma", repo: "prisma" },
    { owner: "trpc", repo: "trpc" },
    { owner: "t3-oss", repo: "create-t3-app" },
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = config.limit ?? 20;
    const token: string | undefined = config.options?.token as string | undefined;
    const repos = (config.options?.repos as Array<{ owner: string; repo: string }> | undefined) ?? this.DEFAULT_REPOS;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    if (!token) {
      errors.push(makeError("MISSING_TOKEN", "GitHub Discussions requires a token (GITHUB_TOKEN). Skipping.", {}));
      return { source: "github-discussions", items, fetchedAt, errors };
    }

    const query = `
      query($owner: String!, $repo: String!, $first: Int!) {
        repository(owner: $owner, name: $repo) {
          discussions(first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              number
              title
              body
              url
              createdAt
              author { login }
              upvoteCount
              comments { totalCount }
              category { name }
            }
          }
        }
      }
    `;

    for (const { owner, repo } of repos.slice(0, 5)) {
      try {
        const res = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables: { owner, repo, first: limit } }),
        });
        if (!res.ok) {
          errors.push(makeError("HTTP_ERROR", `GitHub GraphQL ${res.status}`, { owner, repo }));
          continue;
        }
        const json = (await res.json()) as GHDiscussionResponse;
        const nodes = json.data?.repository?.discussions?.nodes ?? [];
        for (const d of nodes) {
          if (config.since && d.createdAt < config.since) continue;
          const text = [d.title, d.body].join("\n");
          items.push(
            makeItem("github-discussions", {
              source: "github-discussions",
              url: d.url,
              author: d.author?.login ?? "unknown",
              timestamp: d.createdAt,
              language: detectLanguage(text),
              category: classifyCategory(`${owner}/${repo} ${d.category?.name ?? ""}`),
              rawContent: text,
              context: `${owner}/${repo} discussion #${d.number}`,
              engagement: {
                replies: d.comments.totalCount,
                votes: d.upvoteCount,
              },
              metadata: {
                repo: `${owner}/${repo}`,
                discussionNumber: d.number,
                category: d.category?.name,
              },
            }),
          );
        }
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { owner, repo }));
      }
    }

    return { source: "github-discussions", items, fetchedAt, errors };
  }
}

interface GHDiscussionResponse {
  data?: {
    repository?: {
      discussions?: {
        nodes: Array<{
          number: number;
          title: string;
          body: string;
          url: string;
          createdAt: string;
          upvoteCount: number;
          author?: { login: string };
          comments: { totalCount: number };
          category?: { name: string };
        }>;
      };
    };
  };
}
