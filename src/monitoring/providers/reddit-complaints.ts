import type { MonitorProvider, MonitorProviderResult, MonitorSnapshotItem } from "../types.js";
import { classifyException, classifyHttpStatus } from "../../research/sources/classify.js";

const TIMEOUT_MS = 8000;
const PROVIDER_ID = "reddit-complaints";
const USER_AGENT = "FounderOS-Monitoring/1.0";

/**
 * Thin wrapper around the same site-wide Reddit search endpoint used by
 * `src/research/sources/reddit.ts`'s topic path, scoped to a monitoring
 * `query` (typically a competitor/product name). Sorted by `new` so a
 * repeated check surfaces newly-posted complaints since the last run — the
 * "new complaints" monitoring domain.
 */
interface RedditPostData {
  title?: string;
  permalink?: string;
  selftext?: string;
  author?: string;
  created_utc?: number;
  score?: number;
  ups?: number;
  num_comments?: number;
  subreddit?: string;
}

interface RedditListingChild {
  data?: RedditPostData;
}

interface RedditListingResponse {
  data?: { children?: RedditListingChild[] };
}

function withinWindow(createdUtc: number | undefined, windowDays: number): boolean {
  if (createdUtc === undefined) return true;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return createdUtc * 1000 >= cutoff;
}

async function fetchRedditComplaints(query: string, windowDays = 30): Promise<MonitorProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const params = new URLSearchParams({
      q: `${query.trim()} complaint OR issue OR broken OR frustrating`,
      sort: "new",
      restrict_sr: "0",
      limit: "25",
    });
    const url = `https://www.reddit.com/search.json?${params.toString()}`;

    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) {
      return {
        ok: false,
        reason: classifyHttpStatus(response.status),
        error: `Reddit request failed with status ${response.status}`,
      };
    }

    const body = (await response.json()) as RedditListingResponse;
    const children = body.data?.children ?? [];
    const capturedAt = new Date().toISOString();
    const items: MonitorSnapshotItem[] = [];

    for (const child of children) {
      const post = child.data;
      if (!post || !post.title || !post.permalink) continue;
      if (!withinWindow(post.created_utc, windowDays)) continue;

      items.push({
        id: post.permalink,
        title: post.title,
        url: `https://reddit.com${post.permalink}`,
        fields: { score: post.score ?? post.ups, numComments: post.num_comments },
        capturedAt,
        sourceId: PROVIDER_ID,
        metadata: { author: post.author, subreddit: post.subreddit, snippet: post.selftext },
      });
    }

    return {
      ok: true,
      snapshot: { providerId: PROVIDER_ID, category: "complaint", query, capturedAt, items },
    };
  } catch (error) {
    return {
      ok: false,
      reason: classifyException(error),
      error: error instanceof Error ? error.message : "unknown Reddit fetch error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export const redditComplaintsProvider: MonitorProvider = {
  id: PROVIDER_ID,
  keyless: true,
  category: "complaint",
  fetch: fetchRedditComplaints,
};
