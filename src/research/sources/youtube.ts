import type { RawResearchItem, SourceAdapter, SourceAdapterResult } from "../types.js";

const TIMEOUT_MS = 8000;
const SOURCE_ID = "youtube";

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

async function fetchYoutube(windowDays: number): Promise<SourceAdapterResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Missing YOUTUBE_API_KEY" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const publishedAfter = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({
      part: "snippet",
      q: "startup product launch",
      type: "video",
      order: "date",
      maxResults: "25",
      publishedAfter,
      key: apiKey,
    });
    const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, error: `YouTube search failed with status ${response.status}` };
    }

    const body = (await response.json()) as YouTubeSearchResponse;
    const items: RawResearchItem[] = (body.items ?? [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        title: item.snippet?.title ?? "untitled-video",
        url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
        snippet: item.snippet?.description,
        publishedAt: item.snippet?.publishedAt,
        sourceId: SOURCE_ID,
      }));

    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown YouTube fetch error" };
  } finally {
    clearTimeout(timer);
  }
}

export const youtubeSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: false,
  fetch: fetchYoutube,
};
