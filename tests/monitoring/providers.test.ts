import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { githubTrendingProvider } from "../../src/monitoring/providers/github-trending.js";
import { hackerNewsLaunchesProvider } from "../../src/monitoring/providers/hackernews-launches.js";
import { redditComplaintsProvider } from "../../src/monitoring/providers/reddit-complaints.js";
import { rssMarketProvider } from "../../src/monitoring/providers/rss-market.js";
import { webSnapshotProvider } from "../../src/monitoring/providers/web-snapshot.js";

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

function textResponse(body: string, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
  } as unknown as Response;
}

describe("monitor providers — never throw, mocked fetch only", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // --- github-trending -----------------------------------------------------

  it("github-trending returns ok:true and a snapshot on a mocked 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          {
            full_name: "acme/widget",
            html_url: "https://github.com/acme/widget",
            stargazers_count: 120,
            open_issues_count: 4,
            pushed_at: "2026-06-01T00:00:00Z",
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const result = await githubTrendingProvider.fetch("widget");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.providerId).toBe("github-trending");
      expect(result.snapshot.items).toHaveLength(1);
      expect(result.snapshot.items[0]?.id).toBe("acme/widget");
      expect(result.snapshot.items[0]?.fields?.stars).toBe(120);
    }
  });

  it("github-trending never throws and returns ok:false + 'authentication-failure' on a 403", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 403)) as unknown as typeof fetch;
    const result = await githubTrendingProvider.fetch("widget");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("authentication-failure");
  });

  it("github-trending returns ok:false + 'api-limit' on a 429", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 429)) as unknown as typeof fetch;
    const result = await githubTrendingProvider.fetch("widget");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("api-limit");
  });

  it("github-trending returns ok:false + 'network-failure' on a rejected fetch, without throwing", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const result = await githubTrendingProvider.fetch("widget");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network-failure");
  });

  it("github-trending returns ok:false on timeout without throwing", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("This operation was aborted")));
        }),
    ) as unknown as typeof fetch;

    const promise = githubTrendingProvider.fetch("widget");
    await vi.advanceTimersByTimeAsync(8000);
    await expect(promise).resolves.toMatchObject({ ok: false, reason: "network-failure" });
    vi.useRealTimers();
  });

  // --- hackernews-launches ---------------------------------------------------

  it("hackernews-launches returns ok:true on a mocked 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        hits: [{ title: "Show HN: Widget 2.0", objectID: "abc", created_at: "2026-06-01T00:00:00Z", points: 55, num_comments: 12 }],
      }),
    ) as unknown as typeof fetch;

    const result = await hackerNewsLaunchesProvider.fetch("widget");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.items[0]?.fields?.points).toBe(55);
      expect(result.snapshot.category).toBe("product-hunt");
    }
  });

  it("hackernews-launches returns ok:false on network error, never throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const result = await hackerNewsLaunchesProvider.fetch("widget");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network-failure");
  });

  it("hackernews-launches returns ok:false + 'unknown-error' on a 500", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 500)) as unknown as typeof fetch;
    const result = await hackerNewsLaunchesProvider.fetch("widget");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unknown-error");
  });

  // --- reddit-complaints -----------------------------------------------------

  it("reddit-complaints returns ok:true and maps posts on a mocked 200", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          children: [
            {
              data: {
                title: "Widget keeps crashing, so frustrating",
                permalink: "/r/SaaS/comments/xyz/widget/",
                created_utc: nowSeconds,
                score: 10,
                num_comments: 3,
              },
            },
          ],
        },
      }),
    ) as unknown as typeof fetch;

    const result = await redditComplaintsProvider.fetch("widget");
    expect(result.ok).toBe(true);
    expect(redditComplaintsProvider.keyless).toBe(true);
    if (result.ok) {
      expect(result.snapshot.items).toHaveLength(1);
      expect(result.snapshot.items[0]?.url).toBe("https://reddit.com/r/SaaS/comments/xyz/widget/");
      expect(result.snapshot.category).toBe("complaint");
    }
  });

  it("reddit-complaints returns ok:false + 'authentication-failure' on a 403, never throws", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false, 403)) as unknown as typeof fetch;
    const result = await redditComplaintsProvider.fetch("widget");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("authentication-failure");
  });

  it("reddit-complaints never throws even if fetch throws synchronously", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error("sync throw");
    }) as unknown as typeof fetch;
    await expect(redditComplaintsProvider.fetch("widget")).resolves.toMatchObject({ ok: false });
  });

  // --- rss-market --------------------------------------------------------

  it("rss-market returns ok:true and filters by query on a mocked 200", async () => {
    const xml = `<rss><channel>
      <item><title>Widget Inc raises $10M Series A</title><link>https://example.com/a</link><description>funding news</description></item>
      <item><title>Unrelated Gaming News</title><link>https://example.com/b</link><description>nothing relevant</description></item>
    </channel></rss>`;
    global.fetch = vi.fn().mockResolvedValue(textResponse(xml)) as unknown as typeof fetch;

    const result = await rssMarketProvider.fetch("widget");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.items.length).toBeGreaterThan(0);
      expect(result.snapshot.items.every((item) => item.title.toLowerCase().includes("widget"))).toBe(true);
    }
  });

  it("rss-market returns ok:false with a classified reason when every feed fails, never throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const result = await rssMarketProvider.fetch("widget");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network-failure");
  });

  it("rss-market returns ok:true with partialFailure when some (but not all) feeds fail", async () => {
    const goodXml = `<rss><channel><item><title>Widget launch news</title><link>https://example.com/a</link></item></channel></rss>`;
    let call = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      call += 1;
      if (call === 1) return Promise.resolve(textResponse(goodXml));
      return Promise.reject(new Error("feed unreachable"));
    }) as unknown as typeof fetch;

    const result = await rssMarketProvider.fetch("widget");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.partialFailure).toBeDefined();
      expect(result.partialFailure?.detail).toContain("feed unreachable");
    }
  });

  // --- web-snapshot --------------------------------------------------------

  it("web-snapshot returns ok:true with an extracted price and content hash on a mocked 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      textResponse("<html><body>Pro plan: $49.00/mo</body></html>"),
    ) as unknown as typeof fetch;

    const result = await webSnapshotProvider.fetch("https://example.com/pricing");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.items).toHaveLength(1);
      expect(result.snapshot.items[0]?.fields?.price).toBe("$49.00");
      expect(typeof result.snapshot.items[0]?.fields?.contentHash).toBe("string");
    }
  });

  it("web-snapshot returns ok:false + 'unknown-error' on a 404, never throws", async () => {
    global.fetch = vi.fn().mockResolvedValue(textResponse("not found", false, 404)) as unknown as typeof fetch;
    const result = await webSnapshotProvider.fetch("https://example.com/pricing");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unknown-error");
  });

  it("web-snapshot returns ok:false on timeout without throwing", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("This operation was aborted")));
        }),
    ) as unknown as typeof fetch;

    const promise = webSnapshotProvider.fetch("https://example.com/pricing");
    await vi.advanceTimersByTimeAsync(8000);
    await expect(promise).resolves.toMatchObject({ ok: false, reason: "network-failure" });
    vi.useRealTimers();
  });

  it("web-snapshot never throws even if fetch throws synchronously", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error("sync throw");
    }) as unknown as typeof fetch;
    await expect(webSnapshotProvider.fetch("https://example.com/pricing")).resolves.toMatchObject({ ok: false });
  });

  it("web-snapshot rejects loopback/private/link-local targets before ever calling fetch (SSRF guard)", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const blocked = [
      "http://127.0.0.1/admin",
      "http://localhost:8080/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.5/internal",
      "http://192.168.1.1/",
      "http://[::1]/",
    ];
    for (const target of blocked) {
      const result = await webSnapshotProvider.fetch(target);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/rejected target/);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("web-snapshot rejects non-http(s) schemes before ever calling fetch", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await webSnapshotProvider.fetch("file:///etc/passwd");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/scheme/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("web-snapshot still allows a real public https target through to fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue(textResponse("<html>$9.99</html>")) as unknown as typeof fetch;
    const result = await webSnapshotProvider.fetch("https://example.com/pricing");
    expect(result.ok).toBe(true);
  });
});
