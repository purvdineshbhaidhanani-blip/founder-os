import type { RawResearchItem, SourceAdapter, SourceAdapterResult } from "../types.js";

const TIMEOUT_MS = 8000;
const SOURCE_ID = "github";

interface GitHubRepoItem {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  updated_at?: string;
  pushed_at?: string;
}

interface GitHubSearchResponse {
  items?: GitHubRepoItem[];
}

async function fetchGithub(windowDays: number): Promise<SourceAdapterResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const query = encodeURIComponent(`pushed:>${since} stars:>10`);
    const url = `https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=25`;

    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) {
      return { ok: false, error: `GitHub search failed with status ${response.status}` };
    }

    const body = (await response.json()) as GitHubSearchResponse;
    const items: RawResearchItem[] = (body.items ?? []).map((item) => ({
      title: item.full_name ?? "unknown-repo",
      url: item.html_url ?? "https://github.com",
      snippet: item.description ?? undefined,
      publishedAt: item.pushed_at ?? item.updated_at,
      sourceId: SOURCE_ID,
    }));

    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown GitHub fetch error" };
  } finally {
    clearTimeout(timer);
  }
}

export const githubSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: false,
  fetch: fetchGithub,
};
