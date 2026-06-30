import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * YouTube Comments collector.
 * Uses the YouTube Data API v3. Requires YOUTUBE_API_KEY.
 * Targets professional software/tech channels.
 * Options:
 *   apiKey?: string       — YouTube Data API v3 key
 *   channelIds?: string[] — channel IDs to pull top video comments from
 *   query?: string        — search query for videos (overrides channelIds)
 */
export class YouTubeCollector implements ICollector {
  readonly source = "youtube" as const;
  readonly displayName = "Professional YouTube Comments";

  private readonly DEFAULT_CHANNELS = [
    "UCVHFbw7woebKtfvug_tMXJg", // Fireship
    "UCeVMnSShP_Iviwkknt83cww", // Code with Mosh
    "UCBcRF18a7Qf58cCRy5xuWwQ", // Web Dev Simplified
    "UCWX3yGbODM3M3a3EoZTCBHg", // TechWorld with Nana
    "UCW5YeuERMmlnqo4oq8vwUpg", // NetworkChuck
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = Math.min(config.limit ?? 20, 100);
    const apiKey: string | undefined = config.options?.apiKey as string | undefined;
    const channelIds: string[] = (config.options?.channelIds as string[] | undefined) ?? this.DEFAULT_CHANNELS;
    const searchQuery: string | undefined = config.options?.query as string | undefined;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    if (!apiKey) {
      errors.push(makeError("MISSING_KEY", "YOUTUBE_API_KEY not set. Skipping.", {}));
      return { source: "youtube", items, fetchedAt, errors };
    }

    try {
      // Find videos to pull comments from
      const videoIds: string[] = await findVideoIds(apiKey, channelIds, searchQuery, limit, errors);

      // Pull comments from each video
      for (const videoId of videoIds.slice(0, 5)) {
        try {
          const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${limit}&order=relevance&key=${apiKey}`;
          const res = await fetch(commentsUrl);
          if (!res.ok) {
            errors.push(makeError("COMMENTS_FAILED", `Comments for video ${videoId}: ${res.status}`));
            continue;
          }
          const json = (await res.json()) as YTCommentsResponse;
          for (const thread of json.items ?? []) {
            const comment = thread.snippet?.topLevelComment?.snippet;
            if (!comment) continue;
            if (config.since && comment.publishedAt < config.since) continue;
            const text = comment.textOriginal ?? comment.textDisplay ?? "";
            if (text.length < 30) continue;
            items.push(
              makeItem("youtube", {
                source: "youtube",
                url: `https://www.youtube.com/watch?v=${videoId}&lc=${thread.id}`,
                author: comment.authorDisplayName ?? "anonymous",
                timestamp: comment.publishedAt,
                language: detectLanguage(text),
                category: classifyCategory(text),
                rawContent: text,
                context: `YouTube comment on video ${videoId}`,
                engagement: {
                  votes: comment.likeCount ?? 0,
                  replies: thread.snippet?.totalReplyCount ?? 0,
                },
                metadata: {
                  videoId,
                  commentId: thread.id,
                  likeCount: comment.likeCount,
                  replyCount: thread.snippet?.totalReplyCount,
                },
              }),
            );
          }
        } catch (err) {
          errors.push(makeError("COMMENT_FETCH_FAILED", String(err), { videoId }));
        }
      }
    } catch (err) {
      errors.push(makeError("FETCH_FAILED", String(err)));
    }

    return { source: "youtube", items, fetchedAt, errors };
  }
}

async function findVideoIds(
  apiKey: string,
  channelIds: string[],
  query: string | undefined,
  limit: number,
  errors: Array<{ code: string; message: string }>,
): Promise<string[]> {
  const ids: string[] = [];

  if (query) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=${encodeURIComponent(query)}&maxResults=${limit}&order=relevance&key=${apiKey}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as { items?: Array<{ id?: { videoId?: string } }> };
        for (const item of json.items ?? []) {
          if (item.id?.videoId) ids.push(item.id.videoId);
        }
      }
    } catch (err) {
      errors.push({ code: "SEARCH_FAILED", message: String(err) });
    }
  } else {
    for (const channelId of channelIds.slice(0, 3)) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&type=video&maxResults=5&order=viewCount&key=${apiKey}`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = (await res.json()) as { items?: Array<{ id?: { videoId?: string } }> };
          for (const item of json.items ?? []) {
            if (item.id?.videoId) ids.push(item.id.videoId);
          }
        }
      } catch (err) {
        errors.push({ code: "CHANNEL_SEARCH_FAILED", message: String(err) });
      }
    }
  }

  return ids;
}

interface YTCommentsResponse {
  items?: Array<{
    id: string;
    snippet?: {
      totalReplyCount: number;
      topLevelComment?: {
        snippet?: {
          authorDisplayName: string;
          textOriginal?: string;
          textDisplay?: string;
          publishedAt: string;
          likeCount?: number;
        };
      };
    };
  }>;
}
