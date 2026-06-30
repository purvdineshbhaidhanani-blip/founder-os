import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * GitHub Issues collector.
 * Uses the GitHub Search API to find pain-signal issues across open-source repos.
 * Options:
 *   token?: string   — GitHub personal access token (raises rate limit)
 *   query?: string   — override default search query
 *   repos?: string[] — restrict to specific repos (owner/repo format)
 */
export class GitHubIssuesCollector implements ICollector {
  readonly source = "github-issues" as const;
  readonly displayName = "GitHub Issues";

  private readonly DEFAULT_QUERY =
    "is:issue is:open label:bug OR label:enhancement OR label:\"help wanted\" OR label:\"pain point\" sort:reactions-+1-desc";

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = Math.min(config.limit ?? 30, 100);
    const token: string | undefined = config.options?.token as string | undefined;
    const query: string = (config.options?.query as string | undefined) ?? this.DEFAULT_QUERY;
    const repos: string[] | undefined = config.options?.repos as string[] | undefined;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const finalQuery = repos
      ? `${query} ${repos.map((r) => `repo:${r}`).join(" OR ")}`
      : `${query} language:JavaScript OR language:TypeScript OR language:Python`;

    try {
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(finalQuery)}&per_page=${limit}&sort=reactions&order=desc`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        errors.push(makeError("HTTP_ERROR", `GitHub Issues API returned ${res.status}`, { url }));
        return { source: "github-issues", items, fetchedAt, errors };
      }
      const json = (await res.json()) as GHSearchResponse;
      for (const issue of json.items) {
        if (config.since && issue.created_at < config.since) continue;
        const text = [issue.title, issue.body ?? ""].join("\n");
        items.push(
          makeItem("github-issues", {
            source: "github-issues",
            url: issue.html_url,
            author: issue.user.login,
            timestamp: issue.created_at,
            language: detectLanguage(text),
            category: classifyCategory(issue.repository_url.replace("https://api.github.com/repos/", "")),
            rawContent: text,
            context: `${issue.repository_url.replace("https://api.github.com/repos/", "")} — issue #${issue.number}`,
            engagement: {
              replies: issue.comments,
              votes: issue.reactions?.["+1"] ?? 0,
            },
            metadata: {
              issueNumber: issue.number,
              state: issue.state,
              labels: issue.labels.map((l) => l.name),
              reactions: issue.reactions,
              repositoryUrl: issue.repository_url,
            },
          }),
        );
      }
    } catch (err) {
      errors.push(makeError("FETCH_FAILED", String(err)));
    }

    return { source: "github-issues", items, fetchedAt, errors };
  }
}

interface GHSearchResponse {
  items: Array<{
    number: number;
    title: string;
    body?: string;
    state: string;
    html_url: string;
    created_at: string;
    comments: number;
    repository_url: string;
    user: { login: string };
    labels: Array<{ name: string }>;
    reactions?: Record<string, number>;
  }>;
}
