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

  it("github adapter returns ok:false with reason 'authentication-failure' on a 403 status", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 403)) as unknown as typeof fetch;
    const result = await githubSource.fetch(30);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("authentication-failure");
  });

  it("github adapter returns ok:false with reason 'api-limit' on a 429 status", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 429)) as unknown as typeof fetch;
    const result = await githubSource.fetch(30);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("api-limit");
  });

  it("github adapter classifies a network exception as reason 'network-failure'", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const result = await githubSource.fetch(30);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network-failure");
  });

  it("github adapter queries the Issues search endpoint (not repositories), scoped with is:issue", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await githubSource.fetch(30);
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("api.github.com/search/issues");
    expect(decodeURIComponent(calledUrl)).toContain("is:issue");
  });

  it("github adapter includes the topic in the search query when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await githubSource.fetch(30, "invoicing software");
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(decodeURIComponent(calledUrl)).toContain("invoicing software");
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

  it("youtube adapter uses the topic as the search query when provided, and the default query otherwise", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await youtubeSource.fetch(30, "expense tracking app");
    const withTopicUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(withTopicUrl).toContain("q=expense+tracking+app");

    await youtubeSource.fetch(30);
    const defaultUrl = fetchMock.mock.calls[1]?.[0] as string;
    expect(defaultUrl).toContain("q=startup+product+launch");
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

  it("stackexchange adapter uses the topic as the search query when provided, and the default query otherwise", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await stackExchangeSource.fetch(30, "real estate CRM");
    const withTopicUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(withTopicUrl).toContain("q=real+estate+CRM");

    await stackExchangeSource.fetch(30);
    const defaultUrl = fetchMock.mock.calls[1]?.[0] as string;
    expect(defaultUrl).toContain("q=startup+product");
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

  it("hackernews adapter adds a topic as an Algolia `query` param instead of running a bare firehose", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ hits: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await hackerNewsSource.fetch(30, "dev tools");
    const withTopicUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(withTopicUrl).toContain("query=dev+tools");

    await hackerNewsSource.fetch(30);
    const defaultUrl = fetchMock.mock.calls[1]?.[0] as string;
    expect(defaultUrl).not.toContain("query=");
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

  it("rss adapter returns ok:false with a classified reason when every feed fails, instead of silently reporting success", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const result = await rssSource.fetch(30);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("network-failure");
      expect(result.error).toBeTruthy();
    }
  });

  it("rss adapter never throws even if fetch throws synchronously", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error("sync throw");
    }) as unknown as typeof fetch;
    await expect(rssSource.fetch(30)).resolves.toMatchObject({ ok: false });
  });

  it("rss adapter returns ok:true with partialFailure set when some (but not all) feeds fail", async () => {
    const goodXml = `<rss><channel><item><title>Big Launch</title><link>https://example.com/a</link></item></channel></rss>`;
    let call = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return Promise.resolve({ ok: true, status: 200, text: async () => goodXml } as unknown as Response);
      }
      return Promise.reject(new Error("feed unreachable"));
    }) as unknown as typeof fetch;

    const result = await rssSource.fetch(30);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.partialFailure).toBeDefined();
      expect(result.partialFailure?.detail).toContain("feed unreachable");
    }
  });

  it("rss adapter filters items by topic (case-insensitive, title or snippet) when a topic is provided", async () => {
    const xml = `<rss><channel>
      <item><title>Accounting Automation Launch</title><link>https://example.com/a</link><description>for bookkeepers</description></item>
      <item><title>Unrelated Gaming News</title><link>https://example.com/b</link><description>nothing relevant</description></item>
    </channel></rss>`;
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => xml } as unknown as Response) as unknown as typeof fetch;

    const result = await rssSource.fetch(30, "accounting");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((item) => item.title.toLowerCase().includes("accounting"))).toBe(true);
    }
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

  it("reddit adapter returns ok:false with a classified reason when every subreddit request fails, instead of silently reporting success", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const result = await redditSource.fetch(30);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("network-failure");
      expect(result.error).toBeTruthy();
    }
  });

  it("reddit adapter returns ok:false with reason 'authentication-failure' when every subreddit responds 403 (blocked/rate-limited)", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 403)) as unknown as typeof fetch;
    const result = await redditSource.fetch(30);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("authentication-failure");
  });

  it("reddit adapter returns ok:false with reason 'api-limit' when every subreddit responds 429", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 429)) as unknown as typeof fetch;
    const result = await redditSource.fetch(30);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("api-limit");
  });

  it("reddit adapter returns ok:true with partialFailure set when one subreddit succeeds and the other fails", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    let call = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return Promise.resolve(
          jsonResponse({
            data: {
              children: [
                { data: { title: "Post one", permalink: "/r/startups/comments/1/x/", created_utc: nowSeconds, score: 5 } },
              ],
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse({}, false, 429));
    }) as unknown as typeof fetch;

    const result = await redditSource.fetch(30);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.partialFailure).toBeDefined();
      expect(result.partialFailure?.reason).toBe("api-limit");
    }
  });

  it("reddit adapter returns ok:false on timeout without throwing", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("This operation was aborted")));
        }),
    ) as unknown as typeof fetch;

    const promise = redditSource.fetch(30);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(promise).resolves.toMatchObject({ ok: false, reason: "network-failure" });
    vi.useRealTimers();
  });

  it("reddit adapter never throws even if fetch throws synchronously", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error("sync throw");
    }) as unknown as typeof fetch;
    await expect(redditSource.fetch(30)).resolves.toMatchObject({ ok: false });
  });

  it("reddit adapter uses the site-wide search endpoint (not the fixed subreddit listings) when a topic is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { children: [] } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await redditSource.fetch(30, "invoicing software");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("reddit.com/search.json");
    expect(calledUrl).toContain("q=invoicing+software");
  });

  it("reddit adapter keeps the fixed subreddit listings when no topic is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { children: [] } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await redditSource.fetch(30);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(urls.some((url) => url.includes("r/startups"))).toBe(true);
    expect(urls.some((url) => url.includes("r/SaaS"))).toBe(true);
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
