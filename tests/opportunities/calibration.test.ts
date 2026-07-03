import { describe, expect, it } from "vitest";
import {
  attachCalibration,
  computeAggregateCalibration,
  computeBaseCalibration,
  computeCalibrationDiagnostics,
  computeCalibrationMetrics,
  computeFalsePositive,
  computeThresholdDiagnostic,
  defaultCalibration,
} from "../../src/opportunities/calibration.js";
import { defaultFounderIntelligence } from "../../src/opportunities/founder-intelligence.js";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { OpportunityRepository } from "../../src/opportunities/repository.js";
import { OpportunityEngine } from "../../src/opportunities/engine.js";
import type { FounderReport, Opportunity, RawResearchItem, ResearchSession } from "../../src/research/types.js";
import type { TopOpportunitiesReport } from "../../src/opportunities/types.js";

/* -------------------------------------------------------------------- */
/* Shared real-pipeline harness (mirrors engine.test.ts / semantic.test.ts) */
/* -------------------------------------------------------------------- */

class StubStorage {
  store = new Map<string, string>();
  async write(path: string, content: string) {
    this.store.set(path, content);
  }
  async read(path: string) {
    return this.store.get(path) ?? "";
  }
  async exists(path: string) {
    return this.store.has(path);
  }
}

function harness() {
  const artifacts = new ArtifactManager({ storage: new StubStorage() });
  const memory = new MemoryEngine(new InMemoryStore());
  const clusterRepository = new ClusterRepository({ artifacts, memory });
  const problemEngine = new ProblemIntelligenceEngine({ repository: clusterRepository });
  const opportunityRepository = new OpportunityRepository({ artifacts, memory });
  const opportunityEngine = new OpportunityEngine({ repository: opportunityRepository });
  return { problemEngine, opportunityEngine };
}

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function makeFounderReport(opportunities: Opportunity[]): FounderReport {
  return {
    topOpportunities: opportunities,
    evidence: [],
    confidenceScore: { band: "low", numericScore: 0 },
    sourceCoverage: { used: [], failed: [], skipped: [], ratio: 0 },
    generatedAt: new Date().toISOString(),
  };
}

function makeSession(opportunities: Opportunity[], windowDays = 30): ResearchSession {
  return {
    id: "research_calibration_fixture",
    windowDays,
    startedAt: new Date().toISOString(),
    sourcesUsed: [],
    sourcesFailed: [],
    sourcesSkipped: [],
    opportunities,
    report: makeFounderReport(opportunities),
    totalItemsCollected: opportunities.flatMap((o) => o.supportingItems).length,
    durationMs: 0,
    relevanceFilter: {
      threshold: "normal",
      totalEvaluated: opportunities.flatMap((o) => o.supportingItems).length,
      relevantCount: opportunities.flatMap((o) => o.supportingItems).length,
      uncertainCount: 0,
      notRelevantCount: 3,
      rejectedSamples: [],
    },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A deliberately MIXED fixture: one strong, well-evidenced buying-intent
 * cluster (should land BUILD with high signal density), one thin/echo-chamber
 * complaint cluster (should be flagged Weak Evidence / Low Diversity / maybe
 * Echo Chamber), and one praise-only cluster (never a BUILD candidate). Real
 * numbers are asserted below via console.log per the verification mandate.
 */
function buildMixedFixtureSession(): ResearchSession {
  const now = Date.now();

  const buyingIntentItems: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/bi-1",
      title: "Willing to pay for a better tool than Trello, love the new tool",
      body: "It costs $50 a month and I'd switch immediately",
      sourceId: "reddit",
      author: "alice",
      engagement: 20,
      publishedAt: new Date(now).toISOString(),
    }),
    makeItem({
      url: "https://example.com/bi-2",
      title: "Would pay for this instead of dealing with the current mess",
      sourceId: "hackernews",
      author: "bob",
      engagement: 15,
      publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/bi-3",
      title: "Shut up and take my money, I need this now",
      sourceId: "producthunt",
      author: "carol",
      engagement: 10,
      publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/bi-4",
      title: "Looking to buy something like this for my team",
      sourceId: "reddit",
      author: "dave",
      engagement: 5,
      publishedAt: new Date(now - 3 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/bi-5",
      title: "Where can I buy a tool that solves this properly",
      sourceId: "hackernews",
      author: "erin",
      engagement: 8,
      publishedAt: new Date(now - 20 * DAY_MS).toISOString(),
    }),
  ];

  // Thin, single-source complaint cluster: 2 items, one source, one author
  // repeated — should trip Weak Evidence / Low Diversity / Single-source
  // penalty in FOIS, and is a good false-positive candidate.
  const complaintItems: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/c-1",
      title: "This is so annoying and frustrating to use every day",
      sourceId: "reddit",
      author: "frank",
      publishedAt: new Date(now - 10 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/c-2",
      title: "Terrible experience, hate it, worst tool ever",
      sourceId: "reddit",
      author: "frank",
      publishedAt: new Date(now - 12 * DAY_MS).toISOString(),
    }),
  ];

  const praiseItems: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/p-1",
      title: "I love this, amazing product, highly recommend",
      sourceId: "reddit",
      author: "henry",
    }),
    makeItem({
      url: "https://example.com/p-2",
      title: "Best tool I've used, great job to the team",
      sourceId: "hackernews",
      author: "irene",
    }),
  ];

  const opportunities: Opportunity[] = [
    { id: "opp_bi", title: "Buying intent", summary: "s", keywords: [], supportingItems: buyingIntentItems, sourceIds: ["reddit", "hackernews", "producthunt"] },
    { id: "opp_complaint", title: "Complaints", summary: "s", keywords: [], supportingItems: complaintItems, sourceIds: ["reddit"] },
    { id: "opp_praise", title: "Praise", summary: "s", keywords: [], supportingItems: praiseItems, sourceIds: ["reddit", "hackernews"] },
  ];

  return makeSession(opportunities, 30);
}

async function runPipeline(): Promise<{ topReport: TopOpportunitiesReport; session: ResearchSession }> {
  const session = buildMixedFixtureSession();
  const { problemEngine, opportunityEngine } = harness();
  const problemReport = await problemEngine.analyze(session);
  const topReport = await opportunityEngine.analyze(session, problemReport);
  return { topReport, session };
}

/* -------------------------------------------------------------------- */
/* Part A — per-opportunity metrics                                      */
/* -------------------------------------------------------------------- */

describe("computeCalibrationMetrics", () => {
  it("produces every metric in its documented 0-1 (or guarded) range on a real pipeline run", async () => {
    const { topReport } = await runPipeline();

    for (const opp of topReport.opportunities) {
      const metrics = opp.calibration.metrics;
      expect(metrics.rankingStability).toBeGreaterThanOrEqual(0);
      expect(metrics.rankingStability).toBeLessThanOrEqual(1);
      expect(metrics.signalDensity).toBeGreaterThanOrEqual(0);
      expect(metrics.signalDensity).toBeLessThanOrEqual(1);
      expect(metrics.evidenceDensity).toBeGreaterThanOrEqual(0);
      expect(metrics.crossSourceConsistency).toBeGreaterThanOrEqual(0);
      expect(metrics.crossSourceConsistency).toBeLessThanOrEqual(1);
      expect(metrics.intentConsistency).toBeGreaterThanOrEqual(0);
      expect(metrics.intentConsistency).toBeLessThanOrEqual(1);
      expect(metrics.noiseRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.noiseRatio).toBeLessThanOrEqual(1);
      expect(metrics.duplicateCompressionRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.duplicateCompressionRatio).toBeLessThan(1);
    }
  });

  it("never divides by zero: evidenceDensity/crossSourceConsistency are finite even with uniqueSources=0", () => {
    const metrics = computeCalibrationMetrics(zeroSourceReportFixture());
    expect(Number.isFinite(metrics.evidenceDensity)).toBe(true);
    expect(Number.isFinite(metrics.crossSourceConsistency)).toBe(true);
    expect(Number.isFinite(metrics.noiseRatio)).toBe(true);
  });
});

/* -------------------------------------------------------------------- */
/* Part B / E — diagnostics + false-positive rule                        */
/* -------------------------------------------------------------------- */

describe("computeCalibrationDiagnostics / computeFalsePositive", () => {
  it("flags the thin, single-source, single-author complaint cluster with Weak Evidence / Low Diversity / Sparse Cluster", async () => {
    const { topReport } = await runPipeline();
    const complaintOpp = topReport.opportunities.find((o) => o.category === "complaint");
    expect(complaintOpp).toBeDefined();

    const flagNames = complaintOpp!.calibration.diagnostics.filter((d) => d.fired).map((d) => d.flag);
    // eslint-disable-next-line no-console
    console.log(`[calibration diagnostics] complaint cluster fired flags: ${JSON.stringify(flagNames)}`);

    expect(flagNames).toContain("Weak Evidence");
    expect(flagNames).toContain("Low Diversity");
    expect(flagNames).toContain("Sparse Cluster");
  });

  it("always evaluates all 10 named flags, fired or not", async () => {
    const { topReport } = await runPipeline();
    for (const opp of topReport.opportunities) {
      const names = opp.calibration.diagnostics.map((d) => d.flag);
      expect(names).toEqual([
        "Weak Evidence",
        "Weak Buying Intent",
        "Low Diversity",
        "Echo Chamber",
        "Trending-only",
        "News Spike",
        "Speculation",
        "Single Mention",
        "Sparse Cluster",
        "Artificial Score Inflation",
      ]);
    }
  });

  it("marks likely=true when News Spike fires, citing the reason", () => {
    const report = zeroSourceReportFixture();
    const metrics = computeCalibrationMetrics(report);
    const diagnostics = computeCalibrationDiagnostics(report, metrics);
    const fp = computeFalsePositive(report, diagnostics);
    expect(fp.likely).toBe(true);
    expect(fp.reasons.some((r) => r.includes("News Spike"))).toBe(true);
  });

  it("does not mark a strong, well-evidenced BUILD opportunity as a likely false positive", async () => {
    const { topReport } = await runPipeline();
    const buildOpp = topReport.opportunities.find((o) => o.category === "buying-intent");
    expect(buildOpp).toBeDefined();
    expect(buildOpp!.calibration.falsePositive.likely).toBe(false);
  });
});

/* -------------------------------------------------------------------- */
/* Part C — ranking validation (diagnostic only)                         */
/* -------------------------------------------------------------------- */

describe("Part C ranking diagnostic", () => {
  it("rankBefore matches the shipped array index; rankAfter is a hypothetical that never re-sorts the shipped array", async () => {
    const { topReport } = await runPipeline();

    topReport.opportunities.forEach((opp, i) => {
      expect(opp.calibration.ranking.rankBefore).toBe(i + 1);
      expect(opp.calibration.ranking.movement).toBe(
        opp.calibration.ranking.rankBefore - opp.calibration.ranking.rankAfter,
      );
    });

    // the shipped order itself is untouched: still fois.overall descending
    for (let i = 1; i < topReport.opportunities.length; i += 1) {
      expect(topReport.opportunities[i - 1]!.fois.overall).toBeGreaterThanOrEqual(
        topReport.opportunities[i]!.fois.overall,
      );
    }
  });
});

/* -------------------------------------------------------------------- */
/* Part D — explainability (BUILD only)                                  */
/* -------------------------------------------------------------------- */

describe("Part D explainability", () => {
  it("is populated only for BUILD-verdict opportunities; null otherwise", async () => {
    const { topReport } = await runPipeline();
    for (const opp of topReport.opportunities) {
      if (opp.decision.recommendation.verdict === "BUILD") {
        expect(opp.calibration.explainability).not.toBeNull();
        expect(opp.calibration.explainability!.topContributingSignals.length).toBeGreaterThan(0);
      } else {
        expect(opp.calibration.explainability).toBeNull();
      }
    }
  });
});

/* -------------------------------------------------------------------- */
/* Part F/G — aggregate dashboard + threshold diagnostic                 */
/* -------------------------------------------------------------------- */

describe("computeAggregateCalibration / computeThresholdDiagnostic", () => {
  it("reports real, non-fabricated numbers derived from the session/problemReport/opportunity list", async () => {
    const { topReport, session } = await runPipeline();
    const calibration = topReport.calibration;

    // eslint-disable-next-line no-console
    console.log(
      "[calibration aggregate dashboard]\n" +
        JSON.stringify(calibration, null, 2),
    );

    expect(calibration.itemsCollected).toBe(session.totalItemsCollected);
    expect(calibration.itemsRemovedByRelevance).toBe(3);
    expect(calibration.itemsClustered).toBeGreaterThan(0);
    expect(calibration.verdictBreakdown.build + calibration.verdictBreakdown.watch + calibration.verdictBreakdown.ignore).toBeGreaterThan(0);
    expect(calibration.averageFois).toBeGreaterThanOrEqual(0);
    expect(calibration.averageFois).toBeLessThanOrEqual(100);
    expect(calibration.thresholdDiagnostic.foisBuildThreshold).toBe(60);
    expect(calibration.thresholdDiagnostic.observedFoisDistribution.reduce((sum, b) => sum + b.count, 0)).toBeGreaterThan(0);
    expect(typeof calibration.thresholdDiagnostic.suggestion).toBe("string");
    expect(calibration.thresholdDiagnostic.suggestion.length).toBeGreaterThan(0);
  });

  it("reports itemsRemovedByRelevance as null with a note when the session predates relevanceFilter", () => {
    const built = [zeroSourceReportFixture()];
    const sessionNoFilter: ResearchSession = {
      id: "s",
      windowDays: 30,
      startedAt: new Date().toISOString(),
      sourcesUsed: [],
      sourcesFailed: [],
      sourcesSkipped: [],
      opportunities: [],
      report: makeFounderReport([]),
      totalItemsCollected: 0,
      durationMs: 0,
    };
    const aggregate = computeAggregateCalibration(built, sessionNoFilter, {
      id: "pr",
      sourceSessionId: "s",
      windowDays: 30,
      clusters: [],
      totalItemsAnalyzed: 0,
      totalItemsClassified: 0,
      generatedAt: new Date().toISOString(),
    });
    expect(aggregate.itemsRemovedByRelevance).toBeNull();
    expect(aggregate.notes.some((n) => n.includes("relevanceFilter"))).toBe(true);
  });

  it("suggests 'too strict' when no opportunity clears BUILD but a high-evidence one is a near-miss", () => {
    const nearMiss = zeroSourceReportFixture();
    nearMiss.fois = { ...nearMiss.fois, overall: 57 };
    nearMiss.decision = { ...nearMiss.decision, evidence: { ...nearMiss.decision.evidence, evidenceCount: 8 } };
    const diagnostic = computeThresholdDiagnostic([nearMiss]);
    expect(diagnostic.suggestion.toLowerCase()).toContain("too strict");
  });
});

/* -------------------------------------------------------------------- */
/* Part H — determinism + order-preservation                             */
/* -------------------------------------------------------------------- */

describe("Part H determinism", () => {
  it("produces identical calibration output across two independent analyze() runs on the same fixture", async () => {
    const sessionA = buildMixedFixtureSession();
    const sessionB = buildMixedFixtureSession();
    const { problemEngine: peA, opportunityEngine: oeA } = harness();
    const { problemEngine: peB, opportunityEngine: oeB } = harness();

    const prA = await peA.analyze(sessionA);
    const topA = await oeA.analyze(sessionA, prA);
    const prB = await peB.analyze(sessionB);
    const topB = await oeB.analyze(sessionB, prB);

    const calibrationsA = topA.opportunities.map((o) => o.calibration);
    const calibrationsB = topB.opportunities.map((o) => o.calibration);
    expect(calibrationsA).toEqual(calibrationsB);
    expect(topA.calibration).toEqual(topB.calibration);
  });

  it("does not change the shipped opportunities' fois.overall-descending order", async () => {
    const { topReport } = await runPipeline();
    const overallScores = topReport.opportunities.map((o) => o.fois.overall);
    const sorted = [...overallScores].sort((a, b) => b - a);
    expect(overallScores).toEqual(sorted);
  });
});

/* -------------------------------------------------------------------- */
/* attachCalibration / defaultCalibration / computeBaseCalibration       */
/* -------------------------------------------------------------------- */

describe("attachCalibration", () => {
  it("preserves input order exactly (no re-sort)", async () => {
    const { topReport } = await runPipeline();
    const ids = topReport.opportunities.map((o) => o.id);
    const reAttached = attachCalibration(topReport.opportunities);
    expect(reAttached.map((o) => o.id)).toEqual(ids);
  });
});

describe("defaultCalibration", () => {
  it("is a type-valid, all-inert placeholder", () => {
    const placeholder = defaultCalibration();
    expect(placeholder.falsePositive.likely).toBe(false);
    expect(placeholder.diagnostics).toEqual([]);
    expect(placeholder.explainability).toBeNull();
  });
});

describe("computeBaseCalibration", () => {
  it("composes metrics + diagnostics + falsePositive consistently", () => {
    const report = zeroSourceReportFixture();
    const base = computeBaseCalibration(report);
    expect(base.metrics).toEqual(computeCalibrationMetrics(report));
    expect(base.diagnostics).toEqual(computeCalibrationDiagnostics(report, base.metrics));
    expect(base.falsePositive).toEqual(computeFalsePositive(report, base.diagnostics));
  });
});

/* -------------------------------------------------------------------- */
/* Minimal hand-built fixture for edge-case / guard tests                */
/* -------------------------------------------------------------------- */

function zeroSourceReportFixture() {
  return {
    id: "opp_edge",
    clusterId: "cluster_edge",
    category: "other" as const,
    problem: "Some passive news-only chatter.",
    summary: "s",
    painScore: 0,
    buyingIntent: { score: 0, matchingItemCount: 0, totalItemCount: 1, explanation: "x" },
    competition: { competitors: [], competitionScore: 1, explanation: "x" },
    confidence: { band: "low", score: 0.1 },
    scoreBreakdown: {
      painFrequency: 0,
      sourceDiversity: 0,
      authorDiversity: 0,
      buyingIntent: 0,
      engagement: 0,
      growth: 0,
      competition: 1,
      confidence: 0.1,
      weightedTotal: 0.1,
      explanation: "x",
    },
    fois: {
      overall: 10,
      dimensions: [
        { name: "businessPain", raw: 5, weight: 0.15, weighted: 0.75, reason: "x", evidence: [] },
        { name: "frequency", raw: 10, weight: 0.1, weighted: 1, reason: "x", evidence: ["mentions=1", "growth=insufficient-data"] },
      ],
      reasons: [],
      weaknesses: [],
      penalties: [{ reason: "No buying-intent signal and no meaningful pain signal found — likely passive/news-only chatter, not a founder opportunity.", points: 10 }],
    },
    supportingEvidence: { evidenceCount: 1, sourceBreakdown: {}, urls: [] },
    representativeQuotes: [],
    recommendedMvp: "x",
    suggestedPricing: { extractedPrices: [], suggestedPriceText: "x" },
    targetUsers: "x",
    buildDifficulty: { tier: "low" as const, matchedSignals: [], explanation: "heuristic estimate, not an engineering estimate" },
    estimatedTimeToMvp: "x",
    recommendation: { verdict: "IGNORE" as const, whyBuild: [], whyNotBuild: [], risk: [], explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    sourceProblemReportId: "report_1",
    decision: {
      intentDistribution: [],
      evidence: { evidenceCount: 1, uniqueSources: 0, uniqueAuthors: 0, freshness: "unknown" as const, crossSourceAgreement: 0, echoChamber: false, explanation: "x" },
      reasoning: { whyThisMatters: "x", whyNow: "x", whoExperiences: "x", whatEvidence: "x", whyFoundersPay: "x", biggestUncertainty: "x", biggestImplementationRisk: "x" },
      confidence: { score: 10, band: "low" as const, contributors: [], weaknesses: [] },
      recommendation: { verdict: "IGNORE" as const, justification: "x", primaryRisk: "x", primaryOpportunity: "x" },
      qualityGates: [],
    },
    semanticCluster: { canonicalTitle: "x", aliases: [], mentionCount: 1, supportingSources: [], mergedCount: 1 },
    calibration: defaultCalibration(),
    founderIntelligence: defaultFounderIntelligence(),
  };
}
