import type { MonitorProvider, MonitorProviderResult, MonitorSnapshotItem } from "../types.js";
import { classifyException, classifyHttpStatus } from "../../research/sources/classify.js";

const TIMEOUT_MS = 8000;
const PROVIDER_ID = "github-trending";

/**
 * Thin wrapper around GitHub's `search/repositories` endpoint (distinct from
 * `src/research/sources/github.ts`, which queries `search/issues` for
 * problem-discovery). Scoped to a monitoring `query` (e.g. a competitor name
 * or product category) and sorted by stars, this doubles as both the
 * "trending GitHub" monitor and a proxy signal for competitor
 * launches/feature releases showing up as new or newly-popular open-source
 * repos.
 */
interface GitHubRepoItem {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  open_issues_count?: number;
  pushed_at?: string;
}

interface GitHubRepoSearchResponse {
  items?: GitHubRepoItem[];
}

async function fetchGithubTrending(query: string, windowDays = 30): Promise<MonitorProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const queryParts = [query.trim() || "startup", `pushed:>${since}`];
    const searchQuery = encodeURIComponent(queryParts.join(" "));
    const url = `https://api.github.com/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=25`;

    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) {
      return {
        ok: false,
        reason: classifyHttpStatus(response.status),
        error: `GitHub repository search failed with status ${response.status}`,
      };
    }

    const body = (await response.json()) as GitHubRepoSearchResponse;
    const capturedAt = new Date().toISOString();
    const items: MonitorSnapshotItem[] = (body.items ?? []).map((item) => ({
      id: item.full_name ?? item.html_url ?? "unknown-repo",
      title: item.full_name ?? "untitled-repo",
      url: item.html_url ?? "https://github.com",
      fields: {
        stars: item.stargazers_count,
        openIssues: item.open_issues_count,
        pushedAt: item.pushed_at,
      },
      capturedAt,
      sourceId: PROVIDER_ID,
      metadata: item.description ? { description: item.description } : undefined,
    }));

    return {
      ok: true,
      snapshot: { providerId: PROVIDER_ID, category: "trending-github", query, capturedAt, items },
    };
  } catch (error) {
    return {
      ok: false,
      reason: classifyException(error),
      error: error instanceof Error ? error.message : "unknown GitHub trending fetch error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export const githubTrendingProvider: MonitorProvider = {
  id: PROVIDER_ID,
  keyless: false,
  category: "trending-github",
  fetch: fetchGithubTrending,
};
