import { describe, expect, it } from "vitest";
import { computeFounderIntelligence } from "../../src/opportunities/founder-intelligence.js";
import { computeAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
import { composeBusinessIntelligence } from "../../src/opportunities/business-intelligence.js";
import { composeMarketIntelligence } from "../../src/opportunities/market-intelligence.js";
import { composeRevenueIntelligence } from "../../src/opportunities/revenue-intelligence.js";
import { generateMvpScope } from "../../src/opportunities/mvp-generator.js";
import { composeGoToMarket } from "../../src/opportunities/go-to-market.js";
import { composeTechnicalBlueprint } from "../../src/opportunities/technical-blueprint.js";
import {
  defaultBusinessIntelligence,
  defaultMarketIntelligence,
  defaultRevenueIntelligence,
  defaultMvpPlan,
  defaultGoToMarket,
  defaultTechnicalBlueprint,
} from "../../src/opportunities/founder-business-intelligence.js";
import { defaultKnowledgeLinks } from "../../src/opportunities/knowledge-links.js";
import type {
  BuildDifficultyResult,
  BuyingIntentResult,
  CompetitionResult,
  CompetitorMention,
  FoisBreakdown,
  FounderDecision,
  FounderOpportunityReport,
  OpportunityCalibration,
  PricingSignal,
} from "../../src/opportunities/types.js";
import type { ProblemCategory, ProblemCluster } from "../../src/problems/types.js";
import type { RawResearchItem } from "../../src/research/types.js";

/* -------------------------------------------------------------------- */
/* Shared, hand-built fixture helpers — mirrors founder-intelligence.test.ts's
/* "minimal hand-built fixture" pattern for direct, deterministic control.  */
/* -------------------------------------------------------------------- */

function makeRawItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function makeCluster(overrides: Partial<ProblemCluster> & { category: ProblemCategory }): ProblemCluster {
  return {
    id: "cluster_1",
    normalizedStatement: "Users report a problem.",
    evidence: {
      evidenceCount: 5,
      sourceBreakdown: { reddit: 3, hackernews: 2 },
      originalUrls: ["https://a", "https://b"],
      representativeExamples: [makeRawItem({ url: "https://a", title: "Example complaint" })],
      engagementTotal: 10,
      dateRange: null,
    },
    frequency: {
      mentions: 5,
      uniqueAuthors: 3,
      uniqueSources: 2,
      engagementTotal: 10,
      growth: { label: "stable", recentHalfCount: 2, earlierHalfCount: 2, ratio: 1 },
    },
    confidence: { band: "medium", score: 0.5, explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    ...overrides,
  };
}

function makeCompetition(names: Array<{ name: string; mentionCount: number; evidenceUrls?: string[] }>): CompetitionResult {
  const competitors: CompetitorMention[] = names
    .map((n) => ({ name: n.name, mentionCount: n.mentionCount, evidenceUrls: n.evidenceUrls ?? [] }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
  if (competitors.length === 0) {
    return { competitors: [], competitionScore: 1, explanation: "No competitor mentions found in evidence." };
  }
  const competitionScore = 1 / (1 + competitors.length);
  return { competitors, competitionScore, explanation: `${competitors.length} competitor(s).` };
}

function makeBuyingIntent(score: number): BuyingIntentResult {
  return { score, matchingItemCount: score > 0 ? 1 : 0, totalItemCount: 5, explanation: "x" };
}

function makePricing(prices: number[]): PricingSignal {
  return {
    extractedPrices: [...prices].sort((a, b) => a - b),
    suggestedPriceText: prices.length > 0 ? `Prices found: ${prices.join(", ")}.` : "No price data mentioned in evidence.",
  };
}

function makeBuildDifficulty(tier: "low" | "medium" | "high", matchedSignals: string[] = []): BuildDifficultyResult {
  return { tier, matchedSignals, explanation: "heuristic estimate, not an engineering estimate" };
}

function makeFois(overall: number, extraDimensions: FoisBreakdown["dimensions"] = []): FoisBreakdown {
  return {
    overall,
    dimensions: [
      { name: "businessPain", raw: 50, weight: 0.15, weighted: 7.5, reason: "x", evidence: [] },
      { name: "urgency", raw: 50, weight: 0.1, weighted: 5, reason: "urgency dimension reason.", evidence: [] },
      { name: "commercialPotential", raw: 50, weight: 0.15, weighted: 7.5, reason: "commercial potential dimension reason.", evidence: [] },
      ...extraDimensions,
    ],
    reasons: [`fois.overall=${overall}/100 driven by businessPain.`],
    weaknesses: [],
    penalties: [],
  };
}

function makeDecision(overrides: Partial<FounderDecision> = {}): FounderDecision {
  return {
    intentDistribution: [{ intent: "Founder Pain", count: 3, fraction: 0.6 }],
    evidence: {
      evidenceCount: 5,
      uniqueSources: 2,
      uniqueAuthors: 3,
      freshness: "unknown",
      crossSourceAgreement: 1,
      echoChamber: false,
      explanation: "No echo-chamber risk detected (top source share 60% < 90% threshold).",
    },
    reasoning: {
      whyThisMatters: "5 piece(s) of evidence were found for \"Users report a problem.\" (category: complaint).",
      whyNow: "Mention volume is stable.",
      whoExperiences: "Evidence spans 2 unique source(s) and 3 unique author(s).",
      whatEvidence: "5 item(s) across sources: reddit=3, hackernews=2.",
      whyFoundersPay: "Buying-intent score is 0.40 (2/5 items show explicit or implicit purchase signal).",
      biggestUncertainty: "The weakest decision-confidence contributor is x.",
      biggestImplementationRisk: "Build difficulty is \"low\" (0 difficulty signal(s) matched).",
    },
    confidence: { score: 65, band: "medium", contributors: [], weaknesses: [] },
    recommendation: { verdict: "BUILD", justification: "fois.overall=70 >= 60.", primaryRisk: "x", primaryOpportunity: "x" },
    qualityGates: [
      { name: "evidenceTooWeak", fired: false, reason: "evidenceCount=5 >= 2." },
      { name: "confidenceTooLow", fired: false, reason: "band != low." },
      { name: "echoChamberNoBuyingIntent", fired: false, reason: "condition not met." },
      { name: "foisNoSignalPenalty", fired: false, reason: "no penalty." },
    ],
    ...overrides,
  };
}

function makeCalibration(overrides: Partial<OpportunityCalibration> = {}): OpportunityCalibration {
  return {
    metrics: {
      rankingStability: 0.5,
      signalDensity: 0.5,
      evidenceDensity: 2.5,
      crossSourceConsistency: 0.5,
      intentConsistency: 0.6,
      noiseRatio: 0,
      duplicateCompressionRatio: 0,
    },
    diagnostics: [
      { flag: "Weak Evidence", fired: false, reason: "evidenceCount=5 >= 3." },
      { flag: "Weak Buying Intent", fired: false, reason: "buyingIntent.score=0.40 >= 0.20." },
      { flag: "Low Diversity", fired: false, reason: "uniqueSources=2 >= 2." },
      { flag: "Echo Chamber", fired: false, reason: "no echo chamber." },
    ],
    ranking: { rankBefore: 1, rankAfter: 1, movement: 0, reason: "x" },
    explainability: null,
    falsePositive: { likely: false, reasons: [] },
    ...overrides,
  };
}

interface BuildReportParams {
  cluster: ProblemCluster;
  competition?: CompetitionResult;
  buyingIntent?: BuyingIntentResult;
  pricing?: PricingSignal;
  buildDifficulty?: BuildDifficultyResult;
  fois?: FoisBreakdown;
  decision?: FounderDecision;
  calibration?: OpportunityCalibration;
}

/**
 * Builds a full, internally-consistent `FounderOpportunityReport` by
 * reusing the REAL, already-shipped `computeFounderIntelligence` (Loop 7)
 * and `computeAiDecisionValidation` (Loop 8) composition functions
 * (imported read-only, never modified) over hand-built base inputs — this
 * guarantees every field the six new modules under test read
 * (`founderIntelligence`, `aiDecisionValidation`) is exactly what those
 * real upstream modules would produce, not a hand-faked shortcut.
 */
function buildReport(params: BuildReportParams): { report: FounderOpportunityReport; cluster: ProblemCluster } {
  const cluster = params.cluster;
  const competition = params.competition ?? makeCompetition([]);
  const buyingIntent = params.buyingIntent ?? makeBuyingIntent(0.4);
  const pricing = params.pricing ?? makePricing([]);
  const buildDifficulty = params.buildDifficulty ?? makeBuildDifficulty("low");
  const fois = params.fois ?? makeFois(70);
  const decision = params.decision ?? makeDecision();
  const calibration = params.calibration ?? makeCalibration();

  const founderIntelligence = computeFounderIntelligence({ cluster, competition, buyingIntent, pricing, buildDifficulty, fois, decision, calibration });
  const aiDecisionValidation = computeAiDecisionValidation({
    cluster,
    competition,
    buyingIntent,
    pricing,
    buildDifficulty,
    fois,
    decision,
    calibration,
    founderIntelligence,
  });

  const report: FounderOpportunityReport = {
    id: "report_1",
    clusterId: cluster.id,
    category: cluster.category,
    problem: cluster.normalizedStatement,
    summary: cluster.normalizedStatement,
    painScore: 50,
    buyingIntent,
    competition,
    confidence: { band: cluster.confidence.band, score: cluster.confidence.score },
    scoreBreakdown: {
      painFrequency: 50,
      sourceDiversity: 50,
      authorDiversity: 50,
      buyingIntent: buyingIntent.score * 100,
      engagement: 50,
      growth: 50,
      competition: competition.competitionScore * 100,
      confidence: cluster.confidence.score * 100,
      weightedTotal: 0.6,
      explanation: "x",
    },
    fois,
    supportingEvidence: {
      evidenceCount: cluster.evidence.evidenceCount,
      sourceBreakdown: cluster.evidence.sourceBreakdown,
      urls: cluster.evidence.originalUrls,
    },
    representativeQuotes: [{ text: "Example complaint", url: "https://a", source: "src-a" }],
    recommendedMvp: "Build a minimal version addressing the top evidenced pain.",
    suggestedPricing: pricing,
    targetUsers: "Users experiencing this problem.",
    buildDifficulty,
    estimatedTimeToMvp: "4-6 weeks",
    recommendation: { verdict: "BUILD", whyBuild: ["x"], whyNotBuild: [], risk: ["x"], explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    sourceProblemReportId: "problem_report_1",
    decision,
    semanticCluster: { canonicalTitle: cluster.normalizedStatement, aliases: [], mentionCount: cluster.evidence.evidenceCount, supportingSources: Object.keys(cluster.evidence.sourceBreakdown).sort(), mergedCount: 1 },
    calibration,
    founderIntelligence,
    aiDecisionValidation,
    businessIntelligence: defaultBusinessIntelligence(),
    marketIntelligence: defaultMarketIntelligence(),
    revenueIntelligence: defaultRevenueIntelligence(),
    mvpPlan: defaultMvpPlan(),
    goToMarket: defaultGoToMarket(),
    technicalBlueprint: defaultTechnicalBlueprint(),
    knowledgeLinks: defaultKnowledgeLinks(),
  };

  return { report, cluster };
}

/* ======================================================================= */
/* Phase 1 — business-intelligence.ts                                      */
/* ======================================================================= */

describe("Phase 1 — Business Intelligence", () => {
  it("is deterministic for a fixed input", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const { report } = buildReport({ cluster, pricing: makePricing([40]) });
    const a = composeBusinessIntelligence(report);
    const b = composeBusinessIntelligence(report);
    expect(a).toEqual(b);
  });

  it("emits NOT VERIFIED budgetEstimate when no price evidence exists", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster, pricing: makePricing([]) });
    const result = composeBusinessIntelligence(report);
    expect(result.budgetEstimate).toBe("NOT VERIFIED");
    expect(result.budgetConfidence).toBe("not-verified");
  });

  it("cites a real extracted price when pricing evidence exists", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const { report } = buildReport({
      cluster,
      pricing: makePricing([40]),
      competition: makeCompetition([{ name: "Trello", mentionCount: 5 }, { name: "Asana", mentionCount: 3 }, { name: "Notion", mentionCount: 2 }]),
    });
    const result = composeBusinessIntelligence(report);
    expect(result.budgetEstimate).toContain("$40");
    expect(result.budgetConfidence).not.toBe("not-verified");
  });

  it("classifies enterprise -> B2B and enterprise company size from real enterpriseVsSmb signal", () => {
    const cluster = makeCluster({
      category: "looking-for-alternative",
      evidence: {
        evidenceCount: 5,
        sourceBreakdown: { reddit: 5 },
        originalUrls: ["https://a"],
        representativeExamples: [makeRawItem({ url: "https://a", title: "We need an enterprise solution", body: "Our enterprise team needs this." })],
        engagementTotal: 10,
        dateRange: null,
      },
    });
    const { report } = buildReport({ cluster, competition: makeCompetition([{ name: "BigCo", mentionCount: 2 }]), pricing: makePricing([800]) });
    const result = composeBusinessIntelligence(report);
    expect(result.b2bVsB2c).toBe("B2B");
    expect(result.companySize).toBe("enterprise");
  });
});

/* ======================================================================= */
/* Phase 2 — market-intelligence.ts                                        */
/* ======================================================================= */

describe("Phase 2 — Market Intelligence", () => {
  it("is deterministic for a fixed input", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const a = composeMarketIntelligence(report, cluster);
    const b = composeMarketIntelligence(report, cluster);
    expect(a).toEqual(b);
  });

  it("geo/industry concentration is always the literal UNKNOWN sentinel (no backing field exists)", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const result = composeMarketIntelligence(report, cluster);
    expect(result.geoConcentration).toBe("UNKNOWN");
    expect(result.industryConcentration).toBe("UNKNOWN");
    expect(result.geoConcentrationReason.length).toBeGreaterThan(0);
    expect(result.industryConcentrationReason.length).toBeGreaterThan(0);
  });

  it("cites real growth label + marketMaturity to derive an 'opening' opportunity window", () => {
    const cluster = makeCluster({
      category: "missing-capability",
      frequency: {
        mentions: 5,
        uniqueAuthors: 3,
        uniqueSources: 2,
        engagementTotal: 10,
        growth: { label: "rising", recentHalfCount: 4, earlierHalfCount: 1, ratio: 4 },
      },
    });
    const { report } = buildReport({ cluster, competition: makeCompetition([]) });
    const result = composeMarketIntelligence(report, cluster);
    expect(result.marketMaturity).toBe("emerging");
    expect(result.opportunityWindow).toBe("opening");
    expect(result.opportunityWindowReason).toContain("rising");
  });

  it("declining growth -> closing opportunity window, declining growth stage", () => {
    const cluster = makeCluster({
      category: "complaint",
      frequency: {
        mentions: 5,
        uniqueAuthors: 3,
        uniqueSources: 2,
        engagementTotal: 10,
        growth: { label: "declining", recentHalfCount: 1, earlierHalfCount: 4, ratio: 0.25 },
      },
    });
    const { report } = buildReport({ cluster });
    const result = composeMarketIntelligence(report, cluster);
    expect(result.opportunityWindow).toBe("closing");
    expect(result.growthStage).toBe("declining");
  });
});

/* ======================================================================= */
/* Phase 3 — revenue-intelligence.ts                                       */
/* ======================================================================= */

describe("Phase 3 — Revenue Intelligence", () => {
  it("is deterministic for a fixed input", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const { report } = buildReport({ cluster, pricing: makePricing([40]) });
    const a = composeRevenueIntelligence(report);
    const b = composeRevenueIntelligence(report);
    expect(a).toEqual(b);
  });

  it("emits NOT VERIFIED possiblePricing / not-verified pricingConfidence when no pricing evidence exists", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster, pricing: makePricing([]) });
    const result = composeRevenueIntelligence(report);
    expect(result.possiblePricing).toContain("NOT VERIFIED");
    expect(result.pricingConfidence).toBe("not-verified");
  });

  it("cites a real extracted price in possiblePricing when pricing evidence exists", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const { report } = buildReport({ cluster, pricing: makePricing([40]) });
    const result = composeRevenueIntelligence(report);
    expect(result.possiblePricing).toContain("$40");
  });

  it("upsellPotential is not-verified with zero marketGaps, medium/high with real evidenced gaps", () => {
    const clusterNoGaps = makeCluster({ category: "praise" });
    const { report: reportNoGaps } = buildReport({ cluster: clusterNoGaps });
    expect(composeRevenueIntelligence(reportNoGaps).upsellPotential).toBe("not-verified");

    const clusterWithGaps = makeCluster({
      category: "missing-capability",
      conceptBreakdown: [
        { conceptId: "no-way-to-accomplish-task", canonicalStatement: "x", rootCause: "y", count: 6 },
        { conceptId: "missing-integration", canonicalStatement: "x", rootCause: "y", count: 4 },
        { conceptId: "api-undocumented-and-limited", canonicalStatement: "x", rootCause: "y", count: 3 },
      ],
    });
    const { report: reportWithGaps } = buildReport({ cluster: clusterWithGaps });
    const withGaps = composeRevenueIntelligence(reportWithGaps);
    expect(withGaps.upsellPotential).toBe("high");
    expect(withGaps.crossSellPotential).toBe("high"); // both "Weak Integrations" and "Missing API" evidenced
  });
});

/* ======================================================================= */
/* Phase 4 — mvp-generator.ts                                              */
/* ======================================================================= */

describe("Phase 4 — MVP Generator", () => {
  it("is deterministic for a fixed input", () => {
    const cluster = makeCluster({ category: "missing-capability", conceptBreakdown: [{ conceptId: "no-way-to-accomplish-task", canonicalStatement: "x", rootCause: "y", count: 5 }] });
    const { report } = buildReport({ cluster });
    const a = generateMvpScope(report);
    const b = generateMvpScope(report);
    expect(a).toEqual(b);
  });

  it("reuses topMvpFeatures/featuresToAvoid verbatim; empty featuresToAvoid when no complexity signal matched", () => {
    const cluster = makeCluster({ category: "missing-capability", conceptBreakdown: [{ conceptId: "no-way-to-accomplish-task", canonicalStatement: "x", rootCause: "y", count: 5 }] });
    const { report } = buildReport({ cluster, buildDifficulty: makeBuildDifficulty("low", []) });
    const result = generateMvpScope(report);
    expect(result.coreFeatures).toEqual(report.aiDecisionValidation.founderOpportunity.topMvpFeatures);
    expect(result.coreFeatures.length).toBeGreaterThan(0);
    expect(result.featuresToAvoidAtLaunch).toEqual([]);
  });

  it("cites real matched high-complexity signals in featuresToAvoidAtLaunch when present", () => {
    const cluster = makeCluster({ category: "missing-capability" });
    const { report } = buildReport({ cluster, buildDifficulty: makeBuildDifficulty("high", ["real-time collaboration", "payment processing"]) });
    const result = generateMvpScope(report);
    expect(result.featuresToAvoidAtLaunch).toEqual(["real-time collaboration", "payment processing"]);
    expect(result.phasedRoadmap[2]!.features).toEqual(["real-time collaboration", "payment processing"]);
  });

  it("recommendedMvp/estimatedTimeToMvp/buildDifficulty are reused verbatim from the report", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const result = generateMvpScope(report);
    expect(result.recommendedMvp).toBe(report.recommendedMvp);
    expect(result.estimatedTimeToMvp).toBe(report.estimatedTimeToMvp);
    expect(result.buildDifficulty).toBe(report.buildDifficulty.tier);
  });
});

/* ======================================================================= */
/* Phase 6 — go-to-market.ts                                               */
/* ======================================================================= */

describe("Phase 6 — Go-To-Market", () => {
  it("is deterministic for a fixed input", () => {
    const cluster = makeCluster({ category: "bug" });
    const { report } = buildReport({ cluster });
    const a = composeGoToMarket(report);
    const b = composeGoToMarket(report);
    expect(a).toEqual(b);
  });

  it("emits NOT VERIFIED positioningBasis when no differentiation strategy was evidenced", () => {
    const cluster = makeCluster({ category: "praise" });
    const { report } = buildReport({ cluster, competition: makeCompetition([]) });
    expect(report.founderIntelligence.differentiationStrategies).toEqual([]);
    const result = composeGoToMarket(report);
    expect(result.positioningBasis).toBe("NOT VERIFIED");
    expect(result.positioningStatement).toContain("NOT VERIFIED");
  });

  it("recommends developer-first channels from a real dominant GitHub source, and cites a real differentiation strategy in positioning", () => {
    const cluster = makeCluster({
      category: "missing-capability",
      evidence: {
        evidenceCount: 5,
        sourceBreakdown: { github: 5 },
        originalUrls: ["https://a"],
        representativeExamples: [makeRawItem({ url: "https://a", title: "product lacks capability" })],
        engagementTotal: 10,
        dateRange: null,
      },
      conceptBreakdown: [{ conceptId: "product-lacks-capability", canonicalStatement: "x", rootCause: "y", count: 5 }],
    });
    const { report } = buildReport({ cluster });
    expect(report.founderIntelligence.differentiationStrategies.length).toBeGreaterThan(0);
    const result = composeGoToMarket(report);
    expect(result.recommendedChannels[0]!.channel).toContain("Developer communities");
    expect(result.positioningBasis).not.toBe("NOT VERIFIED");
    expect(result.bestCustomer).toBe(report.founderIntelligence.founderOpportunity.bestCustomer);
    expect(result.launchStrategy).toBe(report.aiDecisionValidation.founderOpportunity.suggestedLaunchStrategy);
  });
});

/* ======================================================================= */
/* Phase 5 — technical-blueprint.ts                                        */
/* ======================================================================= */

describe("Phase 5 — Technical Blueprint (advisory)", () => {
  it("is deterministic for a fixed input", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const a = composeTechnicalBlueprint(report);
    const b = composeTechnicalBlueprint(report);
    expect(a).toEqual(b);
  });

  it("emits a NOT VERIFIED-prefixed AI-layer advisory when no 'Missing AI' gap or AI-first strategy was evidenced", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    expect(report.founderIntelligence.marketGaps.some((g) => g.gap === "Missing AI")).toBe(false);
    const result = composeTechnicalBlueprint(report);
    expect(result.aiLayerAdvice).toContain("NOT VERIFIED");
  });

  it("recommends an AI layer advisory when a real 'Missing AI' gap is evidenced", () => {
    const cluster = makeCluster({
      category: "missing-capability",
      conceptBreakdown: [{ conceptId: "ai-features-inaccurate", canonicalStatement: "x", rootCause: "y", count: 5 }],
    });
    const { report } = buildReport({ cluster });
    expect(report.founderIntelligence.marketGaps.some((g) => g.gap === "Missing AI")).toBe(true);
    const result = composeTechnicalBlueprint(report);
    expect(result.aiLayerAdvice).not.toContain("NOT VERIFIED");
    expect(result.aiLayerAdviceReason).toContain("Missing AI");
  });

  it("every advisory string is framed conditionally (advisory disclaimer present, never asserted as fact)", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster, buildDifficulty: makeBuildDifficulty("high", ["real-time collaboration"]) });
    const result = composeTechnicalBlueprint(report);
    expect(result.advisoryDisclaimer).toContain("ADVISORY");
    expect(result.architectureAdvice).toContain("For a typical product at this evidence profile");
  });

  it("prioritizes a public-API advisory when a real 'Missing API' gap is evidenced", () => {
    const cluster = makeCluster({
      category: "missing-capability",
      conceptBreakdown: [{ conceptId: "api-undocumented-and-limited", canonicalStatement: "x", rootCause: "y", count: 5 }],
    });
    const { report } = buildReport({ cluster });
    const result = composeTechnicalBlueprint(report);
    expect(result.apiAdvice).toContain("public API");
    expect(result.apiAdviceReason).toContain("Missing API");
  });
});
