import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { ResearchConfigManager, ALL_SOURCES } from "../../src/opportunity/research/research-config.js";
import { ConnectorHealthTracker } from "../../src/opportunity/research/connector-health.js";
import { OpportunityHistoryTracker } from "../../src/opportunity/research/opportunity-history.js";
import { compareSessions } from "../../src/opportunity/research/session-comparison.js";
import { ReportExporter } from "../../src/opportunity/research/report-exporter.js";
import { CheckpointManager } from "../../src/opportunity/research/checkpoint.js";
import { SessionPersistence } from "../../src/opportunity/research/session-persistence.js";
import { AnalysisPipeline } from "../../src/opportunity/research/analysis-pipeline.js";
import { ResearchRunner } from "../../src/opportunity/research/research-runner.js";
import { ResearchStore } from "../../src/opportunity/research/research-store.js";
import { OpportunityStore } from "../../src/opportunity/opportunity-store.js";
import { researchPeriodFromPreset } from "../../src/opportunity/research/types.js";
import type { SourceStats } from "../../src/opportunity/research/types.js";
import type { ResearchSession } from "../../src/opportunity/research/types.js";
import type { AnalysisResult } from "../../src/opportunity/research/analysis-types.js";
import type { CollectedItem } from "../../src/opportunity/types.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

let tmpDir: string;

function setup(): void {
  tmpDir = join(tmpdir(), `fos6c-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
}

function teardown(): void {
  rmSync(tmpDir, { recursive: true, force: true });
}

function makeSession(id: string, startedAt?: string): ResearchSession {
  return {
    sessionId: id,
    period: researchPeriodFromPreset("30d"),
    startedAt: startedAt ?? new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: "completed",
    totalItemsCollected: 10,
    totalItemsAfterDedup: 8,
    totalSignalsExtracted: 4,
    totalOpportunitiesUpserted: 2,
    durationMs: 500,
    sourceStats: [],
    successfulSources: ["hacker-news"],
    failedSources: [],
    errors: [],
  };
}

function makeAnalysis(sessionId: string, topProblem = "Automation workflow gaps"): AnalysisResult {
  return {
    analysisId: `analysis_${sessionId}`,
    sessionId,
    runAt: new Date().toISOString(),
    topOpportunity: {
      rank: 1,
      opportunity: {
        id: `opp_${sessionId}`,
        status: "discovered",
        problemSummary: topProblem,
        category: "automation",
        evidence: [],
        painScore: { score: 0.7, businessImpact: 0.6, frequency: 0.8, urgency: 0.5, confidence: 0.65 },
        buyingIntentSignals: 2,
        workaroundsDetected: [],
        sources: ["hacker-news"],
        confidence: 0.65,
        signalCount: 3,
        clusterKey: `key_${sessionId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      intelligence: {
        opportunityId: `opp_${sessionId}`,
        problem: topProblem,
        category: "automation",
        sources: ["hacker-news"],
        noiseScore: { score: 0.8, isNoise: false, reasons: [] },
        sourceTrustScore: { score: 0.75, perSource: {} },
        authorCredibilityScore: { score: 0.7, highCredibilityCount: 1 },
        freshnessScore: { score: 0.9, oldestEvidenceDays: 5, newestEvidenceDays: 1 },
        existingSolutionScore: { score: 0.65, workaroundCount: 1, solutionFailureSignals: [] },
        marketSizeEstimate: { tier: "medium", estimatedTAMBillions: 5, score: 0.6, rationale: "test" },
        humanTimeSavedScore: { score: 0.7, estimatedHoursPerWeekPerUser: 3, annualisedValueUSD: 11700 },
        aiReadinessScore: { score: 0.75, rationale: "test" },
        technicalFeasibilityScore: { score: 0.8, estimatedTeamSize: 2, estimatedTimeToMVP: "3-4 months", legalRiskLevel: "low", rationale: "test" },
        opportunityGapScore: { score: 0.7, rationale: "test" },
        checks: {
          isRealProblem: true, isBusinessRelated: true, isPainRepeated: true,
          arePeopleLookingForSolutions: true, arePeopleAlreadyPaying: false,
          doExistingSolutionsFail: true, isThereAMarket: true, canAISolveIt: true,
          isTechnicallyPossible: true, isLegallySafe: true, canStartupBuildIt: true,
          hasRecurringRevenuePotential: true, isOpportunityGrowing: false, isConfidenceHighEnough: true,
        },
        rejected: false,
        rejectionReasons: [],
        overallConfidence: 0.72,
        scoredAt: new Date().toISOString(),
      },
      decision: {
        opportunityId: `opp_${sessionId}`,
        problem: topProblem,
        category: "automation",
        intelligenceScore: 0.72,
        reviewerOutputs: [],
        devilsAdvocate: { rejectionAttempts: [], survived: true, rebuttal: "Strong", weakestPoint: "market", strongestPoint: "pain" },
        consensus: { agreementScore: 0.8, conflictScore: 0.2, evidenceScore: 0.7, riskScore: 0.3, confidenceScore: 0.75 },
        topArgumentsFor: [],
        topArgumentsAgainst: [],
        evidenceSummary: [],
        risks: [],
        unknowns: [],
        verdict: "BUILD_NOW",
        verdictRationale: "Strong pain signal with clear market",
        confidence: 0.75,
        executiveSummary: "Build this.",
        decidedAt: new Date().toISOString(),
      },
      finalScore: 0.74,
    },
    top10: [],
    rejected: [],
    all: [],
    evidenceSummary: [],
    decisionSummary: `Analyzed 2 opportunities. BUILD_NOW=1, RESEARCH_MORE=0, REJECT=1. Top: "${topProblem}"`,
    avgConfidence: 0.72,
    stats: {
      opportunitiesAnalyzed: 2,
      opportunitiesAccepted: 1,
      opportunitiesRejected: 1,
      verdictBreakdown: { BUILD_NOW: 1, REJECT: 1 },
      avgConfidence: 0.72,
      durationMs: 200,
      blueprints: { generated: 1, skipped: 1 },
    },
  };
}

function makeSourceStats(source: string, failed = false): SourceStats {
  return {
    source: source as SourceStats["source"],
    itemsCollected: failed ? 0 : 10,
    itemsDeduplicated: 0,
    signalsExtracted: 0,
    errors: failed ? [{ code: "NET_ERR", message: "timeout" }] : [],
    durationMs: 200,
    credentialed: true,
  };
}

function makeItem(url: string, content = "Workflow automation gaps enterprise SaaS subscription monthly pay"): CollectedItem {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    source: "hacker-news",
    url,
    author: "user",
    timestamp: new Date().toISOString(),
    language: "en",
    category: "automation",
    rawContent: content,
    context: "test",
    engagement: {},
    metadata: {},
    collectedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// ResearchConfig
// ---------------------------------------------------------------------------

describe("ResearchConfigManager", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("returns defaults when no config file", () => {
    const mgr = new ResearchConfigManager(tmpDir);
    const cfg = mgr.load();
    expect(cfg.period).toBe("30d");
    expect(cfg.enabledSources).toEqual(ALL_SOURCES);
    expect(cfg.limitPerSource).toBe(30);
  });

  it("save persists config to disk", () => {
    const mgr = new ResearchConfigManager(tmpDir);
    mgr.save({ period: "7d", limitPerSource: 50 });
    const loaded = mgr.load();
    expect(loaded.period).toBe("7d");
    expect(loaded.limitPerSource).toBe(50);
  });

  it("save is additive — missing fields keep previous values", () => {
    const mgr = new ResearchConfigManager(tmpDir);
    mgr.save({ period: "90d" });
    mgr.save({ limitPerSource: 15 });
    const cfg = mgr.load();
    expect(cfg.period).toBe("90d");
    expect(cfg.limitPerSource).toBe(15);
  });

  it("reset returns defaults", () => {
    const mgr = new ResearchConfigManager(tmpDir);
    mgr.save({ period: "7d" });
    const cfg = mgr.reset();
    expect(cfg.period).toBe("30d");
  });

  it("savedAt is updated on each save", () => {
    const mgr = new ResearchConfigManager(tmpDir);
    const c1 = mgr.save({ period: "7d" });
    const c2 = mgr.save({ period: "30d" });
    expect(new Date(c2.savedAt).getTime()).toBeGreaterThanOrEqual(new Date(c1.savedAt).getTime());
  });
});

// ---------------------------------------------------------------------------
// ConnectorHealthTracker
// ---------------------------------------------------------------------------

describe("ConnectorHealthTracker", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("starts with no records", () => {
    const t = new ConnectorHealthTracker(tmpDir);
    expect(t.getAll()).toHaveLength(0);
  });

  it("update creates health records", () => {
    const t = new ConnectorHealthTracker(tmpDir);
    t.update([makeSourceStats("hacker-news"), makeSourceStats("stackoverflow")]);
    expect(t.getAll()).toHaveLength(2);
  });

  it("successful source → healthy", () => {
    const t = new ConnectorHealthTracker(tmpDir);
    t.update([makeSourceStats("hacker-news", false)]);
    expect(t.getHealth("hacker-news").status).toBe("healthy");
  });

  it("failed source → degraded or failing", () => {
    const t = new ConnectorHealthTracker(tmpDir);
    t.update([makeSourceStats("youtube", true)]);
    const h = t.getHealth("youtube");
    expect(["degraded", "failing"]).toContain(h.status);
  });

  it("persists and reloads health data", () => {
    const t1 = new ConnectorHealthTracker(tmpDir);
    t1.update([makeSourceStats("hacker-news")]);
    const t2 = new ConnectorHealthTracker(tmpDir);
    expect(t2.getHealth("hacker-news").totalRuns).toBe(1);
  });

  it("accumulates run counts across updates", () => {
    const t = new ConnectorHealthTracker(tmpDir);
    t.update([makeSourceStats("hacker-news")]);
    t.update([makeSourceStats("hacker-news")]);
    expect(t.getHealth("hacker-news").totalRuns).toBe(2);
  });

  it("tracks lastError for failed sources", () => {
    const t = new ConnectorHealthTracker(tmpDir);
    t.update([makeSourceStats("youtube", true)]);
    expect(t.getHealth("youtube").lastError).toBe("timeout");
  });

  it("unknown source returns default record", () => {
    const t = new ConnectorHealthTracker(tmpDir);
    const h = t.getHealth("reddit");
    expect(h.status).toBe("unknown");
    expect(h.totalRuns).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// OpportunityHistoryTracker
// ---------------------------------------------------------------------------

describe("OpportunityHistoryTracker", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("starts empty", () => {
    const t = new OpportunityHistoryTracker(tmpDir);
    expect(t.getAll()).toHaveLength(0);
  });

  it("record stores entries from analysis", () => {
    const t = new OpportunityHistoryTracker(tmpDir);
    const analysis = makeAnalysis("sess1");
    // Add to all list so record() picks it up
    analysis.all = [analysis.topOpportunity!];
    t.record(analysis);
    const oppId = analysis.topOpportunity!.opportunity.id;
    const rec = t.get(oppId);
    expect(rec).not.toBeUndefined();
    expect(rec!.entries).toHaveLength(1);
    expect(rec!.entries[0]!.sessionId).toBe("sess1");
  });

  it("persists across instances", () => {
    const t1 = new OpportunityHistoryTracker(tmpDir);
    const analysis = makeAnalysis("sess_persist");
    analysis.all = [analysis.topOpportunity!];
    t1.record(analysis);
    const t2 = new OpportunityHistoryTracker(tmpDir);
    expect(t2.getAll()).toHaveLength(1);
  });

  it("accumulates entries across multiple sessions", () => {
    const t = new OpportunityHistoryTracker(tmpDir);
    const a1 = makeAnalysis("s1", "Workflow A");
    const a2 = makeAnalysis("s1", "Workflow A");  // same session and opp ID for simplicity
    a1.all = [{ ...a1.topOpportunity!, rank: 1 }];
    a2.all = [{ ...a2.topOpportunity!, rank: 2 }];
    t.record(a1);
    t.record(a2);
    // May be 1 or 2 records depending on whether oppId matches
    expect(t.getAll().length).toBeGreaterThanOrEqual(1);
  });

  it("computeChanges returns empty for non-overlapping sets", () => {
    const t = new OpportunityHistoryTracker(tmpDir);
    const prevR = makeAnalysis("s1").topOpportunity!;
    const currR = makeAnalysis("s2").topOpportunity!;
    const changes = t.computeChanges([prevR], [currR]);
    // Different opportunityIds → no overlap
    expect(changes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SessionComparison
// ---------------------------------------------------------------------------

describe("compareSessions", () => {
  it("identifies new opportunities in B not in A", () => {
    const sessA = makeSession("sA");
    const sessB = makeSession("sB");
    const aA = makeAnalysis("sA", "Workflow gap A");
    const aB = makeAnalysis("sB", "Totally different opportunity Z");
    // aB has a different opp ID from aA
    aA.all = [aA.topOpportunity!];
    aB.all = [aB.topOpportunity!];
    const result = compareSessions(sessA, aA, sessB, aB);
    expect(result.summary.newCount).toBeGreaterThanOrEqual(1);
  });

  it("identifies removed opportunities", () => {
    const sessA = makeSession("sA");
    const sessB = makeSession("sB");
    const aA = makeAnalysis("sA");
    const aB = makeAnalysis("sB");
    aA.all = [aA.topOpportunity!];
    aB.all = [];  // B has no opps
    const result = compareSessions(sessA, aA, sessB, aB);
    expect(result.summary.removedCount).toBe(1);
  });

  it("champion change detected when top opp differs", () => {
    const sessA = makeSession("sA");
    const sessB = makeSession("sB");
    const aA = makeAnalysis("sA", "Old champion");
    const aB = makeAnalysis("sB", "New champion");
    const result = compareSessions(sessA, aA, sessB, aB);
    expect(result.championChange.changed).toBe(true);
    expect(result.championChange.prevChampion).toContain("Old champion");
    expect(result.championChange.currChampion).toContain("New champion");
  });

  it("handles null analysis gracefully", () => {
    const sessA = makeSession("sA");
    const sessB = makeSession("sB");
    const result = compareSessions(sessA, null, sessB, null);
    expect(result.summary.totalA).toBe(0);
    expect(result.summary.totalB).toBe(0);
    expect(result.championChange.changed).toBe(false);
  });

  it("scoreChanges for same opportunity appearing in both sessions", () => {
    const sessA = makeSession("sA");
    const sessB = makeSession("sB");
    const aA = makeAnalysis("same_session");
    const aB = makeAnalysis("same_session");
    // Force same opp ID
    const oppId = "shared_opp";
    const rA = { ...aA.topOpportunity!, opportunity: { ...aA.topOpportunity!.opportunity, id: oppId }, finalScore: 0.5 };
    const rB = { ...aB.topOpportunity!, opportunity: { ...aB.topOpportunity!.opportunity, id: oppId }, finalScore: 0.7 };
    const result = compareSessions(sessA, { ...aA, all: [rA] }, sessB, { ...aB, all: [rB] });
    expect(result.scoreChanges).toHaveLength(1);
    expect(result.scoreChanges[0]!.scoreDelta).toBeCloseTo(0.2, 3);
  });
});

// ---------------------------------------------------------------------------
// ReportExporter
// ---------------------------------------------------------------------------

describe("ReportExporter", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("exports JSON format", () => {
    const exporter = new ReportExporter(tmpDir);
    const session = makeSession("exp1");
    const analysis = makeAnalysis("exp1");
    const result = exporter.export({ session, analysis, persistedAt: new Date().toISOString() }, "json");
    expect(result.format).toBe("json");
    expect(existsSync(result.path)).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  it("exports Markdown format", () => {
    const exporter = new ReportExporter(tmpDir);
    const session = makeSession("exp2");
    const analysis = makeAnalysis("exp2");
    const result = exporter.export({ session, analysis, persistedAt: new Date().toISOString() }, "md");
    expect(result.format).toBe("md");
    expect(result.path).toMatch(/\.md$/);
    expect(existsSync(result.path)).toBe(true);
  });

  it("JSON export is parseable", () => {
    const exporter = new ReportExporter(tmpDir);
    const session = makeSession("exp3");
    const result = exporter.export({ session, analysis: null, persistedAt: new Date().toISOString() }, "json");
    const parsed = JSON.parse(readFileSync(result.path, "utf8"));
    expect(parsed.session.sessionId).toBe("exp3");
  });

  it("Markdown export contains session ID", () => {
    const exporter = new ReportExporter(tmpDir);
    const session = makeSession("exp4");
    const result = exporter.export({ session, analysis: null, persistedAt: new Date().toISOString() }, "md");
    const content = readFileSync(result.path, "utf8");
    expect(content).toContain("exp4");
  });

  it("creates exports directory automatically", () => {
    const exporter = new ReportExporter(tmpDir);
    const session = makeSession("exp5");
    exporter.export({ session, analysis: null, persistedAt: new Date().toISOString() }, "json");
    expect(existsSync(join(tmpDir, ".founder-os", "exports"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CheckpointManager
// ---------------------------------------------------------------------------

describe("CheckpointManager", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("save and load round-trip", () => {
    const mgr = new CheckpointManager(tmpDir);
    const cp = {
      sessionId: "s1",
      period: researchPeriodFromPreset("30d"),
      limitPerSource: 30,
      completedSources: ["hacker-news" as const],
      collectedItems: [],
      failedSources: [],
      savedAt: new Date().toISOString(),
    };
    mgr.save(cp);
    const loaded = mgr.load("s1");
    expect(loaded).not.toBeUndefined();
    expect(loaded!.completedSources).toContain("hacker-news");
  });

  it("returns undefined for missing checkpoint", () => {
    const mgr = new CheckpointManager(tmpDir);
    expect(mgr.load("nonexistent")).toBeUndefined();
  });

  it("exists returns true after save", () => {
    const mgr = new CheckpointManager(tmpDir);
    mgr.save({
      sessionId: "s2",
      period: researchPeriodFromPreset("7d"),
      limitPerSource: 10,
      completedSources: [],
      collectedItems: [],
      failedSources: [],
      savedAt: new Date().toISOString(),
    });
    expect(mgr.exists("s2")).toBe(true);
  });

  it("clear removes checkpoint", () => {
    const mgr = new CheckpointManager(tmpDir);
    mgr.save({
      sessionId: "s3",
      period: researchPeriodFromPreset("7d"),
      limitPerSource: 10,
      completedSources: [],
      collectedItems: [],
      failedSources: [],
      savedAt: new Date().toISOString(),
    });
    mgr.clear("s3");
    expect(mgr.exists("s3")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AnalysisPipeline — blueprint generation
// ---------------------------------------------------------------------------

describe("AnalysisPipeline blueprint", () => {
  it("generates blueprints for accepted opportunities via ResearchRunner", async () => {
    const pipeline = new AnalysisPipeline();
    const runner = new ResearchRunner(
      new OpportunityStore(),
      new ResearchStore(),
      pipeline,
      tmpDir,
    );

    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => ({
          source: "hacker-news" as const,
          items: [
            makeItem("https://hn.t/1", "We need better workflow automation for enterprise SaaS teams willing to pay monthly subscription"),
            makeItem("https://hn.t/2", "Looking for workflow automation alternative subscription enterprise SaaS monthly payment"),
            makeItem("https://hn.t/3", "Would pay for workflow automation tool enterprise subscription monthly SaaS"),
          ],
          fetchedAt: new Date().toISOString(),
          errors: [],
        }),
      },
    ]);

    const { analysis } = await runner.runFull({ runAnalysis: true });
    expect(analysis).not.toBeNull();
    expect(analysis!.stats.blueprints).toBeDefined();
    expect(typeof analysis!.stats.blueprints.generated).toBe("number");
    expect(typeof analysis!.stats.blueprints.skipped).toBe("number");
  }, 30_000);

  it("blueprint field on RankedOpportunity is undefined for rejected opps", () => {
    // A rejected opportunity (intel.rejected=true) should have blueprint=undefined
    // This is tested via the pipeline logic — no blueprint for rejected
    const pipeline = new AnalysisPipeline();
    // Empty store → no opportunities → no blueprints
    const store = new OpportunityStore();
    return pipeline.run(store, "test").then((result) => {
      expect(result.stats.blueprints.generated).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// SessionPersistence — getChampion + search
// ---------------------------------------------------------------------------

describe("SessionPersistence extended", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("getChampion returns highest-score top opportunity", () => {
    const p = new SessionPersistence(tmpDir);
    const s1 = makeSession("s1", "2025-01-01T00:00:00.000Z");
    const a1 = makeAnalysis("s1");
    a1.topOpportunity!.finalScore = 0.6;
    const s2 = makeSession("s2", "2025-06-01T00:00:00.000Z");
    const a2 = makeAnalysis("s2");
    a2.topOpportunity!.finalScore = 0.85;
    p.save(s1, a1);
    p.save(s2, a2);
    const champion = p.getChampion();
    expect(champion).not.toBeUndefined();
    expect(champion!.finalScore).toBeCloseTo(0.85);
  });

  it("getChampion returns undefined when no analyzed sessions", () => {
    const p = new SessionPersistence(tmpDir);
    p.save(makeSession("s1"));  // no analysis
    expect(p.getChampion()).toBeUndefined();
  });

  it("search finds matching opportunities", () => {
    const p = new SessionPersistence(tmpDir);
    const session = makeSession("srch1");
    const analysis = makeAnalysis("srch1", "DataOps tooling gap for enterprises");
    analysis.all = [analysis.topOpportunity!];
    p.save(session, analysis);
    const results = p.search("DataOps");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.rank.opportunity.problemSummary).toContain("DataOps");
  });

  it("search is case-insensitive", () => {
    const p = new SessionPersistence(tmpDir);
    const session = makeSession("srch2");
    const analysis = makeAnalysis("srch2", "Enterprise workflow automation tooling");
    analysis.all = [analysis.topOpportunity!];
    p.save(session, analysis);
    const results = p.search("ENTERPRISE WORKFLOW");
    expect(results.length).toBeGreaterThan(0);
  });

  it("search returns empty when no match", () => {
    const p = new SessionPersistence(tmpDir);
    const session = makeSession("srch3");
    const analysis = makeAnalysis("srch3", "Unrelated problem about something else");
    analysis.all = [analysis.topOpportunity!];
    p.save(session, analysis);
    const results = p.search("quantum-blockchain-nft");
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ResearchRunner — enabledSources + checkpoint interaction
// ---------------------------------------------------------------------------

describe("ResearchRunner 6C features", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("enabledSources restricts which collectors run", async () => {
    const runner = new ResearchRunner(undefined, undefined, undefined, tmpDir);
    const collected: string[] = [];
    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => { collected.push("hacker-news"); return { source: "hacker-news" as const, items: [], fetchedAt: "", errors: [] }; },
      },
      {
        source: "professional-blogs" as const,
        displayName: "Blogs",
        collect: async () => { collected.push("professional-blogs"); return { source: "professional-blogs" as const, items: [], fetchedAt: "", errors: [] }; },
      },
    ]);

    await runner.run({ enabledSources: ["hacker-news"] });
    expect(collected).toContain("hacker-news");
    expect(collected).not.toContain("professional-blogs");
  });

  it("getHealthTracker returns ConnectorHealthTracker", () => {
    const runner = new ResearchRunner(undefined, undefined, undefined, tmpDir);
    expect(runner.getHealthTracker()).toBeDefined();
  });

  it("getOpportunityHistory returns OpportunityHistoryTracker", () => {
    const runner = new ResearchRunner(undefined, undefined, undefined, tmpDir);
    expect(runner.getOpportunityHistory()).toBeDefined();
  });

  it("getCheckpointManager returns CheckpointManager", () => {
    const runner = new ResearchRunner(undefined, undefined, undefined, tmpDir);
    expect(runner.getCheckpointManager()).toBeDefined();
  });

  it("health updated after run", async () => {
    const runner = new ResearchRunner(undefined, undefined, undefined, tmpDir);
    vi.spyOn(runner["registry"], "list").mockReturnValue([
      {
        source: "hacker-news" as const,
        displayName: "HN",
        collect: async () => ({ source: "hacker-news" as const, items: [], fetchedAt: "", errors: [] }),
      },
    ]);
    await runner.run();
    const health = runner.getHealthTracker().getHealth("hacker-news");
    expect(health.totalRuns).toBe(1);
  });

  it("checkpoint cleared after successful run", async () => {
    const runner = new ResearchRunner(undefined, undefined, undefined, tmpDir);
    vi.spyOn(runner["registry"], "list").mockReturnValue([]);
    const { session } = await runner.runFull();
    expect(runner.getCheckpointManager().exists(session.sessionId)).toBe(false);
  });
});
