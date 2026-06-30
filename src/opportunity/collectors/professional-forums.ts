import type { ICollector, CollectorConfig, CollectorResult } from "../collector.js";
import { classifyCategory, detectLanguage, makeError, makeItem, nowIsoString } from "./base.js";

/**
 * Professional Forums collector.
 * Targets Discourse-based communities and Slack/Discord public archives.
 * Most Discourse forums expose a public JSON API with no auth.
 * Options:
 *   forums?: Array<{url: string; name: string}>  — Discourse forum base URLs
 *   category?: string                            — Discourse category slug filter
 */
export class ProfessionalForumsCollector implements ICollector {
  readonly source = "professional-forums" as const;
  readonly displayName = "Professional Forums";

  private readonly DEFAULT_FORUMS = [
    { url: "https://forum.cursor.sh", name: "Cursor" },
    { url: "https://community.fly.io", name: "Fly.io" },
    { url: "https://community.n8n.io", name: "n8n" },
    { url: "https://discuss.streamlit.io", name: "Streamlit" },
    { url: "https://community.temporal.io", name: "Temporal" },
  ];

  async collect(config: CollectorConfig = {}): Promise<CollectorResult> {
    const fetchedAt = nowIsoString();
    const limit = Math.min(config.limit ?? 20, 30);
    const forums = (config.options?.forums as Array<{ url: string; name: string }> | undefined) ?? this.DEFAULT_FORUMS;

    const errors: CollectorResult["errors"] = [];
    const items: CollectorResult["items"] = [];

    for (const forum of forums.slice(0, 5)) {
      try {
        // Discourse public topic listing API
        const listUrl = `${forum.url}/latest.json?order=created&ascending=false`;
        const listRes = await fetch(listUrl, {
          headers: { Accept: "application/json", "User-Agent": "founder-os-collector/1.0" },
        });
        if (!listRes.ok) {
          errors.push(makeError("HTTP_ERROR", `Forum ${forum.name} listing returned ${listRes.status}`, { url: listUrl }));
          continue;
        }
        const listJson = (await listRes.json()) as DiscourseTopicList;
        const topics = (listJson.topic_list?.topics ?? []).slice(0, limit);

        for (const topic of topics) {
          if (config.since && topic.created_at < config.since) continue;
          if (topic.pinned) continue; // skip pinned announcements

          // Fetch first post body
          let body = topic.excerpt ?? "";
          if (!body) {
            try {
              const topicRes = await fetch(`${forum.url}/t/${topic.id}.json`, {
                headers: { Accept: "application/json", "User-Agent": "founder-os-collector/1.0" },
              });
              if (topicRes.ok) {
                const tj = (await topicRes.json()) as { post_stream?: { posts?: Array<{ cooked?: string }> } };
                body = stripHtml(tj.post_stream?.posts?.[0]?.cooked ?? "").slice(0, 2000);
              }
            } catch {
              // use excerpt only
            }
          }

          const text = [topic.title, body].join("\n");
          if (!text.trim()) continue;

          items.push(
            makeItem("professional-forums", {
              source: "professional-forums",
              url: `${forum.url}/t/${topic.slug}/${topic.id}`,
              author: topic.last_poster_username ?? "unknown",
              timestamp: topic.created_at,
              language: detectLanguage(text),
              category: classifyCategory(`${forum.name} ${topic.title}`),
              rawContent: text,
              context: `${forum.name} forum — ${topic.title}`,
              engagement: {
                replies: topic.posts_count - 1,
                votes: topic.like_count ?? 0,
              },
              metadata: {
                forum: forum.name,
                forumUrl: forum.url,
                topicId: topic.id,
                views: topic.views,
                likeCount: topic.like_count,
                tags: topic.tags,
              },
            }),
          );
        }
      } catch (err) {
        errors.push(makeError("FETCH_FAILED", String(err), { forum: forum.name }));
      }
    }

    return { source: "professional-forums", items, fetchedAt, errors };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  posts_count: number;
  like_count?: number;
  views: number;
  created_at: string;
  last_poster_username?: string;
  excerpt?: string;
  pinned: boolean;
  tags?: string[];
}

interface DiscourseTopicList {
  topic_list?: {
    topics?: DiscourseTopic[];
  };
}
