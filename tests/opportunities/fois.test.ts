import { describe, expect, it } from "vitest";
import { computeFois } from "../../src/opportunities/fois.js";
import { computeBuyingIntentScore } from "../../src/opportunities/buying-intent.js";
import { extractCompetitionEvidence } from "../../src/opportunities/competition.js";
import { extractPricingSignal } from "../../src/opportunities/pricing.js";
import { computeOpportunityScore } from "../../src/opportunities/scoring.js";
import { classifyItem } from "../../src/problems/detector.js";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { OpportunityRepository } from "../../src/opportunities/repository.js";
import { OpportunityEngine } from "../../src/opportunities/engine.js";
import type { ClassifiedItem, ProblemCluster } from "../../src/problems/types.js";
import type { FounderReport, Opportunity, RawResearchItem, ResearchSession } from "../../src/research/types.js";

/* -------------------------------------------------------------------- */
/* Unit-level fixtures (direct computeFois calls)                        */
/* -------------------------------------------------------------------- */

function makeCluster(overrides: Partial<ProblemCluster> = {}): ProblemCluster {
  return {
    id: "cluster_1",
    category: "complaint",
    normalizedStatement: "Users express general dissatisfaction.",
    evidence: {
      evidenceCount: 6,
      sourceBreakdown: { reddit: 4, hackernews: 2 },
      originalUrls: [],
      representativeExamples: [],
      engagementTotal: 40,
      dateRange: null,
    },
    frequency: {
      mentions: 6,
      uniqueAuthors: 4,
      uniqueSources: 2,
      engagementTotal: 40,
      growth: { label: "rising", recentHalfCount: 4, earlierHalfCount: 2, ratio: 2 },
    },
    confidence: { band: "medium", score: 0.6, explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    ...overrides,
  };
}

function makeRawItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function classify(items: RawResearchItem[]): ClassifiedItem[] {
  return items.map((item) => classifyItem(item));
}

function computeFoisFor(cluster: ProblemCluster, items: RawResearchItem[]) {
  const clusterItems = classify(items);
  return computeFois({
    cluster,
    clusterItems,
    rawItems: items,
    buyingIntent: computeBuyingIntentScore(clusterItems),
    competition: extractCompetitionEvidence(items),
    pricing: extractPricingSignal(items),
  });
}

describe("computeFois — dimension/weight/penalty mechanics", () => {
  it("dimension weights sum to exactly 1.0", () => {
    const cluster = makeCluster();
    const items = [makeRawItem({ url: "https://e1" })];
    const result = computeFoisFor(cluster, items);

    const weightSum = result.dimensions.reduce((sum, dim) => sum + dim.weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 10);
  });

  it("every dimension produces a 0-100 raw score with a non-empty reason", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const items = [
      makeRawItem({ url: "https://e1", title: "Willing to pay for this, costs $30, switched from Trello" }),
      makeRawItem({ url: "https://e2", title: "So many manual steps every day, I do this manually" }),
    ];
    const result = computeFoisFor(cluster, items);

    expect(result.dimensions.length).toBeGreaterThan(0);
    for (const dim of result.dimensions) {
      expect(dim.raw).toBeGreaterThanOrEqual(0);
      expect(dim.raw).toBeLessThanOrEqual(100);
      expect(dim.reason.length).toBeGreaterThan(0);
      expect(Array.isArray(dim.evidence)).toBe(true);
    }
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("applies single-source, low-evidence, and no-signal penalties to a thin, signal-less cluster", () => {
    const cluster = makeCluster({
      category: "praise", // lowest businessPain base (5), see fois.ts computeBusinessPainDimension
      evidence: {
        evidenceCount: 1,
        sourceBreakdown: { rss: 1 },
        originalUrls: [],
        representativeExamples: [],
        engagementTotal: 0,
        dateRange: null,
      },
      frequency: {
        mentions: 1,
        uniqueAuthors: 1,
        uniqueSources: 1,
        engagementTotal: 0,
        growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null },
      },
      confidence: { band: "low", score: 0.15, explanation: "x" },
    });
    const items = [
      makeRawItem({ url: "https://spam1", title: "Company X announces quarterly earnings report", sourceId: "rss" }),
    ];

    const result = computeFoisFor(cluster, items);

    expect(result.penalties.some((p) => p.reason.includes("Single-source"))).toBe(true);
    expect(result.penalties.some((p) => p.reason.includes("Low evidence"))).toBe(true);
    expect(result.penalties.some((p) => p.reason.includes("passive/news-only"))).toBe(true);
    expect(result.penalties.length).toBe(3);
    expect(result.weaknesses.some((w) => w.startsWith("Penalty"))).toBe(true);
  });

  it("scores a high-quality multi-source cluster meaningfully higher than a weak single-source cluster", () => {
    const strongCluster = makeCluster({
      category: "pricing-complaint",
      evidence: {
        evidenceCount: 12,
        sourceBreakdown: { reddit: 5, hackernews: 4, producthunt: 3 },
        originalUrls: [],
        representativeExamples: [],
        engagementTotal: 200,
        dateRange: null,
      },
      frequency: {
        mentions: 12,
        uniqueAuthors: 9,
        uniqueSources: 3,
        engagementTotal: 200,
        growth: { label: "rising", recentHalfCount: 8, earlierHalfCount: 4, ratio: 2 },
      },
      confidence: { band: "high", score: 0.85, explanation: "x" },
    });
    const strongItems = [
      makeRawItem({
        url: "https://s1",
        title: "I'd pay for this right now, it costs $40 and I do this manually every day",
        sourceId: "reddit",
      }),
      makeRawItem({
        url: "https://s2",
        title: "Willing to pay for a tool, switched from Trello because pricing is insane",
        sourceId: "hackernews",
      }),
      makeRawItem({
        url: "https://s3",
        title: "Need this yesterday, we can't ship without it, sign me up",
        sourceId: "producthunt",
      }),
    ];

    const weakCluster = makeCluster({
      category: "complaint",
      evidence: {
        evidenceCount: 1,
        sourceBreakdown: { reddit: 1 },
        originalUrls: [],
        representativeExamples: [],
        engagementTotal: 0,
        dateRange: null,
      },
      frequency: {
        mentions: 1,
        uniqueAuthors: 1,
        uniqueSources: 1,
        engagementTotal: 0,
        growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null },
      },
      confidence: { band: "low", score: 0.2, explanation: "x" },
    });
    const weakItems = [makeRawItem({ url: "https://w1", title: "This is annoying", sourceId: "reddit" })];

    const strongResult = computeFoisFor(strongCluster, strongItems);
    const weakResult = computeFoisFor(weakCluster, weakItems);

    expect(strongResult.overall).toBeGreaterThan(weakResult.overall + 20);
    expect(weakResult.penalties.length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------- */
/* Integration-level: mixed-quality fixture set through the real         */
/* pipeline (ProblemIntelligenceEngine -> OpportunityEngine), so the     */
/* FOIS ranking-quality proof uses real computed numbers end-to-end.     */
/* -------------------------------------------------------------------- */

function harness() {
  const artifacts = new ArtifactManager({ storage: new StubStorage() });
  const memory = new MemoryEngine(new InMemoryStore());
  const clusterRepository = new ClusterRepository({ artifacts, memory });
  const problemEngine = new ProblemIntelligenceEngine({ repository: clusterRepository });
  const opportunityRepository = new OpportunityRepository({ artifacts, memory });
  const opportunityEngine = new OpportunityEngine({ repository: opportunityRepository });
  return { problemEngine, opportunityEngine };
}

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

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function makeReport(opportunities: Opportunity[]): FounderReport {
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
    id: "research_fois_fixture",
    windowDays,
    startedAt: new Date().toISOString(),
    sourcesUsed: [],
    sourcesFailed: [],
    sourcesSkipped: [],
    opportunities,
    report: makeReport(opportunities),
    totalItemsCollected: opportunities.flatMap((o) => o.supportingItems).length,
    durationMs: 0,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Five quality tiers, spanning the range this FOIS is meant to separate:
 * HIGH (buying-intent, multi-source, price + urgency + automation signal,
 * rising), MEDIUM (workflow-friction, moderate multi-source evidence,
 * stable), BORDERLINE (feature-request, sparse two-source evidence, no
 * intent signal), LOW (complaint, single-source, sparse), SPAM-ish (no
 * category match at all -> "other", single item, no signal whatsoever).
 */
function buildMixedQualityFixtureSession(): ResearchSession {
  const now = Date.now();

  const highItems: RawResearchItem[] = [
    makeItem({
      url: "https://mixed.example/hi-1",
      title: "Willing to pay for a tool that automates this, it costs $40 a month and I'd switch immediately",
      sourceId: "reddit",
      author: "alice",
      engagement: 25,
      publishedAt: new Date(now).toISOString(),
    }),
    makeItem({
      url: "https://mixed.example/hi-2",
      title: "I'd pay for this right now, sign me up, we can't ship without solving this",
      sourceId: "hackernews",
      author: "bob",
      engagement: 18,
      publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://mixed.example/hi-3",
      title: "Shut up and take my money, switched from Trello because pricing is insane",
      sourceId: "producthunt",
      author: "carol",
      engagement: 22,
      publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://mixed.example/hi-4",
      title: "Need this yesterday, our budget is approved for a new tool",
      sourceId: "reddit",
      author: "dave",
      engagement: 12,
      publishedAt: new Date(now - 3 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://mixed.example/hi-5",
      title: "Looking to buy something like this for my team, would pay monthly",
      sourceId: "hackernews",
      author: "erin",
      engagement: 15,
      publishedAt: new Date(now - 4 * DAY_MS).toISOString(),
    }),
  ];

  const mediumItems: RawResearchItem[] = [
    makeItem({
      url: "https://mixed.example/md-1",
      title: "This is so tedious, so many manual steps every day",
      sourceId: "reddit",
      author: "frank",
      engagement: 4,
      publishedAt: new Date(now).toISOString(),
    }),
    makeItem({
      url: "https://mixed.example/md-2",
      title: "I waste hours doing this by hand, it's very time-consuming",
      sourceId: "hackernews",
      author: "grace",
      engagement: 3,
      publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://mixed.example/md-3",
      title: "So many steps and it's clunky and confusing to use",
      sourceId: "reddit",
      author: "heidi",
      engagement: 2,
      publishedAt: new Date(now - 20 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://mixed.example/md-4",
      title: "This workflow is tedious and takes forever to finish",
      sourceId: "hackernews",
      author: "ivan",
      engagement: 1,
      publishedAt: new Date(now - 21 * DAY_MS).toISOString(),
    }),
  ];

  const borderlineItems: RawResearchItem[] = [
    makeItem({
      url: "https://mixed.example/bd-1",
      title: "Wish it had a better export feature",
      sourceId: "reddit",
      author: "judy",
    }),
    makeItem({
      url: "https://mixed.example/bd-2",
      title: "Would be nice if this supported CSV export",
      sourceId: "hackernews",
      author: "mallory",
    }),
  ];

  const lowItems: RawResearchItem[] = [
    makeItem({
      url: "https://mixed.example/lo-1",
      title: "This is annoying and frustrating to use",
      sourceId: "reddit",
      author: "oscar",
    }),
    makeItem({
      url: "https://mixed.example/lo-2",
      title: "Terrible experience, hate it, worst tool ever",
      sourceId: "reddit",
      author: "peggy",
    }),
  ];

  const spamItems: RawResearchItem[] = [
    makeItem({
      url: "https://mixed.example/sp-1",
      title: "Company X announces record quarterly earnings for Q3",
      sourceId: "rss",
    }),
  ];

  const opportunities: Opportunity[] = [
    { id: "opp_high", title: "High", summary: "s", keywords: [], supportingItems: highItems, sourceIds: ["reddit", "hackernews", "producthunt"] },
    { id: "opp_medium", title: "Medium", summary: "s", keywords: [], supportingItems: mediumItems, sourceIds: ["reddit", "hackernews"] },
    { id: "opp_borderline", title: "Borderline", summary: "s", keywords: [], supportingItems: borderlineItems, sourceIds: ["reddit", "hackernews"] },
    { id: "opp_low", title: "Low", summary: "s", keywords: [], supportingItems: lowItems, sourceIds: ["reddit"] },
    { id: "opp_spam", title: "Spam-ish", summary: "s", keywords: [], supportingItems: spamItems, sourceIds: ["rss"] },
  ];

  return makeSession(opportunities, 30);
}

describe("computeFois — mixed-quality fixture ranking proof (real pipeline numbers)", () => {
  it("ranks high > medium > low by fois.overall, and demonstrates the ranking change vs. the old weightedTotal order", async () => {
    const session = buildMixedQualityFixtureSession();
    const { problemEngine, opportunityEngine } = harness();

    const problemReport = await problemEngine.analyze(session);
    const topReport = await opportunityEngine.analyze(session, problemReport);

    const high = topReport.opportunities.find((o) => o.category === "buying-intent");
    const medium = topReport.opportunities.find((o) => o.category === "workflow-friction");
    const low = topReport.opportunities.find((o) => o.category === "complaint");

    expect(high).toBeDefined();
    expect(medium).toBeDefined();
    expect(low).toBeDefined();

    // Core ranking-quality proof: fois.overall strictly orders high > medium > low.
    expect(high!.fois.overall).toBeGreaterThan(medium!.fois.overall);
    expect(medium!.fois.overall).toBeGreaterThan(low!.fois.overall);

    // Report itself is already sorted descending by fois.overall (engine.ts).
    for (let i = 1; i < topReport.opportunities.length; i += 1) {
      expect(topReport.opportunities[i - 1]!.fois.overall).toBeGreaterThanOrEqual(
        topReport.opportunities[i]!.fois.overall,
      );
    }

    // Demonstrate the before/after ranking with real numbers from this run:
    // the OLD ranking key (scoreBreakdown.weightedTotal, still present and
    // untouched) vs. the NEW ranking key (fois.overall) actually used to
    // sort `topReport.opportunities`.
    const byOldWeightedTotal = [...topReport.opportunities].sort(
      (a, b) => b.scoreBreakdown.weightedTotal - a.scoreBreakdown.weightedTotal,
    );
    const byNewFois = [...topReport.opportunities].sort((a, b) => b.fois.overall - a.fois.overall);

    // eslint-disable-next-line no-console
    console.log(
      "\n[FOIS ranking-quality proof] OLD order (by scoreBreakdown.weightedTotal):\n" +
        byOldWeightedTotal
          .map((o, i) => `  ${i + 1}. category=${o.category} weightedTotal=${o.scoreBreakdown.weightedTotal.toFixed(3)} fois.overall=${o.fois.overall}`)
          .join("\n") +
        "\n[FOIS ranking-quality proof] NEW order (by fois.overall):\n" +
        byNewFois
          .map((o, i) => `  ${i + 1}. category=${o.category} fois.overall=${o.fois.overall} weightedTotal=${o.scoreBreakdown.weightedTotal.toFixed(3)}`)
          .join("\n"),
    );

    // Sanity: every opportunity actually carries the additive fois field
    // alongside the untouched scoreBreakdown.
    for (const opp of topReport.opportunities) {
      expect(opp.fois).toBeDefined();
      expect(opp.fois.overall).toBeGreaterThanOrEqual(0);
      expect(opp.fois.overall).toBeLessThanOrEqual(100);
      expect(opp.scoreBreakdown).toBeDefined();
    }
  });

  /**
   * Adversarial pair, constructed to demonstrate a concrete rank ORDER FLIP
   * (not just a magnitude difference) between the old ranking key
   * (scoreBreakdown.weightedTotal) and the new one (fois.overall): a
   * high-volume, high-engagement, well-sourced cluster that carries NO
   * buying-intent or monetization signal ("volumeCluster"), vs. a
   * lower-volume cluster that carries strong, explicit buying-intent +
   * pricing + urgency signal ("intentCluster"). The old formula weights
   * volume/engagement/diversity/competition-absence heavily enough that
   * the high-volume cluster can outrank real monetizable pain; FOIS's
   * businessPain + buyingIntent + commercialPotential dimensions (0.45
   * combined weight) correct this. Real computed numbers, not asserted
   * abstractly — see console.log output.
   */
  it("demonstrates a concrete rank-order flip: FOIS ranks strong buying-intent above high-volume-but-unmonetized chatter, reversing the old weightedTotal order", () => {
    const volumeCluster = makeCluster({
      id: "cluster_volume",
      category: "feature-request",
      normalizedStatement: "Users request a CSV export feature.",
      evidence: {
        evidenceCount: 20,
        sourceBreakdown: { reddit: 10, hackernews: 6, producthunt: 4 },
        originalUrls: [],
        representativeExamples: [],
        engagementTotal: 300,
        dateRange: null,
      },
      frequency: {
        mentions: 20,
        uniqueAuthors: 15,
        uniqueSources: 3,
        engagementTotal: 300,
        growth: { label: "stable", recentHalfCount: 10, earlierHalfCount: 10, ratio: 1 },
      },
      confidence: { band: "high", score: 0.9, explanation: "x" },
    });
    const volumeItems: RawResearchItem[] = Array.from({ length: 20 }, (_, i) =>
      makeRawItem({
        url: `https://flip.example/vol-${i}`,
        title: "Would be nice if this supported CSV export, please add it",
        sourceId: i % 3 === 0 ? "reddit" : i % 3 === 1 ? "hackernews" : "producthunt",
      }),
    );

    const intentCluster = makeCluster({
      id: "cluster_intent",
      category: "buying-intent",
      normalizedStatement: "Users express explicit willingness to pay.",
      evidence: {
        evidenceCount: 4,
        sourceBreakdown: { reddit: 2, hackernews: 2 },
        originalUrls: [],
        representativeExamples: [],
        engagementTotal: 40,
        dateRange: null,
      },
      frequency: {
        mentions: 4,
        uniqueAuthors: 4,
        uniqueSources: 2,
        engagementTotal: 40,
        growth: { label: "rising", recentHalfCount: 3, earlierHalfCount: 1, ratio: 3 },
      },
      confidence: { band: "medium", score: 0.5, explanation: "x" },
    });
    const intentItems: RawResearchItem[] = [
      makeRawItem({ url: "https://flip.example/int-1", title: "Willing to pay for this, it costs $50, need this yesterday", sourceId: "reddit" }),
      makeRawItem({ url: "https://flip.example/int-2", title: "I'd pay for this right now, switched from Trello", sourceId: "hackernews" }),
      makeRawItem({ url: "https://flip.example/int-3", title: "Shut up and take my money, sign me up today", sourceId: "reddit" }),
      makeRawItem({ url: "https://flip.example/int-4", title: "Where can I buy a tool that solves this, we can't ship without it", sourceId: "hackernews" }),
    ];

    const volumeBuyingIntent = computeBuyingIntentScore(classify(volumeItems));
    const volumeCompetition = extractCompetitionEvidence(volumeItems);
    const volumeOldScore = computeOpportunityScore({ cluster: volumeCluster, buyingIntent: volumeBuyingIntent, competition: volumeCompetition });
    const volumeFois = computeFoisFor(volumeCluster, volumeItems);

    const intentBuyingIntent = computeBuyingIntentScore(classify(intentItems));
    const intentCompetition = extractCompetitionEvidence(intentItems);
    const intentOldScore = computeOpportunityScore({ cluster: intentCluster, buyingIntent: intentBuyingIntent, competition: intentCompetition });
    const intentFois = computeFoisFor(intentCluster, intentItems);

    // eslint-disable-next-line no-console
    console.log(
      "\n[FOIS rank-flip proof] volumeCluster: weightedTotal=" +
        volumeOldScore.weightedTotal.toFixed(3) +
        " fois.overall=" +
        volumeFois.overall +
        "\n[FOIS rank-flip proof] intentCluster: weightedTotal=" +
        intentOldScore.weightedTotal.toFixed(3) +
        " fois.overall=" +
        intentFois.overall +
        `\n[FOIS rank-flip proof] OLD order: ${volumeOldScore.weightedTotal > intentOldScore.weightedTotal ? "volumeCluster > intentCluster" : "intentCluster > volumeCluster"}` +
        `\n[FOIS rank-flip proof] NEW order: ${volumeFois.overall > intentFois.overall ? "volumeCluster > intentCluster" : "intentCluster > volumeCluster"}`,
    );

    // OLD ranking key puts the high-volume, unmonetized cluster on top.
    expect(volumeOldScore.weightedTotal).toBeGreaterThan(intentOldScore.weightedTotal);
    // NEW ranking key (fois.overall) reverses this: real buying intent
    // with pricing/urgency evidence outranks raw feature-request volume.
    expect(intentFois.overall).toBeGreaterThan(volumeFois.overall);
  });
});
