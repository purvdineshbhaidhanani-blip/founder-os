import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  researchPeriodFromPreset,
  researchPeriodCustom,
} from "../../src/opportunity/research/types.js";
import { loadCredentials } from "../../src/opportunity/research/env-loader.js";
import { deduplicate, deduplicateAcrossSources } from "../../src/opportunity/research/deduplicator.js";
import { ResearchStore } from "../../src/opportunity/research/research-store.js";
import { ResearchRunner } from "../../src/opportunity/research/research-runner.js";
import type { CollectedItem } from "../../src/opportunity/types.js";
import type { ResearchSession } from "../../src/opportunity/research/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(url: string, content = "We need a better tool for this workflow"): CollectedItem {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    source: "hacker-news",
    url,
    author: "user1",
    timestamp: new Date().toISOString(),
    language: "en",
    category: "automation",
    rawContent: content,
    context: "HN — test",
    engagement: { votes: 10, replies: 2 },
    metadata: {},
    collectedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Research Period
// ---------------------------------------------------------------------------

describe("researchPeriodFromPreset", () => {
  it("7d creates period ~7 days ago", () => {
    const p = researchPeriodFromPreset("7d");
    const diffDays = (Date.now() - new Date(p.since).getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
    expect(p.label).toContain("7");
  });

  it("30d creates period ~30 days ago", () => {
    const p = researchPeriodFromPreset("30d");
    const diffDays = (Date.now() - new Date(p.since).getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });

  it("90d creates period ~90 days ago", () => {
    const p = researchPeriodFromPreset("90d");
    const diffDays = (Date.now() - new Date(p.since).getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(90, 0);
  });

  it("until is close to now", () => {
    const p = researchPeriodFromPreset("30d");
    const lag = Date.now() - new Date(p.until).getTime();
    expect(lag).toBeLessThan(2000);
  });
});

describe("researchPeriodCustom", () => {
  it("accepts explicit since/until", () => {
    const since = "2025-01-01T00:00:00.000Z";
    const until = "2025-01-31T00:00:00.000Z";
    const p = researchPeriodCustom(since, until);
    expect(p.since).toBe(since);
    expect(p.until).toBe(until);
  });

  it("defaults until to now when omitted", () => {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const p = researchPeriodCustom(since);
    expect(new Date(p.until).getTime()).toBeGreaterThan(new Date(since).getTime());
  });

  it("label contains day count", () => {
    const since = "2025-01-01T00:00:00.000Z";
    const until = "2025-04-01T00:00:00.000Z";
    const p = researchPeriodCustom(since, until);
    expect(p.label).toContain("d");
  });
});

// ---------------------------------------------------------------------------
// Env Loader
// ---------------------------------------------------------------------------

describe("loadCredentials", () => {
  it("returns missingKeys for absent env vars", () => {
    // In test env, these vars are unset unless CI sets them
    const savedGh = process.env["GITHUB_TOKEN"];
    const savedYt = process.env["YOUTUBE_API_KEY"];
    const savedSe = process.env["STACKEXCHANGE_API_KEY"];
    delete process.env["GITHUB_TOKEN"];
    delete process.env["YOUTUBE_API_KEY"];
    delete process.env["STACKEXCHANGE_API_KEY"];

    const creds = loadCredentials("/nonexistent-dir");
    expect(creds.missingKeys.length).toBeGreaterThan(0);

    // Restore
    if (savedGh !== undefined) process.env["GITHUB_TOKEN"] = savedGh;
    if (savedYt !== undefined) process.env["YOUTUBE_API_KEY"] = savedYt;
    if (savedSe !== undefined) process.env["STACKEXCHANGE_API_KEY"] = savedSe;
  });

  it("reads from process.env when set", () => {
    const prev = process.env["GITHUB_TOKEN"];
    process.env["GITHUB_TOKEN"] = "test-token-abc";
    const creds = loadCredentials("/nonexistent-dir");
    expect(creds.githubToken).toBe("test-token-abc");
    expect(creds.missingKeys).not.toContain("GITHUB_TOKEN");
    if (prev !== undefined) process.env["GITHUB_TOKEN"] = prev;
    else delete process.env["GITHUB_TOKEN"];
  });

  it("missingKeys lists only absent vars", () => {
    const prev = process.env["GITHUB_TOKEN"];
    const prevYt = process.env["YOUTUBE_API_KEY"];
    const prevSe = process.env["STACKEXCHANGE_API_KEY"];
    process.env["GITHUB_TOKEN"] = "tok";
    delete process.env["YOUTUBE_API_KEY"];
    delete process.env["STACKEXCHANGE_API_KEY"];

    const creds = loadCredentials("/nonexistent-dir");
    expect(creds.missingKeys).toContain("YOUTUBE_API_KEY");
    expect(creds.missingKeys).toContain("STACKEXCHANGE_API_KEY");
    expect(creds.missingKeys).not.toContain("GITHUB_TOKEN");

    if (prev !== undefined) process.env["GITHUB_TOKEN"] = prev; else delete process.env["GITHUB_TOKEN"];
    if (prevYt !== undefined) process.env["YOUTUBE_API_KEY"] = prevYt; else delete process.env["YOUTUBE_API_KEY"];
    if (prevSe !== undefined) process.env["STACKEXCHANGE_API_KEY"] = prevSe; else delete process.env["STACKEXCHANGE_API_KEY"];
  });
});

// ---------------------------------------------------------------------------
// Deduplicator
// ---------------------------------------------------------------------------

describe("deduplicate", () => {
  it("removes exact URL duplicates", () => {
    const items = [
      makeItem("https://example.com/a"),
      makeItem("https://example.com/a"),
      makeItem("https://example.com/b"),
    ];
    const { items: unique, duplicatesRemoved } = deduplicate(items);
    expect(unique.length).toBe(2);
    expect(duplicatesRemoved).toBe(1);
  });

  it("strips utm params when deduping", () => {
    const items = [
      makeItem("https://example.com/post?utm_source=twitter"),
      makeItem("https://example.com/post?utm_source=reddit"),
    ];
    const { items: unique } = deduplicate(items);
    expect(unique.length).toBe(1);
  });

  it("keeps items with distinct URLs", () => {
    const items = [
      makeItem("https://example.com/a"),
      makeItem("https://example.com/b"),
      makeItem("https://example.com/c"),
    ];
    const { items: unique, duplicatesRemoved } = deduplicate(items);
    expect(unique.length).toBe(3);
    expect(duplicatesRemoved).toBe(0);
  });

  it("empty input returns empty", () => {
    const { items, duplicatesRemoved } = deduplicate([]);
    expect(items.length).toBe(0);
    expect(duplicatesRemoved).toBe(0);
  });
});

describe("deduplicateAcrossSources", () => {
  it("deduplicates same URL from two sources", () => {
    const url = "https://shared.com/article";
    const result = deduplicateAcrossSources([
      { source: "hacker-news", items: [makeItem(url)] },
      { source: "professional-blogs", items: [makeItem(url)] },
    ]);
    expect(result.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Research Store
// ---------------------------------------------------------------------------

describe("ResearchStore", () => {
  let store: ResearchStore;

  beforeEach(() => {
    store = new ResearchStore();
  });

  it("save and get round-trip", () => {
    const session: ResearchSession = makeSession("s1");
    store.save(session);
    expect(store.get("s1")).toBe(session);
  });

  it("list returns sessions newest-first", () => {
    const s1 = makeSession("s1", "2025-01-01T00:00:00.000Z");
    const s2 = makeSession("s2", "2025-06-01T00:00:00.000Z");
    store.save(s1);
    store.save(s2);
    const list = store.list();
    expect(list[0]!.sessionId).toBe("s2");
  });

  it("latest returns most recent", () => {
    store.save(makeSession("s1", "2025-01-01T00:00:00.000Z"));
    store.save(makeSession("s2", "2025-06-01T00:00:00.000Z"));
    expect(store.latest()!.sessionId).toBe("s2");
  });

  it("size tracks count", () => {
    expect(store.size()).toBe(0);
    store.save(makeSession("s1"));
    expect(store.size()).toBe(1);
  });

  it("clear empties store", () => {
    store.save(makeSession("s1"));
    store.clear();
    expect(store.size()).toBe(0);
  });

  it("completed filters by status", () => {
    store.save({ ...makeSession("s1"), status: "running" });
    store.save({ ...makeSession("s2"), status: "completed" });
    store.save({ ...makeSession("s3"), status: "partial" });
    expect(store.completed().length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Research Runner (mocked network)
// ---------------------------------------------------------------------------

describe("ResearchRunner", () => {
  it("constructs without crashing", () => {
    const runner = new ResearchRunner();
    expect(runner.researchStore.size()).toBe(0);
  });

  it("run returns a ResearchSession with correct sessionId", async () => {
    // Mock all collectors to return empty (no network calls in tests)
    const runner = new ResearchRunner();
    // Stub the registry's collectors to return empty results quickly
    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN Mock",
        collect: async () => ({
          source: "hacker-news" as const,
          items: [makeItem("https://hn.test/1"), makeItem("https://hn.test/2")],
          fetchedAt: new Date().toISOString(),
          errors: [],
        }),
      },
      {
        source: "professional-blogs" as const,
        displayName: "Blogs Mock",
        collect: async () => ({
          source: "professional-blogs" as const,
          items: [makeItem("https://blog.test/a"), makeItem("https://hn.test/1")],  // hn.test/1 is a dup
          fetchedAt: new Date().toISOString(),
          errors: [],
        }),
      },
    ]);

    const session = await runner.run({ preset: "30d" });
    expect(session.sessionId).toMatch(/^session_/);
    expect(session.status).toBe("completed");
    expect(session.period.label).toContain("30");
    expect(session.totalItemsCollected).toBe(4);
    expect(session.totalItemsAfterDedup).toBe(3);  // hn.test/1 was dup
    expect(session.completedAt).not.toBeNull();
  }, 10_000);

  it("run handles one source failing without stopping others", async () => {
    const runner = new ResearchRunner();
    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN Mock",
        collect: async () => { throw new Error("network timeout"); },
      },
      {
        source: "professional-blogs" as const,
        displayName: "Blogs Mock",
        collect: async () => ({
          source: "professional-blogs" as const,
          items: [makeItem("https://blog.test/good")],
          fetchedAt: new Date().toISOString(),
          errors: [],
        }),
      },
    ]);

    const session = await runner.run({ preset: "7d" });
    expect(session.failedSources).toContain("hacker-news");
    expect(session.successfulSources).toContain("professional-blogs");
    expect(session.status).toBe("partial");
    expect(session.totalItemsCollected).toBe(1);
  }, 10_000);

  it("run stores session in researchStore", async () => {
    const runner = new ResearchRunner();
    vi.spyOn(runner["registry"], "list").mockReturnValue([]);
    const session = await runner.run();
    expect(runner.researchStore.get(session.sessionId)).toBe(session);
  });

  it("run with custom period uses correct since", async () => {
    const runner = new ResearchRunner();
    const since = "2025-01-01T00:00:00.000Z";
    vi.spyOn(runner["registry"], "list").mockReturnValue([]);
    const session = await runner.run({ since });
    expect(session.period.since).toBe(since);
  });

  it("onSourceComplete callback fires per source", async () => {
    const runner = new ResearchRunner();
    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => ({ source: "hacker-news" as const, items: [], fetchedAt: "", errors: [] }),
      },
    ]);

    const calls: string[] = [];
    await runner.run({ onSourceComplete: (src) => { calls.push(src); } });
    expect(calls).toContain("hacker-news");
  });

  it("all sources failed → status is 'failed'", async () => {
    const runner = new ResearchRunner();
    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => { throw new Error("boom"); },
      },
    ]);

    const session = await runner.run();
    expect(session.status).toBe("failed");
  });

  it("sourceStats populated for each source", async () => {
    const runner = new ResearchRunner();
    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => ({
          source: "hacker-news" as const,
          items: [makeItem("https://hn.test/x")],
          fetchedAt: "",
          errors: [],
        }),
      },
    ]);

    const session = await runner.run();
    expect(session.sourceStats.length).toBe(1);
    expect(session.sourceStats[0]!.source).toBe("hacker-news");
    expect(session.sourceStats[0]!.itemsCollected).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeSession(id: string, startedAt = new Date().toISOString()): ResearchSession {
  return {
    sessionId: id,
    period: researchPeriodFromPreset("30d"),
    startedAt,
    completedAt: new Date().toISOString(),
    status: "completed",
    totalItemsCollected: 5,
    totalItemsAfterDedup: 4,
    totalSignalsExtracted: 3,
    totalOpportunitiesUpserted: 1,
    durationMs: 500,
    sourceStats: [],
    successfulSources: ["hacker-news"],
    failedSources: [],
    errors: [],
  };
}
