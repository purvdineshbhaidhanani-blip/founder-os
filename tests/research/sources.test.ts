import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { githubSource } from "../../src/research/sources/github.js";
import { youtubeSource } from "../../src/research/sources/youtube.js";
import { stackExchangeSource } from "../../src/research/sources/stackexchange.js";
import { hackerNewsSource } from "../../src/research/sources/hackernews.js";
import { rssSource, parseRssItems } from "../../src/research/sources/rss.js";
import { redditSource } from "../../src/research/sources/reddit.js";

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("source adapters", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.YOUTUBE_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("github adapter returns ok:true on 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          { full_name: "acme/repo", html_url: "https://github.com/acme/repo", description: "desc", pushed_at: "2026-01-01T00:00:00Z" },
        ],
      }),
    ) as unknown as typeof fetch;

    const result = await githubSource.fetch(30);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.sourceId).toBe("github");
    }
  });

  it("github adapter returns ok:false on network error and never throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const result = await githubSource.fetch(30);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("network down");
  });

  it("github adapter returns ok:false on timeout without throwing", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("This operation was aborted")));
        }),
    ) as unknown as typeof fetch;

    const promise = githubSource.fetch(30);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(promise).resolves.toMatchObject({ ok: false });
    vi.useRealTimers();
  });

  it("github adapter returns ok:false on non-2xx status", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 403)) as unknown as typeof fetch;
    const result = await githubSource.fetch(30);
    expect(result.ok).toBe(false);
  });

  it("youtube adapter returns ok:true on 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [{ id: { videoId: "abc123" }, snippet: { title: "Launch video", publishedAt: "2026-01-01T00:00:00Z" } }],
      }),
    ) as unknown as typeof fetch;

    const result = await youtubeSource.fetch(30);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items[0]?.url).toContain("abc123");
  });

  it("youtube adapter returns ok:false when API key missing", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const result = await youtubeSource.fetch(30);
    expect(result.ok).toBe(false);
  });

  it("youtube adapter returns ok:false on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const result = await youtubeSource.fetch(30);
    expect(result.ok).toBe(false);
  });

  it("stackexchange adapter returns ok:true on 200 without a key", async () => {
    delete process.env.STACK_EXCHANGE_KEY;
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ items: [{ title: "How to scale?", link: "https://stackoverflow.com/q/1", creation_date: 1750000000 }] }),
    ) as unknown as typeof fetch;

    const result = await stackExchangeSource.fetch(30);
    expect(result.ok).toBe(true);
    expect(stackExchangeSource.keyless).toBe(true);
  });

  it("stackexchange adapter returns ok:false on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("dns failure")) as unknown as typeof fetch;
    const result = await stackExchangeSource.fetch(30);
    expect(result.ok).toBe(false);
  });

  it("hackernews adapter returns ok:true on 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ hits: [{ title: "Show HN: thing", objectID: "123", created_at: "2026-01-01T00:00:00Z" }] }),
    ) as unknown as typeof fetch;

    const result = await hackerNewsSource.fetch(30);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items[0]?.url).toContain("123");
  });

  it("hackernews adapter returns ok:false on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("timeout")) as unknown as typeof fetch;
    const result = await hackerNewsSource.fetch(30);
    expect(result.ok).toBe(false);
  });

  it("rss adapter parses standard RSS 2.0 items", () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>Big Launch</title><link>https://example.com/a</link><pubDate>Wed, 01 Jan 2026 00:00:00 GMT</pubDate><description>desc</description></item>
      <item><title><![CDATA[CDATA Title]]></title><link>https://example.com/b</link></item>
    </channel></rss>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe("Big Launch");
    expect(items[1]?.title).toBe("CDATA Title");
  });

  it("rss adapter returns ok:true (empty items) when feeds fail", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("unreachable")) as unknown as typeof fetch;
    const result = await rssSource.fetch(30);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toEqual([]);
  });

  it("rss adapter never throws even if fetch throws synchronously", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error("sync throw");
    }) as unknown as typeof fetch;
    await expect(rssSource.fetch(30)).resolves.toMatchObject({ ok: true });
  });

  it("reddit adapter returns ok:true and maps posts on 200", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          children: [
            {
              data: {
                title: "Show r/SaaS: our new billing tool",
                permalink: "/r/SaaS/comments/abc123/show/",
                selftext: "We built a thing.",
                author: "founder1",
                created_utc: nowSeconds,
                score: 42,
                ups: 42,
                num_comments: 7,
                subreddit: "SaaS",
              },
            },
          ],
        },
      }),
    ) as unknown as typeof fetch;

    const result = await redditSource.fetch(30);
    expect(result.ok).toBe(true);
    expect(redditSource.keyless).toBe(true);
    if (result.ok) {
      expect(result.items.length).toBeGreaterThan(0);
      const item = result.items[0];
      expect(item?.sourceId).toBe("reddit");
      expect(item?.url).toBe("https://reddit.com/r/SaaS/comments/abc123/show/");
      expect(item?.author).toBe("founder1");
      expect(item?.body).toBe("We built a thing.");
      expect(item?.engagement).toBe(42);
      expect(item?.metadata).toEqual({ numComments: 7, subreddit: "SaaS" });
    }

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    for (const call of fetchMock.mock.calls) {
      const init = call[1] as { headers?: Record<string, string> } | undefined;
      expect(init?.headers?.["User-Agent"]).toBeTruthy();
    }
  });

  it("reddit adapter returns ok:true with empty items when a subreddit request fails, and never throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const result = await redditSource.fetch(30);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toEqual([]);
  });

  it("reddit adapter returns ok:false status per-subreddit but overall ok:true, never throws on non-2xx", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 429)) as unknown as typeof fetch;
    const result = await redditSource.fetch(30);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toEqual([]);
  });

  it("reddit adapter returns ok:true (empty items) on timeout without throwing", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("This operation was aborted")));
        }),
    ) as unknown as typeof fetch;

    const promise = redditSource.fetch(30);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(promise).resolves.toMatchObject({ ok: true, items: [] });
    vi.useRealTimers();
  });

  it("reddit adapter never throws even if fetch throws synchronously", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error("sync throw");
    }) as unknown as typeof fetch;
    await expect(redditSource.fetch(30)).resolves.toMatchObject({ ok: true });
  });

  it("reddit adapter filters posts outside the requested windowDays", async () => {
    const oldSeconds = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          children: [
            {
              data: {
                title: "Old post from three months ago",
                permalink: "/r/startups/comments/old1/old/",
                created_utc: oldSeconds,
                score: 1,
              },
            },
          ],
        },
      }),
    ) as unknown as typeof fetch;

    const result = await redditSource.fetch(7);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toEqual([]);
  });
});
