import type { RawResearchItem, SourceAdapter, SourceAdapterResult, SourceFailureReason } from "../types.js";
import { classifyException, classifyHttpStatus } from "./classify.js";

const TIMEOUT_MS = 8000;
const SOURCE_ID = "reddit";
const USER_AGENT = "FounderOS-Research/1.0";

/** Small fixed set of broad startup/tech-relevant subreddits (used when no topic is supplied). */
const SUBREDDIT_LISTING_URLS = [
  "https://www.reddit.com/r/startups/new.json?limit=25",
  "https://www.reddit.com/r/SaaS/new.json?limit=25",
];

/** Builds the topic-aware Reddit search URL (site-wide, not restricted to a single subreddit). */
function topicSearchUrl(topic: string): string {
  const params = new URLSearchParams({ q: topic, sort: "new", restrict_sr: "0", limit: "25" });
  return `https://www.reddit.com/search.json?${params.toString()}`;
}

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

type OneListingResult =
  | { ok: true; items: RawResearchItem[] }
  | { ok: false; reason: SourceFailureReason; error: string };

/**
 * Fetches a single subreddit listing (or the single topic-search URL).
 * Never silently collapses a failure to `[]` — every failure is tagged with
 * a classified reason so the caller (`fetchReddit`) can distinguish "this
 * endpoint had zero new posts" (a legitimate `{ ok: true, items: [] }`) from
 * "this endpoint's request actually failed".
 */
async function fetchOneSubreddit(listingUrl: string, windowDays: number): Promise<OneListingResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(listingUrl, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      // Reddit returns 403 both for "blocked/rate-limited without a
      // recognizable client" and for genuinely restricted content — we
      // cannot distinguish those without inspecting the body, so both are
      // classified as authentication-failure per classify.ts's shared rule.
      return {
        ok: false,
        reason: classifyHttpStatus(response.status),
        error: `Reddit request failed with status ${response.status}`,
      };
    }

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

    return { ok: true, items };
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

async function fetchReddit(
  windowDays: number,
  topic: string | undefined,
  listingUrls: string[] = SUBREDDIT_LISTING_URLS,
): Promise<SourceAdapterResult> {
  const urls = topic && topic.trim().length > 0 ? [topicSearchUrl(topic.trim())] : listingUrls;
  try {
    const results = await Promise.all(urls.map((listingUrl) => fetchOneSubreddit(listingUrl, windowDays)));

    const items: RawResearchItem[] = [];
    const failures: Array<{ reason: SourceFailureReason; error: string }> = [];

    for (const result of results) {
      if (result.ok) {
        items.push(...result.items);
      } else {
        failures.push({ reason: result.reason, error: result.error });
      }
    }

    if (failures.length === 0) {
      return { ok: true, items };
    }

    if (failures.length === results.length) {
      // Every endpoint failed — this is a genuine adapter-level failure, not
      // a silent zero-item success.
      const first = failures[0]!;
      return {
        ok: false,
        reason: first.reason,
        error: failures.map((f) => f.error).join("; "),
      };
    }

    // Some endpoints failed but at least one succeeded — report the real
    // items we did get, and flag the partial failure rather than hiding it.
    const first = failures[0]!;
    return {
      ok: true,
      items,
      partialFailure: {
        reason: first.reason,
        detail: `${failures.length}/${results.length} Reddit endpoint(s) failed: ${failures
          .map((f) => f.error)
          .join("; ")}`,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: classifyException(error),
      error: error instanceof Error ? error.message : "unknown Reddit fetch error",
    };
  }
}

export const redditSource: SourceAdapter = {
  id: SOURCE_ID,
  keyless: true,
  fetch: (windowDays: number, topic?: string) => fetchReddit(windowDays, topic),
};
