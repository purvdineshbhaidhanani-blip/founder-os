import type { RawResearchItem, SourceAdapter, SourceAdapterResult } from "../types.js";

const TIMEOUT_MS = 8000;
const SOURCE_ID = "reddit";
const USER_AGENT = "FounderOS-Research/1.0";

/** Small fixed set of broad startup/tech-relevant subreddits (no single "query" concept exists in the engine). */
const SUBREDDIT_LISTING_URLS = [
  "https://www.reddit.com/r/startups/new.json?limit=25",
  "https://www.reddit.com/r/SaaS/new.json?limit=25",
];

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
  data?: {
    children?: RedditListingChild[];
  };
}

function withinWindow(createdUtc: number | undefined, windowDays: number): boolean {
  if (createdUtc === undefined) return true;
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return createdUtc * 1000 >= cutoff;
}

async function fetchOneSubreddit(listingUrl: string, windowDays: number): Promise<RawResearchItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(listingUrl, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return [];

    const body = (await response.json()) as RedditListingResponse;
    const children = body.data?.children ?? [];
    const items: RawResearchItem[] = [];

    for (const child of children) {
      const post = child.data;
      if (!post || !post.title || !post.permalink) continue;
      if (!withinWindow(post.created_utc, windowDays)) continue;

      items.push({
        title: post.title,
        url: `https://reddit.com${post.permalink}`,
        body: post.selftext ?? "",
        author: post.author,
        publishedAt:
          post.created_utc !== undefined ? new Date(post.created_utc * 1000).toISOString() : undefined,
        sourceId: SOURCE_ID,
        engagement: post.score ?? post.ups,
        metadata: { numComments: post.num_comments, subreddit: post.subreddit },
      });
    }

    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchReddit(
  windowDays: number,
  listingUrls: string[] = SUBREDDIT_LISTING_URLS,
): Promise<SourceAdapterResult> {
  try {
    const results = await Promise.allSettled(
      listingUrls.map((listingUrl) => fetchOneSubreddit(listingUrl, windowDays)),
    );
    const items: RawResearchItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") items.push(...result.value);
    }
    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown Reddit fetch error" };
  }
}

export const redditSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: true,
  fetch: (windowDays: number) => fetchReddit(windowDays),
};
