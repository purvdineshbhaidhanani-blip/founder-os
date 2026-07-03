import { describe, expect, it } from "vitest";
import { buildFounderDecision, computeIntentDistribution } from "../../src/opportunities/decision.js";
import { computeBuyingIntentScore } from "../../src/opportunities/buying-intent.js";
import { extractCompetitionEvidence } from "../../src/opportunities/competition.js";
import { extractPricingSignal } from "../../src/opportunities/pricing.js";
import { estimateBuildDifficulty } from "../../src/opportunities/difficulty.js";
import { computeFois } from "../../src/opportunities/fois.js";
import { computeOpportunityScore } from "../../src/opportunities/scoring.js";
import { decideRecommendation } from "../../src/opportunities/recommendation.js";
import { getTargetUsers } from "../../src/opportunities/mvp-template.js";
import { classifyItem } from "../../src/problems/detector.js";
import { buildClusterEvidence } from "../../src/problems/evidence.js";
import { computeFrequency } from "../../src/problems/frequency.js";
import { computeClusterConfidence } from "../../src/problems/confidence.js";
import { extractProblem } from "../../src/problems/extractor.js";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { OpportunityRepository } from "../../src/opportunities/repository.js";
import { OpportunityEngine } from "../../src/opportunities/engine.js";
import type { ClassifiedItem, ProblemCategory, ProblemCluster } from "../../src/problems/types.js";
import type { FounderDecision } from "../../src/opportunities/types.js";
import type { FounderReport, Opportunity, RawResearchItem, ResearchSession } from "../../src/research/types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------- */
/* Shared fixture helpers                                                */
/* -------------------------------------------------------------------- */

function makeRawItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function classify(items: RawResearchItem[]): ClassifiedItem[] {
  return items.map((item) => classifyItem(item));
}

/**
 * Builds a REAL, internally-consistent ProblemCluster from raw items via
 * the same read-only src/problems functions ProblemIntelligenceEngine
 * itself uses (buildClusterEvidence / computeFrequency /
 * computeClusterConfidence / extractProblem) — avoids hand-computing
 * evidence/frequency/confidence numbers that could drift out of sync with
 * the real formulas.
 */
function buildRealCluster(category: ProblemCategory, items: RawResearchItem[], windowDays = 30): ProblemCluster {
  const evidence = buildClusterEvidence(items);
  const frequency = computeFrequency(items, windowDays);
  const confidence = computeClusterConfidence(evidence, frequency);
  const { normalizedStatement } = extractProblem(classifyItem(items[0]!), category);
  return {
    id: `cluster_${category}`,
    category,
    normalizedStatement,
    evidence,
    frequency,
    confidence,
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    ...(frequency.growth.label === "rising" ? { trending: true } : {}),
  };
}

interface DecisionFixtureResult {
  cluster: ProblemCluster;
  decision: FounderDecision;
  foisOverall: number;
  buyingIntentScore: number;
}

/** Runs every real src/opportunities computation (buyingIntent, competition, pricing, buildDifficulty, fois, recommendation) and composes the Founder Decision, mirroring engine.ts's `buildOpportunityReport` wiring exactly. */
function computeDecisionFor(category: ProblemCategory, items: RawResearchItem[], windowDays = 30): DecisionFixtureResult {
  const cluster = buildRealCluster(category, items, windowDays);
  const clusterItems = classify(items);
  const buyingIntent = computeBuyingIntentScore(clusterItems);
  const competition = extractCompetitionEvidence(items);
  const pricing = extractPricingSignal(items);
  const buildDifficulty = estimateBuildDifficulty(items);
  const fois = computeFois({ cluster, clusterItems, rawItems: items, buyingIntent, competition, pricing });
  const scoreBreakdown = computeOpportunityScore({ cluster, buyingIntent, competition });
  const recommendation = decideRecommendation(scoreBreakdown, cluster, buyingIntent);
  const targetUsers = getTargetUsers(category, items[0]?.sourceId ?? "unknown");

  const decision = buildFounderDecision({
    cluster,
    clusterItems,
    buyingIntent,
    competition,
    pricing,
    buildDifficulty,
    fois,
    recommendation,
    targetUsers,
  });

  return { cluster, decision, foisOverall: fois.overall, buyingIntentScore: buyingIntent.score };
}

function logDecision(label: string, result: DecisionFixtureResult): void {
  const { decision, foisOverall } = result;
  // eslint-disable-next-line no-console
  console.log(
    `\n[decision proof] ${label}: fois.overall=${foisOverall} decision.confidence=${decision.confidence.band}(${decision.confidence.score}/100) ` +
      `verdict=${decision.recommendation.verdict}\n` +
      `  justification: ${decision.recommendation.justification}\n` +
      `  confidence contributors:\n` +
      decision.confidence.contributors.map((c) => `    - ${c.name}: ${c.points} points — ${c.reason}`).join("\n") +
      `\n  quality gates: ` +
      decision.qualityGates.map((g) => `${g.name}=${g.fired ? "FIRED" : "ok"}`).join(", "),
  );
}

/* -------------------------------------------------------------------- */
/* Part B — computeIntentDistribution                                    */
/* -------------------------------------------------------------------- */

describe("computeIntentDistribution", () => {
  it("counts a multi-category item once per distinct founder-facing intent, not once per raw category match", () => {
    // "Willing to pay for a better tool than Trello, love the new tool"
    // matches BOTH "buying-intent" (Buying Intent) and "praise" (Positive
    // Validation) per detector.ts's CATEGORY_PATTERNS.
    const items: RawResearchItem[] = [
      makeRawItem({ url: "https://x1", title: "Willing to pay for a better tool than Trello, love the new tool" }),
    ];
    const distribution = computeIntentDistribution(classify(items));

    expect(distribution.find((d) => d.intent === "Buying Intent")?.count).toBe(1);
    expect(distribution.find((d) => d.intent === "Positive Validation")?.count).toBe(1);
    // Two distinct intents from one item -> fractions sum to 2.0, not 1.0 (documented on the type).
    const totalFraction = distribution.reduce((sum, d) => sum + d.fraction, 0);
    expect(totalFraction).toBeCloseTo(2.0, 10);
  });

  it("maps complaint+bug+workflow-friction to Founder Pain, feature-request+missing-capability to Feature Request, migration+looking-for-alternative to Migration", () => {
    const items: RawResearchItem[] = [
      makeRawItem({ url: "https://p1", title: "This is so frustrating, I hate this, worst software" }), // complaint
      makeRawItem({ url: "https://p2", title: "The app keeps crashing, this bug is broken" }), // bug
      makeRawItem({ url: "https://p3", title: "So many manual steps, this is tedious and clunky" }), // workflow-friction
      makeRawItem({ url: "https://p4", title: "Please add a feature request for dark mode" }), // feature-request
      makeRawItem({ url: "https://p5", title: "There is no option to export, it lacks a way to do this" }), // missing-capability
      makeRawItem({ url: "https://p6", title: "I switched from Trello because it was too slow" }), // migration
      makeRawItem({ url: "https://p7", title: "Looking for alternative to this tool, any recommendations for a replacement" }), // looking-for-alternative
    ];
    const distribution = computeIntentDistribution(classify(items));
    const byIntent = new Map(distribution.map((d) => [d.intent, d.count]));

    expect(byIntent.get("Founder Pain")).toBe(3); // complaint + bug + workflow-friction items
    expect(byIntent.get("Feature Request")).toBe(2); // feature-request + missing-capability items
    expect(byIntent.get("Migration")).toBe(2); // migration + looking-for-alternative items
  });

  it("sorts descending by count, tie-broken alphabetically by intent name", () => {
    const items: RawResearchItem[] = [
      makeRawItem({ url: "https://s1", title: "I love this, amazing product" }), // praise
      makeRawItem({ url: "https://s2", title: "Willing to pay for this right now" }), // buying-intent
    ];
    const distribution = computeIntentDistribution(classify(items));
    // Both counts are 1 -> alphabetical: "Buying Intent" < "Positive Validation".
    expect(distribution.map((d) => d.intent)).toEqual(["Buying Intent", "Positive Validation"]);
  });

  it("returns an empty distribution for an empty item list", () => {
    expect(computeIntentDistribution([])).toEqual([]);
  });
});

/* -------------------------------------------------------------------- */
/* Validation evidence — the 4 required mixed-quality fixtures           */
/* -------------------------------------------------------------------- */

describe("buildFounderDecision — mixed fixture set (real computed numbers)", () => {
  it("STRONG multi-source buying-intent cluster -> BUILD with high confidence", () => {
    const now = Date.now();
    const items: RawResearchItem[] = [
      makeRawItem({
        url: "https://strong.example/1",
        title: "Willing to pay for this right now, it costs $40, I need this today",
        sourceId: "reddit",
        author: "alice",
        engagement: 20,
        publishedAt: new Date(now).toISOString(),
      }),
      makeRawItem({
        url: "https://strong.example/2",
        title: "I'd pay for this right now, sign me up",
        sourceId: "hackernews",
        author: "bob",
        engagement: 18,
        publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
      }),
      makeRawItem({
        url: "https://strong.example/3",
        title: "Shut up and take my money, we can't ship without solving this",
        sourceId: "producthunt",
        author: "carol",
        engagement: 22,
        publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
      }),
      makeRawItem({
        url: "https://strong.example/4",
        title: "Looking to buy something like this for my team, our budget is approved",
        sourceId: "reddit",
        author: "dave",
        engagement: 12,
        publishedAt: new Date(now - 3 * DAY_MS).toISOString(),
      }),
      makeRawItem({
        url: "https://strong.example/5",
        title: "Where can I buy a tool that solves this properly",
        sourceId: "hackernews",
        author: "erin",
        engagement: 15,
        publishedAt: new Date(now - 4 * DAY_MS).toISOString(),
      }),
      makeRawItem({
        url: "https://strong.example/6",
        title: "I'd subscribe immediately, take my money",
        sourceId: "reddit",
        author: "frank",
        engagement: 10,
        publishedAt: new Date(now - 5 * DAY_MS).toISOString(),
      }),
    ];

    const result = computeDecisionFor("buying-intent", items);
    logDecision("STRONG (multi-source buying-intent)", result);

    expect(result.cluster.frequency.uniqueSources).toBe(3);
    expect(result.buyingIntentScore).toBeGreaterThan(0.9);
    expect(result.decision.evidence.echoChamber).toBe(false);
    expect(result.decision.confidence.band).toBe("high");
    expect(result.decision.recommendation.verdict).toBe("BUILD");
    expect(result.decision.qualityGates.every((gate) => !gate.fired)).toBe(true);

    // Every reasoning sentence must cite a real number.
    expect(result.decision.reasoning.whyThisMatters).toMatch(/\d/);
    expect(result.decision.reasoning.whyFoundersPay).toMatch(/\d/);
    expect(result.decision.reasoning.whatEvidence).toMatch(/\d/);
  });

  it("SINGLE-SOURCE ECHO CHAMBER cluster (with some buying intent) -> confidence penalized, not BUILD", () => {
    const now = Date.now();
    // All 5 items from ONE source ("twitter"). category=pricing-complaint is
    // an IMPLICIT_BUYING_INTENT_CATEGORIES member (buying-intent.ts), so
    // buyingIntent.score > 0 even with zero explicit "buying-intent"
    // phrase matches -> isolates the Part E confidence PENALTY from the
    // Part G echoChamberNoBuyingIntent GATE (which requires score===0).
    const items: RawResearchItem[] = [
      makeRawItem({ url: "https://echo.example/1", title: "This pricing is insane, too expensive for what it offers", sourceId: "twitter", author: "a", publishedAt: new Date(now).toISOString() }),
      makeRawItem({ url: "https://echo.example/2", title: "Cancelling because of the price, cost too much for us", sourceId: "twitter", author: "b", publishedAt: new Date(now - 1 * DAY_MS).toISOString() }),
      makeRawItem({ url: "https://echo.example/3", title: "Not worth the price, overpriced compared to alternatives", sourceId: "twitter", author: "c", publishedAt: new Date(now - 2 * DAY_MS).toISOString() }),
      makeRawItem({ url: "https://echo.example/4", title: "Pricing is insane, we need a cheaper option", sourceId: "twitter", author: "d", publishedAt: new Date(now - 3 * DAY_MS).toISOString() }),
      makeRawItem({ url: "https://echo.example/5", title: "Price increase again, can't justify paying this much", sourceId: "twitter", author: "e", publishedAt: new Date(now - 4 * DAY_MS).toISOString() }),
    ];

    const result = computeDecisionFor("pricing-complaint", items);
    logDecision("ECHO CHAMBER (single-source, some buying intent)", result);

    expect(result.cluster.frequency.uniqueSources).toBe(1);
    expect(result.decision.evidence.echoChamber).toBe(true);
    expect(result.buyingIntentScore).toBeGreaterThan(0); // implicit pricing-complaint signal, so gate 3 does NOT fire
    expect(result.decision.qualityGates.find((g) => g.name === "echoChamberNoBuyingIntent")?.fired).toBe(false);

    // The echo-chamber penalty (Part E) was actually applied.
    expect(result.decision.confidence.weaknesses.some((w) => w.startsWith("Echo-chamber penalty applied"))).toBe(true);
    // Penalized enough that this is NOT a BUILD.
    expect(result.decision.recommendation.verdict).not.toBe("BUILD");
    expect(["WATCH", "IGNORE"]).toContain(result.decision.recommendation.verdict);
  });

  it("THIN 1-item cluster -> IGNORE via the evidenceTooWeak quality gate", () => {
    const items: RawResearchItem[] = [
      makeRawItem({ url: "https://thin.example/1", title: "Would be nice if this supported CSV export", sourceId: "reddit" }),
    ];

    const result = computeDecisionFor("feature-request", items);
    logDecision("THIN (1 evidence item)", result);

    expect(result.cluster.evidence.evidenceCount).toBe(1);
    const evidenceGate = result.decision.qualityGates.find((g) => g.name === "evidenceTooWeak");
    expect(evidenceGate?.fired).toBe(true);
    expect(result.decision.recommendation.verdict).toBe("IGNORE");
    expect(result.decision.recommendation.justification).toContain("evidenceTooWeak");
  });

  it("NEWS-ONLY cluster (no pain, no buying intent) -> IGNORE via the foisNoSignalPenalty quality gate", () => {
    // fois.ts's computeBusinessPainDimension only assigns a low-enough base
    // (5) for the "praise" category to make its own no-signal penalty
    // mathematically reachable (every other category's base is 30, which
    // + evidenceMagnitudeBonus(>=4) always clears the NO_PAIN_THRESHOLD of
    // 30) — see fois.ts and fois.test.ts's own "thin, signal-less cluster"
    // fixture, which uses the same category for the same reason. The
    // ITEMS below are deliberately pure wire/press-release text (no praise
    // phrases either), demonstrating a cluster carrying no real founder
    // signal in either direction.
    const items: RawResearchItem[] = [
      makeRawItem({ url: "https://news.example/1", title: "Company X announces record quarterly earnings for Q3", sourceId: "rss" }),
      makeRawItem({ url: "https://news.example/2", title: "Industry report shows overall market growth this year", sourceId: "newsapi" }),
      makeRawItem({ url: "https://news.example/3", title: "New regulation announced affecting the sector broadly", sourceId: "rss" }),
    ];

    const result = computeDecisionFor("praise", items);
    logDecision("NEWS-ONLY (no pain, no buying intent)", result);

    expect(result.buyingIntentScore).toBe(0);
    const noSignalGate = result.decision.qualityGates.find((g) => g.name === "foisNoSignalPenalty");
    expect(noSignalGate?.fired).toBe(true);
    expect(result.decision.recommendation.verdict).toBe("IGNORE");
    expect(result.decision.recommendation.justification).toContain("foisNoSignalPenalty");
  });
});

/* -------------------------------------------------------------------- */
/* Part C — evidence intelligence + echo chamber                         */
/* -------------------------------------------------------------------- */

describe("decision.evidence (Part C)", () => {
  it("computes freshness=fresh for a same-day dateRange and freshness=unknown when no item has publishedAt", () => {
    const fresh = computeDecisionFor("complaint", [
      makeRawItem({ url: "https://fresh1", title: "This is so frustrating and annoying", sourceId: "reddit", publishedAt: new Date().toISOString() }),
      makeRawItem({ url: "https://fresh2", title: "Terrible, hate it, worst tool ever", sourceId: "hackernews", publishedAt: new Date().toISOString() }),
    ]);
    expect(fresh.decision.evidence.freshness).toBe("fresh");

    const unknown = computeDecisionFor("complaint", [
      makeRawItem({ url: "https://unk1", title: "This is so frustrating and annoying", sourceId: "reddit" }),
      makeRawItem({ url: "https://unk2", title: "Terrible, hate it, worst tool ever", sourceId: "hackernews" }),
    ]);
    expect(unknown.decision.evidence.freshness).toBe("unknown");
    expect(unknown.decision.evidence.explanation).toContain("No published-date metadata");
  });

  it("computes crossSourceAgreement as the count of distinct sources independently carrying the dominant intent", () => {
    const result = computeDecisionFor("buying-intent", [
      makeRawItem({ url: "https://cs1", title: "Willing to pay for this right now", sourceId: "reddit" }),
      makeRawItem({ url: "https://cs2", title: "I'd pay for this right now, sign me up", sourceId: "hackernews" }),
      makeRawItem({ url: "https://cs3", title: "Would be nice if this had dark mode too, but I'm willing to pay for this too", sourceId: "reddit" }),
    ]);
    const topIntent = result.decision.intentDistribution[0]!;
    expect(topIntent.intent).toBe("Buying Intent");
    // reddit and hackernews EACH independently carry >= 1 "Buying Intent" item.
    expect(result.decision.evidence.crossSourceAgreement).toBe(2);
  });

  it("flags echoChamber only at/above the 90% dominant-source-share threshold", () => {
    const notEcho = computeDecisionFor("complaint", [
      makeRawItem({ url: "https://ne1", title: "This is so frustrating", sourceId: "reddit" }),
      makeRawItem({ url: "https://ne2", title: "Terrible, hate it", sourceId: "hackernews" }),
    ]);
    expect(notEcho.decision.evidence.echoChamber).toBe(false);

    const echo = computeDecisionFor("complaint", [
      makeRawItem({ url: "https://e1", title: "This is so frustrating", sourceId: "reddit" }),
      makeRawItem({ url: "https://e2", title: "Terrible, hate it", sourceId: "reddit" }),
      makeRawItem({ url: "https://e3", title: "Awful, disappointing", sourceId: "reddit" }),
    ]);
    expect(echo.decision.evidence.echoChamber).toBe(true);
  });
});

/* -------------------------------------------------------------------- */
/* Part E — decision confidence contributors                             */
/* -------------------------------------------------------------------- */

describe("decision.confidence (Part E)", () => {
  it("always includes exactly 6 named, documented contributors, with relevanceQuality always contributing 0 points and always listed as a known gap", () => {
    const result = computeDecisionFor("complaint", [
      makeRawItem({ url: "https://c1", title: "This is so frustrating", sourceId: "reddit" }),
      makeRawItem({ url: "https://c2", title: "Terrible, hate it", sourceId: "hackernews" }),
    ]);
    const names = result.decision.confidence.contributors.map((c) => c.name);
    expect(names).toEqual(["evidenceStrength", "sourceDiversity", "freshness", "intentAgreement", "foisStability", "relevanceQuality"]);

    const relevance = result.decision.confidence.contributors.find((c) => c.name === "relevanceQuality")!;
    expect(relevance.points).toBe(0);
    expect(result.decision.confidence.weaknesses.some((w) => w.startsWith("Known gap (relevanceQuality)"))).toBe(true);
  });

  it("score is clamped to [0, 100] and band thresholds are consistent with the score", () => {
    const results = [
      computeDecisionFor("feature-request", [makeRawItem({ url: "https://b1", title: "Would be nice if this supported CSV export", sourceId: "reddit" })]),
      computeDecisionFor("complaint", [
        makeRawItem({ url: "https://b2", title: "This is so frustrating", sourceId: "reddit" }),
        makeRawItem({ url: "https://b3", title: "Terrible, hate it", sourceId: "hackernews" }),
      ]),
    ];
    for (const result of results) {
      const { score, band } = result.decision.confidence;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      if (band === "high") expect(score).toBeGreaterThanOrEqual(70);
      if (band === "medium") expect(score).toBeGreaterThanOrEqual(40);
      if (band === "low") expect(score).toBeLessThan(40);
    }
  });
});

/* -------------------------------------------------------------------- */
/* Part F/G — recommendation + quality gates                             */
/* -------------------------------------------------------------------- */

describe("decision.recommendation + qualityGates (Parts F/G)", () => {
  it("evaluates all 4 named gates on every call, fired or not", () => {
    const result = computeDecisionFor("complaint", [
      makeRawItem({ url: "https://g1", title: "This is so frustrating", sourceId: "reddit" }),
      makeRawItem({ url: "https://g2", title: "Terrible, hate it", sourceId: "hackernews" }),
    ]);
    const gateNames = result.decision.qualityGates.map((g) => g.name).sort();
    expect(gateNames).toEqual(["confidenceTooLow", "echoChamberNoBuyingIntent", "evidenceTooWeak", "foisNoSignalPenalty"].sort());
  });

  it("is reachable as WATCH: a moderate cluster with no fired gates and mid-range fois/confidence", () => {
    const now = Date.now();
    const items: RawResearchItem[] = [
      makeRawItem({ url: "https://w1", title: "This workflow is tedious and takes forever to finish", sourceId: "reddit", author: "a", publishedAt: new Date(now).toISOString() }),
      makeRawItem({ url: "https://w2", title: "So many manual steps, it's clunky and confusing to use", sourceId: "hackernews", author: "b", publishedAt: new Date(now - 1 * DAY_MS).toISOString() }),
      makeRawItem({ url: "https://w3", title: "I waste hours doing this by hand, it's very time-consuming", sourceId: "reddit", author: "c", publishedAt: new Date(now - 20 * DAY_MS).toISOString() }),
      makeRawItem({ url: "https://w4", title: "So many steps and it's clunky", sourceId: "hackernews", author: "d", publishedAt: new Date(now - 21 * DAY_MS).toISOString() }),
    ];

    const result = computeDecisionFor("workflow-friction", items);
    logDecision("MODERATE (workflow-friction, no buying intent)", result);

    expect(result.decision.qualityGates).toHaveLength(4);
    expect(result.decision.recommendation.verdict).toBe("WATCH");
    expect(result.decision.recommendation.justification).toContain("WATCH");
  });

  it("BUILD requires both fois.overall>=60 and confidence.band!=low, and no fired gate — justification cites the exact numbers", () => {
    const strong = computeDecisionFor("buying-intent", [
      makeRawItem({ url: "https://j1", title: "Willing to pay for this right now, it costs $40", sourceId: "reddit", author: "a", engagement: 10, publishedAt: new Date().toISOString() }),
      makeRawItem({ url: "https://j2", title: "I'd pay for this right now, sign me up", sourceId: "hackernews", author: "b", engagement: 10, publishedAt: new Date().toISOString() }),
      makeRawItem({ url: "https://j3", title: "Shut up and take my money", sourceId: "producthunt", author: "c", engagement: 10, publishedAt: new Date().toISOString() }),
      makeRawItem({ url: "https://j4", title: "Looking to buy something like this, our budget is approved", sourceId: "reddit", author: "d", engagement: 10, publishedAt: new Date().toISOString() }),
    ]);

    if (strong.decision.recommendation.verdict === "BUILD") {
      expect(strong.decision.recommendation.justification).toContain(`fois.overall=${strong.foisOverall}`);
      expect(strong.decision.recommendation.justification).toMatch(/>= 60/);
    }
    // Either way, the verdict must be internally consistent with the documented thresholds.
    const gatesFired = strong.decision.qualityGates.some((g) => g.fired);
    if (!gatesFired && strong.foisOverall >= 60 && strong.decision.confidence.band !== "low") {
      expect(strong.decision.recommendation.verdict).toBe("BUILD");
    }
  });
});

/* -------------------------------------------------------------------- */
/* Integration-level: wired into OpportunityEngine.analyze               */
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

function makeFounderReport(opportunities: Opportunity[]): FounderReport {
  return {
    topOpportunities: opportunities,
    evidence: [],
    confidenceScore: { band: "low", numericScore: 0 },
    sourceCoverage: { used: [], failed: [], skipped: [], ratio: 0 },
    generatedAt: new Date().toISOString(),
  };
}

function makeSession(opportunities: Opportunity[]): ResearchSession {
  return {
    id: "research_decision_fixture",
    windowDays: 30,
    startedAt: new Date().toISOString(),
    sourcesUsed: [],
    sourcesFailed: [],
    sourcesSkipped: [],
    opportunities,
    report: makeFounderReport(opportunities),
    totalItemsCollected: opportunities.flatMap((o) => o.supportingItems).length,
    durationMs: 0,
  };
}

describe("Founder Decision wired into OpportunityEngine.analyze (real pipeline)", () => {
  it("every opportunity in a real TopOpportunitiesReport carries a fully-populated `decision`", async () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://wire.example/1", title: "Willing to pay for a better tool, it costs $30", sourceId: "reddit", author: "a", publishedAt: new Date().toISOString() }),
      makeItem({ url: "https://wire.example/2", title: "Would pay for this instead of the current mess", sourceId: "hackernews", author: "b", publishedAt: new Date().toISOString() }),
      makeItem({ url: "https://wire.example/3", title: "This is so annoying and frustrating to use", sourceId: "reddit", author: "c" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Mixed", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { problemEngine, opportunityEngine } = harness();

    const problemReport = await problemEngine.analyze(session);
    const topReport = await opportunityEngine.analyze(session, problemReport);

    expect(topReport.opportunities.length).toBeGreaterThan(0);
    for (const opportunity of topReport.opportunities) {
      const { decision } = opportunity;
      expect(decision).toBeDefined();
      expect(Array.isArray(decision.intentDistribution)).toBe(true);
      expect(decision.evidence.evidenceCount).toBe(opportunity.supportingEvidence.evidenceCount);
      expect(["BUILD", "WATCH", "IGNORE"]).toContain(decision.recommendation.verdict);
      expect(["high", "medium", "low"]).toContain(decision.confidence.band);
      expect(decision.qualityGates.length).toBe(4);
      expect(decision.reasoning.whyThisMatters.length).toBeGreaterThan(0);
      // Existing `recommendation` field (BUILD/WAIT/IGNORE vocabulary) is untouched.
      expect(["BUILD", "WAIT", "IGNORE"]).toContain(opportunity.recommendation.verdict);
    }

    // eslint-disable-next-line no-console
    console.log(
      "\n[decision real-pipeline proof]\n" +
        topReport.opportunities
          .map((o) => `  - category=${o.category} fois.overall=${o.fois.overall} decision.verdict=${o.decision.recommendation.verdict} decision.confidence=${o.decision.confidence.band}(${o.decision.confidence.score})`)
          .join("\n"),
    );
  });
});
