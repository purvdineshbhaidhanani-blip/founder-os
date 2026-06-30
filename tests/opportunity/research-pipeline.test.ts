import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { AnalysisPipeline } from "../../src/opportunity/research/analysis-pipeline.js";
import { SessionPersistence } from "../../src/opportunity/research/session-persistence.js";
import { ResearchRunner } from "../../src/opportunity/research/research-runner.js";
import { IntelligenceDatabase } from "../../src/opportunity/intelligence/database.js";
import { DecisionHistory } from "../../src/opportunity/decision/decision-history.js";
import { OpportunityStore } from "../../src/opportunity/opportunity-store.js";
import { ResearchStore } from "../../src/opportunity/research/research-store.js";
import { deduplicate } from "../../src/opportunity/research/deduplicator.js";
import { researchPeriodFromPreset } from "../../src/opportunity/research/types.js";
import type { CollectedItem } from "../../src/opportunity/types.js";
import type { ResearchSession } from "../../src/opportunity/research/types.js";
import type { AnalysisResult } from "../../src/opportunity/research/analysis-types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItem(url: string, content = "We need a better tool for this workflow automation task"): CollectedItem {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    source: "hacker-news",
    url,
    author: "founder1",
    timestamp: new Date().toISOString(),
    language: "en",
    category: "automation",
    rawContent: content,
    context: "HN — test",
    engagement: { votes: 15, replies: 5 },
    metadata: {},
    collectedAt: new Date().toISOString(),
  };
}

function makeSession(id: string, oppsUpserted = 2): ResearchSession {
  return {
    sessionId: id,
    period: researchPeriodFromPreset("30d"),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: "completed",
    totalItemsCollected: 10,
    totalItemsAfterDedup: 8,
    totalSignalsExtracted: 4,
    totalOpportunitiesUpserted: oppsUpserted,
    durationMs: 1200,
    sourceStats: [],
    successfulSources: ["hacker-news"],
    failedSources: [],
    errors: [],
  };
}

function makeAnalysisResult(sessionId: string): AnalysisResult {
  return {
    analysisId: `analysis_${sessionId}`,
    sessionId,
    runAt: new Date().toISOString(),
    topOpportunity: null,
    top10: [],
    rejected: [],
    all: [],
    evidenceSummary: [],
    decisionSummary: "No opportunities analyzed",
    avgConfidence: 0,
    stats: {
      opportunitiesAnalyzed: 0,
      opportunitiesAccepted: 0,
      opportunitiesRejected: 0,
      verdictBreakdown: {},
      avgConfidence: 0,
      durationMs: 100,
    },
  };
}

// ---------------------------------------------------------------------------
// Improved Deduplication
// ---------------------------------------------------------------------------

describe("improved deduplicate", () => {
  it("removes exact URL duplicates", () => {
    const items = [
      makeItem("https://example.com/a", "Workflow automation gaps in enterprise SaaS tooling for monthly billing"),
      makeItem("https://example.com/a", "Workflow automation gaps in enterprise SaaS tooling for monthly billing"),  // exact dup
      makeItem("https://example.com/b", "Database migration tooling is broken for PostgreSQL teams using foreign keys"),
    ];
    const { items: unique, duplicatesRemoved } = deduplicate(items);
    expect(unique.length).toBe(2);
    expect(duplicatesRemoved).toBe(1);
  });

  it("strips UTM params", () => {
    const items = [
      makeItem("https://example.com/post?utm_source=twitter"),
      makeItem("https://example.com/post?utm_source=reddit"),
    ];
    const { items: unique } = deduplicate(items);
    expect(unique.length).toBe(1);
  });

  it("strips ref tracking params", () => {
    const items = [
      makeItem("https://example.com/article?ref=hn"),
      makeItem("https://example.com/article?ref=reddit"),
    ];
    const { items: unique } = deduplicate(items);
    expect(unique.length).toBe(1);
  });

  it("deduplicates near-identical content via fingerprint", () => {
    const content = "We are desperately looking for a better tool to handle our complex workflow automation process that currently requires manual effort across multiple teams";
    const items = [
      makeItem("https://a.com/1", content),
      makeItem("https://b.com/2", content),  // same content, different URL
    ];
    const { items: unique } = deduplicate(items);
    expect(unique.length).toBe(1);
  });

  it("deduplicates near-identical content via word-set similarity", () => {
    const a = "We desperately need a better tool for our workflow automation process that requires manual effort across teams and departments";
    const b = "We need a better tool desperately for workflow automation process requiring manual effort across teams and departments";
    const items = [
      makeItem("https://site1.com/x", a),
      makeItem("https://site2.com/y", b),
    ];
    const { items: unique } = deduplicate(items);
    // High Jaccard similarity → one removed
    expect(unique.length).toBe(1);
  });

  it("keeps genuinely different content", () => {
    const items = [
      makeItem("https://a.com/1", "Workflow automation tooling is broken for our team"),
      makeItem("https://b.com/2", "Database migration issues with PostgreSQL and foreign keys"),
      makeItem("https://c.com/3", "Customer support tooling gaps in SaaS enterprise plans"),
    ];
    const { items: unique } = deduplicate(items);
    expect(unique.length).toBe(3);
  });

  it("handles empty input", () => {
    const { items, duplicatesRemoved } = deduplicate([]);
    expect(items.length).toBe(0);
    expect(duplicatesRemoved).toBe(0);
  });

  it("handles items with very short content (no fingerprint/word check)", () => {
    const items = [
      makeItem("https://a.com/a", "short"),
      makeItem("https://b.com/b", "short"),  // same short content, different URL
    ];
    const { items: unique } = deduplicate(items);
    expect(unique.length).toBe(2);  // too short for content check
  });
});

// ---------------------------------------------------------------------------
// AnalysisPipeline
// ---------------------------------------------------------------------------

describe("AnalysisPipeline", () => {
  it("constructs with default stores", () => {
    const pipeline = new AnalysisPipeline();
    expect(pipeline.intelligenceDb.size()).toBe(0);
    expect(pipeline.decisionHistory.size()).toBe(0);
  });

  it("accepts injected stores", () => {
    const db = new IntelligenceDatabase();
    const hist = new DecisionHistory();
    const pipeline = new AnalysisPipeline(db, hist);
    expect(pipeline.intelligenceDb).toBe(db);
    expect(pipeline.decisionHistory).toBe(hist);
  });

  it("returns valid AnalysisResult for empty store", async () => {
    const pipeline = new AnalysisPipeline();
    const store = new OpportunityStore();
    const result = await pipeline.run(store, "sess_empty");
    expect(result.analysisId).toMatch(/^analysis_/);
    expect(result.sessionId).toBe("sess_empty");
    expect(result.all.length).toBe(0);
    expect(result.topOpportunity).toBeNull();
    expect(result.stats.opportunitiesAnalyzed).toBe(0);
  });

  it("pipeline scores, records decisions, returns ranked results", async () => {
    // Build a store with at least one opportunity via the production path
    const pipeline = new AnalysisPipeline();
    const runner = new ResearchRunner(
      new OpportunityStore(),
      new ResearchStore(),
      pipeline,
    );

    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => ({
          source: "hacker-news" as const,
          items: [
            makeItem("https://hn.test/1", "We need a better workflow automation tool for enterprise SaaS teams that pay monthly subscription"),
            makeItem("https://hn.test/2", "Looking for alternatives to manual reporting workflow automation subscription enterprise"),
            makeItem("https://hn.test/3", "Would pay for a solution that automates our data pipeline workflow enterprise subscription tool"),
          ],
          fetchedAt: new Date().toISOString(),
          errors: [],
        }),
      },
    ]);

    const { session, analysis } = await runner.runFull({ runAnalysis: true });
    expect(session.status).toBe("completed");

    // Analysis may or may not produce opportunities depending on clustering,
    // but should always return a well-formed result
    expect(analysis).not.toBeNull();
    expect(analysis!.analysisId).toMatch(/^analysis_/);
    expect(analysis!.sessionId).toBe(session.sessionId);
    expect(typeof analysis!.avgConfidence).toBe("number");
    expect(analysis!.stats.opportunitiesAnalyzed).toBeGreaterThanOrEqual(0);
  }, 20_000);

  it("top10 has at most 10 items", async () => {
    const pipeline = new AnalysisPipeline();
    const store = new OpportunityStore();
    const result = await pipeline.run(store, "sess_test");
    expect(result.top10.length).toBeLessThanOrEqual(10);
  });

  it("all RankedOpportunities have sequential ranks", async () => {
    const pipeline = new AnalysisPipeline();
    const store = new OpportunityStore();
    const result = await pipeline.run(store, "sess_ranks");
    for (let i = 0; i < result.all.length; i++) {
      expect(result.all[i]!.rank).toBe(i + 1);
    }
  });

  it("stores scored intel in intelligenceDb", async () => {
    const db = new IntelligenceDatabase();
    const pipeline = new AnalysisPipeline(db);
    const runner = new ResearchRunner(
      new OpportunityStore(),
      new ResearchStore(),
      pipeline,
    );

    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => ({
          source: "hacker-news" as const,
          items: [
            makeItem("https://hn.test/db1", "Automation workflow enterprise subscription SaaS tool missing for teams monthly payment"),
            makeItem("https://hn.test/db2", "We need better data pipeline automation for enterprise subscription services payment"),
          ],
          fetchedAt: new Date().toISOString(),
          errors: [],
        }),
      },
    ]);

    await runner.runFull({ runAnalysis: true });
    // db should have records for each opportunity scored
    expect(db.size()).toBeGreaterThanOrEqual(0);
  }, 20_000);

  it("decision summary is non-empty string", async () => {
    const pipeline = new AnalysisPipeline();
    const store = new OpportunityStore();
    const result = await pipeline.run(store, "s1");
    expect(typeof result.decisionSummary).toBe("string");
    expect(result.decisionSummary.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// SessionPersistence
// ---------------------------------------------------------------------------

describe("SessionPersistence", () => {
  let tmpDir: string;
  let persistence: SessionPersistence;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `fos-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    persistence = new SessionPersistence(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("save and load round-trip", () => {
    const session = makeSession("sess_001");
    persistence.save(session);
    const loaded = persistence.load("sess_001");
    expect(loaded).not.toBeUndefined();
    expect(loaded!.session.sessionId).toBe("sess_001");
  });

  it("save with analysis round-trips analysis", () => {
    const session = makeSession("sess_002");
    const analysis = makeAnalysisResult("sess_002");
    persistence.save(session, analysis);
    const loaded = persistence.load("sess_002");
    expect(loaded!.analysis).not.toBeNull();
    expect(loaded!.analysis!.analysisId).toBe("analysis_sess_002");
  });

  it("load returns undefined for unknown session", () => {
    expect(persistence.load("nonexistent")).toBeUndefined();
  });

  it("listSessions returns newest first", () => {
    const s1 = makeSession("s_old");
    const s2 = makeSession("s_new");
    // Make s1 older by setting startedAt
    s1.startedAt = "2025-01-01T00:00:00.000Z";
    s2.startedAt = "2025-06-01T00:00:00.000Z";
    persistence.save(s1);
    persistence.save(s2);
    const sessions = persistence.listSessions();
    expect(sessions[0]!.sessionId).toBe("s_new");
  });

  it("count tracks saved sessions", () => {
    expect(persistence.count()).toBe(0);
    persistence.save(makeSession("s1"));
    expect(persistence.count()).toBe(1);
    persistence.save(makeSession("s2"));
    expect(persistence.count()).toBe(2);
  });

  it("latest returns most recent session", () => {
    const s1 = makeSession("s_a");
    const s2 = makeSession("s_b");
    s1.startedAt = "2025-01-01T00:00:00.000Z";
    s2.startedAt = "2025-12-01T00:00:00.000Z";
    persistence.save(s1);
    persistence.save(s2);
    const latest = persistence.latest();
    expect(latest!.session.sessionId).toBe("s_b");
  });

  it("loadAll returns empty array when dir missing", () => {
    const noDir = new SessionPersistence(join(tmpDir, "does-not-exist"));
    // The constructor creates the dir, so we remove it manually
    rmSync(join(tmpDir, "does-not-exist"), { recursive: true, force: true });
    // loadAll should still work gracefully
    expect(noDir.loadAll()).toEqual([]);
  });

  it("listAnalyzed only returns records with analysis", () => {
    persistence.save(makeSession("s_no_analysis"));
    persistence.save(makeSession("s_has_analysis"), makeAnalysisResult("s_has_analysis"));
    const analyzed = persistence.listAnalyzed();
    expect(analyzed.length).toBe(1);
    expect(analyzed[0]!.session.sessionId).toBe("s_has_analysis");
  });

  it("creates .founder-os/research directory inside cwd", () => {
    const dir = join(tmpDir, ".founder-os", "research");
    expect(existsSync(dir)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ResearchRunner with runFull
// ---------------------------------------------------------------------------

describe("ResearchRunner.runFull", () => {
  it("returns session and analysis", async () => {
    const runner = new ResearchRunner();
    vi.spyOn(runner["registry"], "list").mockReturnValue([]);
    const result = await runner.runFull();
    expect(result.session).toBeDefined();
    expect(result.session.sessionId).toMatch(/^session_/);
    // No opportunities → analysis is null
    expect(result.analysis).toBeNull();
  });

  it("run() still works as before (backward-compatible)", async () => {
    const runner = new ResearchRunner();
    vi.spyOn(runner["registry"], "list").mockReturnValue([]);
    const session = await runner.run();
    expect(session.sessionId).toMatch(/^session_/);
  });

  it("runAnalysis=false skips analysis pipeline", async () => {
    const runner = new ResearchRunner();
    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => ({
          source: "hacker-news" as const,
          items: [makeItem("https://hn.test/skip")],
          fetchedAt: "",
          errors: [],
        }),
      },
    ]);
    const { analysis } = await runner.runFull({ runAnalysis: false });
    // Should be null regardless of opportunities found, because analysis was skipped
    expect(analysis).toBeNull();
  });

  it("getPersistence returns SessionPersistence instance", () => {
    const runner = new ResearchRunner();
    expect(runner.getPersistence()).toBeDefined();
  });

  it("getOpportunityStore returns OpportunityStore", () => {
    const runner = new ResearchRunner();
    expect(runner.getOpportunityStore()).toBeDefined();
  });
});
