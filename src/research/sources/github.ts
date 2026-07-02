import type { RawResearchItem, SourceAdapter, SourceAdapterResult } from "../types.js";
import { classifyException, classifyHttpStatus } from "./classify.js";

const TIMEOUT_MS = 8000;
const SOURCE_ID = "github";

/**
 * GitHub's Issues search endpoint (`search/issues`), not `search/repositories`.
 * Trending repositories are the wrong content type for problem discovery —
 * Issues/Discussions/Feature Requests are where founders' pain points show
 * up as real, dated, first-person problem statements. `is:issue` already
 * excludes pull requests, so no separate `-is:pr` filter is needed.
 */
interface GitHubIssueItem {
  title?: string;
  html_url?: string;
  body?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface GitHubSearchResponse {
  items?: GitHubIssueItem[];
}

async function fetchGithub(windowDays: number, topic?: string): Promise<SourceAdapterResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const queryParts = [`is:issue`, `created:>${since}`];
    if (topic && topic.trim().length > 0) queryParts.unshift(topic.trim());
    const query = encodeURIComponent(queryParts.join(" "));
    const url = `https://api.github.com/search/issues?q=${query}&sort=created&order=desc&per_page=25`;

    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) {
      return {
        ok: false,
        reason: classifyHttpStatus(response.status),
        error: `GitHub search failed with status ${response.status}`,
      };
    }

    const body = (await response.json()) as GitHubSearchResponse;
    const items: RawResearchItem[] = (body.items ?? []).map((item) => ({
      title: item.title ?? "untitled-issue",
      url: item.html_url ?? "https://github.com",
      snippet: item.body ?? undefined,
      publishedAt: item.created_at ?? item.updated_at,
      sourceId: SOURCE_ID,
    }));

    return { ok: true, items };
  } catch (error) {
    return {
      ok: false,
      reason: classifyException(error),
      error: error instanceof Error ? error.message : "unknown GitHub fetch error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export const githubSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: false,
  fetch: fetchGithub,
};
