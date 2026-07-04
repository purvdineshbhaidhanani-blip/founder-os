import { describe, expect, it } from "vitest";
import {
  computeBusinessViability,
  computeDifferentiationEngine,
  computeElimination,
  computeHighConvictionScore,
  computeMarketReplacementAnalysis,
  computeQualificationGates,
  selectTopOpportunities,
} from "../../src/opportunities/opportunity-selection.js";
import { defaultCalibration } from "../../src/opportunities/calibration.js";
import { defaultFounderIntelligence } from "../../src/opportunities/founder-intelligence.js";
import { defaultAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
import {
  defaultBusinessIntelligence,
  defaultGoToMarket,
  defaultMarketIntelligence,
  defaultMvpPlan,
  defaultRevenueIntelligence,
  defaultTechnicalBlueprint,
} from "../../src/opportunities/founder-business-intelligence.js";
import { defaultKnowledgeLinks } from "../../src/opportunities/knowledge-links.js";
import type {
  AiFounderRisk,
  BuildDifficultyResult,
  BuyingIntentResult,
  CompetitionResult,
  CompetitorMention,
  FoisBreakdown,
  FounderDecision,
  FounderOpportunityReport,
  OpportunityScoreBreakdown,
  PricingSignal,
  SemanticClusterInfo,
} from "../../src/opportunities/types.js";
import type { CauseChain, ClusterSeverity, ProblemCategory, ProblemCluster } from "../../src/problems/types.js";
import type { RawResearchItem } from "../../src/research/types.js";

/* ------------------------------------------------------------------------ */
/* Shared, hand-built fixture helpers — mirrors dedup.test.ts's /           */
/* ai-decision-validation.test.ts's "minimal hand-built fixture" pattern    */
/* for direct, deterministic control over every already-computed input.    */
/* ------------------------------------------------------------------------ */

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

function makeCompetition(names: Array<{ name: string; mentionCount: number }>): CompetitionResult {
  const competitors: CompetitorMention[] = names
    .map((n) => ({ name: n.name, mentionCount: n.mentionCount, evidenceUrls: [] }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
  if (competitors.length === 0) {
    return { competitors: [], competitionScore: 1, explanation: "No competitor mentions found in evidence." };
  }
  return { competitors, competitionScore: 1 / (1 + competitors.length), explanation: `${competitors.length} competitor(s).` };
}

function makeBuyingIntent(score: number): BuyingIntentResult {
  return { score, matchingItemCount: score > 0 ? 3 : 0, totalItemCount: 5, explanation: "x" };
}

function makePricing(prices: number[]): PricingSignal {
  return {
    extractedPrices: [...prices].sort((a, b) => a - b),
    suggestedPriceText: prices.length > 0 ? `Prices found: ${prices.join(", ")}.` : "No price data mentioned in evidence.",
  };
}

function makeBuildDifficulty(tier: "low" | "medium" | "high"): BuildDifficultyResult {
  return { tier, matchedSignals: [], explanation: "heuristic estimate, not an engineering estimate" };
}

function makeFois(overall: number): FoisBreakdown {
  return {
    overall,
    dimensions: [{ name: "businessPain", raw: 60, weight: 0.15, weighted: 9, reason: "x", evidence: [] }],
    reasons: [`fois.overall=${overall}/100.`],
    weaknesses: [],
    penalties: [],
  };
}

function makeDecision(overrides: Partial<FounderDecision> = {}): FounderDecision {
  return {
    intentDistribution: [{ intent: "Founder Pain", count: 3, fraction: 0.6 }],
    evidence: {
      evidenceCount: 5,
      uniqueSources: 3,
      uniqueAuthors: 4,
      freshness: "fresh",
      crossSourceAgreement: 3,
      echoChamber: false,
      explanation: "No echo-chamber risk detected.",
    },
    reasoning: {
      whyThisMatters: "5 piece(s) of real evidence were found for a real problem.",
      whyNow: "Mention volume is rising.",
      whoExperiences: "Evidence spans 3 unique source(s) and 4 unique author(s).",
      whatEvidence: "5 item(s) across sources: reddit=3, hackernews=2.",
      whyFoundersPay: "Buying-intent language was found directly in evidence.",
      biggestUncertainty: "Long-term retention is unproven.",
      biggestImplementationRisk: "Integration complexity is unproven.",
    },
    confidence: { score: 80, band: "high", contributors: [], weaknesses: [] },
    recommendation: { verdict: "BUILD", justification: "fois.overall clears the BUILD threshold with corroborated evidence.", primaryRisk: "x", primaryOpportunity: "y" },
    qualityGates: [],
    ...overrides,
  };
}

const semanticCluster: SemanticClusterInfo = {
  canonicalTitle: "Users report a problem.",
  aliases: [],
  mentionCount: 5,
  supportingSources: ["hackernews", "reddit"],
  mergedCount: 1,
};

function makeScoreBreakdown(weightedTotal: number): OpportunityScoreBreakdown {
  return {
    painFrequency: 0.5,
    sourceDiversity: 0.5,
    authorDiversity: 0.5,
    buyingIntent: 0.5,
    engagement: 0.5,
    growth: 0.5,
    competition: 0.5,
    confidence: 0.5,
    weightedTotal,
    explanation: "x",
  };
}

/**
 * Full, valid `FounderOpportunityReport` fixture with a "strong" evidence
 * profile baseline, overridable per-scenario via a deep-ish partial. Mirrors
 * dedup.test.ts's `makeReport` pattern (defaultXXX() placeholders + spread
 * overrides), but pre-populated with realistic values (not placeholders) on
 * every field this module actually reads, since opportunity-selection.ts
 * reads much deeper into founderIntelligence/businessIntelligence/
 * marketIntelligence/revenueIntelligence/aiDecisionValidation than dedup.ts
 * does.
 */
function makeReport(overrides: Partial<FounderOpportunityReport> = {}): FounderOpportunityReport {
  const base: FounderOpportunityReport = {
    id: "opp_1",
    clusterId: "cluster_1",
    category: "workflow-friction",
    problem: "Users report a problem.",
    summary: "s",
    painScore: 0.6,
    buyingIntent: makeBuyingIntent(0.7),
    competition: makeCompetition([{ name: "Trello", mentionCount: 2 }]),
    confidence: { band: "high", score: 0.8 },
    scoreBreakdown: makeScoreBreakdown(0.7),
    fois: makeFois(75),
    supportingEvidence: { evidenceCount: 5, sourceBreakdown: { reddit: 3, hackernews: 2 }, urls: ["https://a", "https://b"] },
    representativeQuotes: [],
    recommendedMvp: "x",
    suggestedPricing: makePricing([50]),
    targetUsers: "x",
    buildDifficulty: makeBuildDifficulty("low"),
    estimatedTimeToMvp: "2-4 weeks (heuristic estimate)",
    recommendation: { verdict: "BUILD", whyBuild: [], whyNotBuild: [], risk: [], explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    sourceProblemReportId: "report_1",
    decision: makeDecision(),
    semanticCluster,
    calibration: {
      ...defaultCalibration(),
      diagnostics: [
        { flag: "Weak Evidence", fired: false, reason: "evidenceCount=5 >= 3." },
        { flag: "Weak Buying Intent", fired: false, reason: "buyingIntent.score=0.70 >= 0.2." },
        { flag: "Low Diversity", fired: false, reason: "uniqueSources=3 >= 2." },
        { flag: "Echo Chamber", fired: false, reason: "No echo-chamber risk detected." },
        { flag: "Trending-only", fired: false, reason: "condition not met." },
        { flag: "News Spike", fired: false, reason: "No fired FOIS penalty." },
        { flag: "Speculation", fired: false, reason: "false" },
        { flag: "Single Mention", fired: false, reason: "evidenceCount=5 > 1." },
        { flag: "Sparse Cluster", fired: false, reason: "uniqueAuthors=4 > 1." },
        { flag: "Artificial Score Inflation", fired: false, reason: "broad-based score." },
      ],
      metrics: { ...defaultCalibration().metrics, crossSourceConsistency: 0.9, signalDensity: 0.8 },
      falsePositive: { likely: false, reasons: [] },
    },
    founderIntelligence: {
      ...defaultFounderIntelligence(),
      marketGaps: [
        { gap: "Missing AI", evidenceCount: 5, exampleConceptIds: [], confidence: "high" },
        { gap: "Manual Workflow", evidenceCount: 3, exampleConceptIds: [], confidence: "medium" },
      ],
      marketMaturity: { maturity: "growing", reasons: ["2 named competitor(s), rising growth."] },
      founderOpportunity: {
        ...defaultFounderIntelligence().founderOpportunity,
        soloFounderSuitability: "medium",
        expectedMvpComplexity: "low",
        bestPricingModel: "subscription",
      },
      competitionPressure: { pressure: "low", explanation: "1-2 named competitor(s) (validated demand, not yet saturated)." },
      differentiationStrategies: [
        { strategy: "AI-first", evidenceReason: "Missing AI gap evidenced." },
        { strategy: "Faster UX", evidenceReason: "Complex UX gap evidenced." },
      ],
    },
    aiDecisionValidation: {
      ...defaultAiDecisionValidation(),
      counterEvidence: [
        { claim: "problem is exaggerated", fired: false, reason: "evidenceCount=5 >= 3 and calibration.falsePositive.likely=false." },
        { claim: "market already saturated", fired: false, reason: 'marketMaturity="growing" -> not saturated/crowded.' },
        { claim: "users solved it manually", fired: false, reason: 'rootCause is not "Manual Process".' },
        { claim: "competitors already dominate", fired: false, reason: 'competitionPressure="low" -> not high.' },
        {
          claim: "demand may be temporary",
          fired: true,
          reason: 'painTemporaryOrRecurring="temporary" derived from a documented declining-window edge case for this fixture.',
        },
      ],
      risks: [
        { risk: "Market Risk", score: 20, reason: "Low market risk evidenced.", supportingEvidence: [] },
        { risk: "Competition Risk", score: 20, reason: "Low competition risk evidenced.", supportingEvidence: [] },
        { risk: "Execution Risk", score: 20, reason: "Low execution risk evidenced.", supportingEvidence: [] },
        { risk: "Technical Risk", score: 20, reason: "Low technical risk evidenced.", supportingEvidence: [] },
        { risk: "Distribution Risk", score: 20, reason: "uniqueSources=3 -> low distribution risk.", supportingEvidence: [] },
        { risk: "Monetization Risk", score: 20, reason: "2 price point(s) found -> low monetization risk.", supportingEvidence: [] },
        { risk: "Timing Risk", score: 85, reason: "painTemporaryOrRecurring=\"temporary\" AND cluster.trending is not true -- the window may be closing.", supportingEvidence: [] },
        { risk: "Platform Risk", score: 20, reason: "Low platform risk evidenced.", supportingEvidence: [] },
      ] as AiFounderRisk[],
      explainability: {
        ...defaultAiDecisionValidation().explainability,
        whyBuild: 'decision.recommendation.verdict="BUILD": fois.overall clears the BUILD threshold with corroborated evidence.',
      },
      finalRecommendation: {
        ...defaultAiDecisionValidation().finalRecommendation,
        unknowns: ['subscriptionViability="unsupported" -- no buying-intent or pricing signal exists to confirm recurring willingness-to-pay.'],
      },
    },
    businessIntelligence: {
      ...defaultBusinessIntelligence(),
      switchingDifficulty: "low",
      switchingDifficultyReason: 'report.category="workflow-friction" evidences no direct switching signal but no lock-in either.',
      companySize: "smb",
      budgetEstimate: "Comparable evidence-extracted price point(s): $50 (Prices found: 50.)",
      budgetConfidence: "high",
      urgency: "high",
      expansionPotential: "supported",
      revenueModel: "recurring",
    },
    marketIntelligence: {
      ...defaultMarketIntelligence(),
      marketMaturity: "growing",
      growthStage: "growing",
      growthStageReason: 'marketMaturity.maturity="growing" -> growing market.',
      competitionPressure: "low",
    },
    revenueIntelligence: {
      ...defaultRevenueIntelligence(),
      revenuePotential: "high",
      pricingConfidence: "high",
      possiblePricing: 'Suggested model: "subscription". Comparable evidence-extracted price point(s): $50.',
      expansionPotential: "supported",
    },
    mvpPlan: defaultMvpPlan(),
    goToMarket: defaultGoToMarket(),
    technicalBlueprint: { ...defaultTechnicalBlueprint(), expectedMvpComplexity: "low" },
    knowledgeLinks: defaultKnowledgeLinks(),
  };

  return { ...base, ...overrides };
}

const strongCluster: ProblemCluster = makeCluster({
  category: "workflow-friction",
  rootCause: "Manual Process",
  normalizedStatement: "Users manually copy data between tools every day.",
  frequency: {
    mentions: 20,
    uniqueAuthors: 8,
    uniqueSources: 3,
    engagementTotal: 40,
    growth: { label: "rising", recentHalfCount: 12, earlierHalfCount: 8, ratio: 1.5 },
  },
  evidence: {
    evidenceCount: 20,
    sourceBreakdown: { reddit: 10, hackernews: 6, producthunt: 4 },
    originalUrls: ["https://a", "https://b", "https://c"],
    representativeExamples: [makeRawItem({ url: "https://a", title: "I do this manually every day" })],
    engagementTotal: 40,
    dateRange: null,
  },
  severity: {
    severity: 82,
    frequency: 80,
    urgency: 70,
    businessImpact: 75,
    timeCost: "high",
    moneyCost: "high",
    emotionalFriction: 60,
    developerFriction: 40,
    customerFriction: 60,
    reasons: ["High frequency and high money cost from Manual Process root cause."],
  } as ClusterSeverity,
  evidenceQualityScore: 0.85,
  symptoms: ["copy and paste between tools", "no api available", "too many manual steps"],
});

describe("computeQualificationGates", () => {
  it("returns real PASS verdicts for a strong-evidence, differentiation-backed, growing-market opportunity", () => {
    const report = makeReport({ clusterId: strongCluster.id });
    const gates = computeQualificationGates(report, strongCluster);

    expect(gates).toHaveLength(10);
    const byName = Object.fromEntries(gates.map((g) => [g.gate, g]));

    expect(byName["Recurring problem"]!.status).toBe("PASS");
    expect(byName["Recurring problem"]!.evidence.join(" ")).toContain("rising");
    expect(byName["Expensive problem"]!.status).toBe("PASS");
    expect(byName["Expensive problem"]!.evidence.join(" ")).toContain("moneyCost=\"high\"");
    expect(byName["Actively trying to solve"]!.status).toBe("PASS");
    expect(byName["Paying today"]!.status).toBe("PASS");
    expect(byName["Switching tools"]!.status).toBe("PASS");
    expect(byName["Competitors failing"]!.status).toBe("PASS");
    expect(byName["Market growing"]!.status).toBe("PASS");
    expect(byName["Better solution realistic"]!.status).toBe("PASS");
    expect(byName["Sufficient multi-source evidence"]!.status).toBe("PASS");

    // Every gate cites a real, non-empty reason and evidence list.
    for (const g of gates) {
      expect(g.reason.length).toBeGreaterThan(0);
      expect(Array.isArray(g.evidence)).toBe(true);
    }
  });

  it("gate 10 FAILs for single-source echo-chamber evidence", () => {
    const echoCluster = makeCluster({ category: "complaint", frequency: { mentions: 1, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 1, growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null } } });
    const report = makeReport({
      clusterId: echoCluster.id,
      decision: makeDecision({
        evidence: { evidenceCount: 1, uniqueSources: 1, uniqueAuthors: 1, freshness: "unknown", crossSourceAgreement: 0, echoChamber: true, explanation: "1 source accounts for 100% of evidence." },
      }),
    });
    const gates = computeQualificationGates(report, echoCluster);
    const gate10 = gates.find((g) => g.gate === "Sufficient multi-source evidence")!;
    expect(gate10.status).toBe("FAIL");
    expect(gate10.evidence.join(" ")).toContain("uniqueSources=1");
    expect(gate10.reason).toContain("echoChamber=true");
  });

  it("leaves several genuinely-absent-signal gates UNKNOWN rather than guessing, on a thin-evidence opportunity", () => {
    const thinCluster = makeCluster({
      category: "complaint",
      frequency: { mentions: 2, uniqueAuthors: 2, uniqueSources: 2, engagementTotal: 2, growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null } },
      // no severity, no rootCause, no conceptBreakdown, no symptoms
    });
    const report = makeReport({
      clusterId: thinCluster.id,
      category: "complaint",
      competition: makeCompetition([]),
      founderIntelligence: {
        ...defaultFounderIntelligence(),
        marketMaturity: { maturity: "crowded", reasons: ["ambiguous evidence"] },
      },
      aiDecisionValidation: { ...defaultAiDecisionValidation() }, // counterEvidence=[] -> gate 6 defensive UNKNOWN branch
      businessIntelligence: { ...defaultBusinessIntelligence() }, // budgetEstimate="NOT VERIFIED"
      marketIntelligence: { ...defaultMarketIntelligence(), marketMaturity: "crowded" },
      revenueIntelligence: { ...defaultRevenueIntelligence() }, // pricingConfidence="not-verified"
    });

    const gates = computeQualificationGates(report, thinCluster);
    const byName = Object.fromEntries(gates.map((g) => [g.gate, g]));

    expect(byName["Recurring problem"]!.status).toBe("UNKNOWN");
    expect(byName["Expensive problem"]!.status).toBe("UNKNOWN");
    expect(byName["Actively trying to solve"]!.status).toBe("UNKNOWN");
    expect(byName["Paying today"]!.status).toBe("UNKNOWN");
    expect(byName["Switching tools"]!.status).toBe("UNKNOWN");
    expect(byName["Competitors failing"]!.status).toBe("UNKNOWN");
    expect(byName["Market growing"]!.status).toBe("UNKNOWN");
    expect(byName["Better solution realistic"]!.status).toBe("UNKNOWN");
    expect(byName["Solo founder can build MVP"]!.status).toBe("UNKNOWN");

    // Never silently defaults to FAIL for these — proves "never guess" is real.
    const unknownCount = gates.filter((g) => g.status === "UNKNOWN").length;
    expect(unknownCount).toBeGreaterThanOrEqual(8);
  });
});

describe("computeElimination", () => {
  it("does not reject the strong-evidence opportunity", () => {
    const report = makeReport({ clusterId: strongCluster.id });
    const verdict = computeElimination(report, strongCluster);
    expect(verdict.rejected).toBe(false);
    expect(verdict.reasons).toEqual([]);
  });

  it("rejects a single-source, weak-evidence, weak-buying-intent opportunity with real cited reasons", () => {
    const echoCluster = makeCluster({ category: "complaint" });
    const report = makeReport({
      clusterId: echoCluster.id,
      buyingIntent: makeBuyingIntent(0),
      calibration: {
        ...defaultCalibration(),
        diagnostics: [
          { flag: "Weak Evidence", fired: true, reason: "evidenceCount=1 < 3." },
          { flag: "Weak Buying Intent", fired: true, reason: "buyingIntent.score=0.00 < 0.2." },
          { flag: "Low Diversity", fired: true, reason: "uniqueSources=1 < 2." },
          { flag: "Echo Chamber", fired: true, reason: "1 source accounts for 100% of evidence." },
        ],
      },
    });

    const verdict = computeElimination(report, echoCluster);
    expect(verdict.rejected).toBe(true);
    expect(verdict.reasons.some((r) => r.startsWith("Single source"))).toBe(true);
    expect(verdict.reasons.some((r) => r.startsWith("Weak evidence"))).toBe(true);
    expect(verdict.reasons.some((r) => r.startsWith("Weak buying intent"))).toBe(true);
    // Every reason cites the real triggering value, never a generic message.
    for (const reason of verdict.reasons) {
      expect(reason).toMatch(/=|"/);
    }
  });

  it("rejects a praise-dominant 'already solved' opportunity", () => {
    const praiseCluster = makeCluster({ category: "praise" });
    const report = makeReport({ clusterId: praiseCluster.id, category: "praise" });
    const verdict = computeElimination(report, praiseCluster);
    expect(verdict.rejected).toBe(true);
    expect(verdict.reasons.some((r) => r.includes("Already-solved-with-strong-satisfaction"))).toBe(true);
    expect(verdict.reasons.some((r) => r.includes('report.category="praise"'))).toBe(true);
  });

  it("rejects when no differentiation strategy exists", () => {
    const cluster = makeCluster({ category: "complaint" });
    const report = makeReport({
      clusterId: cluster.id,
      founderIntelligence: { ...defaultFounderIntelligence() }, // differentiationStrategies=[]
    });
    const verdict = computeElimination(report, cluster);
    expect(verdict.rejected).toBe(true);
    expect(verdict.reasons.some((r) => r.startsWith("No differentiation"))).toBe(true);
  });
});

describe("computeDifferentiationEngine", () => {
  it("composes real, cited fields from competition/marketGaps/symptoms", () => {
    const report = makeReport({ clusterId: strongCluster.id });
    const result = computeDifferentiationEngine(report, strongCluster);

    expect(result.currentSolution).toBe("Trello");
    expect(result.biggestComplaints).toEqual(strongCluster.symptoms);
    expect(result.aiOpportunities.length).toBeGreaterThan(0);
    expect(result.aiOpportunities[0]).toContain("Missing AI");
    expect(result.workflowOpportunities[0]).toContain("Manual Workflow");
    expect(result.whyUsersWouldSwitch).toContain("evidence-backed");
  });

  it("honestly reports 'no named competitor' and 'no switching reason' when no gaps/strategies exist", () => {
    const cluster = makeCluster({ category: "complaint" });
    const report = makeReport({
      clusterId: cluster.id,
      competition: makeCompetition([]),
      founderIntelligence: { ...defaultFounderIntelligence() },
    });
    const result = computeDifferentiationEngine(report, cluster);
    expect(result.currentSolution).toBe("no named competitor evidenced");
    expect(result.whyUsersWouldSwitch).toContain("No evidence-backed market gap or differentiation strategy");
  });
});

describe("computeMarketReplacementAnalysis", () => {
  it("derives all 5 tiers and a composite replacementFeasibility from real fields", () => {
    const report = makeReport({ clusterId: strongCluster.id });
    const result = computeMarketReplacementAnalysis(report);
    expect(result.switchFriction).toBe("low");
    expect(result.learningCurve).toBe("low");
    expect(["high", "medium", "low", "unknown"]).toContain(result.replacementFeasibility);
    expect(result.replacementFeasibilityReason).toContain("Average friction score");
  });
});

describe("computeBusinessViability", () => {
  it("computes a real viabilityTier from revenue/business intelligence fields, retentionLikelihood always unknown", () => {
    const report = makeReport({ clusterId: strongCluster.id });
    const result = computeBusinessViability(report, strongCluster);
    expect(result.retentionLikelihood).toBe("unknown");
    expect(result.retentionLikelihoodReason).toContain("has ever been measured");
    expect(result.businessFrequency).toBe(strongCluster.frequency.mentions);
    expect(result.viabilityTier).toBe("high");
  });
});

describe("computeHighConvictionScore", () => {
  it("scores the strong opportunity highly with 8 dimensions summing weights to 1.0", () => {
    const report = makeReport({ clusterId: strongCluster.id });
    const hcs = computeHighConvictionScore(report, strongCluster);

    expect(hcs.dimensions).toHaveLength(8);
    const weightSum = hcs.dimensions.reduce((sum, d) => sum + d.weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 9);
    expect(hcs.overall).toBeGreaterThanOrEqual(0);
    expect(hcs.overall).toBeLessThanOrEqual(100);
    expect(hcs.overall).toBeGreaterThan(60);

    for (const dim of hcs.dimensions) {
      expect(dim.weighted).toBeCloseTo(dim.raw * dim.weight, 6);
      expect(dim.reason.length).toBeGreaterThan(0);
    }
  });

  it("penalizes confidenceStability when calibration.falsePositive.likely is true", () => {
    const cluster = makeCluster({ category: "complaint" });
    const withPenalty = makeReport({
      clusterId: cluster.id,
      calibration: { ...defaultCalibration(), falsePositive: { likely: true, reasons: ["News Spike fired."] } },
    });
    const withoutPenalty = makeReport({
      clusterId: cluster.id,
      calibration: { ...defaultCalibration(), falsePositive: { likely: false, reasons: [] } },
    });

    const scoredWithPenalty = computeHighConvictionScore(withPenalty, cluster).dimensions.find((d) => d.name === "confidenceStability")!;
    const scoredWithoutPenalty = computeHighConvictionScore(withoutPenalty, cluster).dimensions.find((d) => d.name === "confidenceStability")!;
    expect(scoredWithPenalty.raw).toBeLessThan(scoredWithoutPenalty.raw);
  });
});

describe("selectTopOpportunities", () => {
  function buildCandidates(): { reports: FounderOpportunityReport[]; clusters: ProblemCluster[] } {
    const clusters: ProblemCluster[] = [];
    const reports: FounderOpportunityReport[] = [];

    // 1 strong survivor candidate (rank should be #1)
    clusters.push(strongCluster);
    reports.push(makeReport({ id: "opp_strong", clusterId: strongCluster.id }));

    // 6 more qualifying (non-eliminated) candidates with descending buying
    // intent / differentiation so they rank below the strong one and exercise
    // the top-5 cap.
    for (let i = 0; i < 6; i += 1) {
      const cluster = makeCluster({
        id: `cluster_mid_${i}`,
        category: "workflow-friction",
        frequency: { mentions: 8, uniqueAuthors: 4, uniqueSources: 2, engagementTotal: 8, growth: { label: "stable", recentHalfCount: 4, earlierHalfCount: 4, ratio: 1 } },
      });
      clusters.push(cluster);
      reports.push(
        makeReport({
          id: `opp_mid_${i}`,
          clusterId: cluster.id,
          buyingIntent: makeBuyingIntent(0.5 - i * 0.05),
          founderIntelligence: {
            ...defaultFounderIntelligence(),
            marketGaps: [{ gap: "Missing Features", evidenceCount: 2, exampleConceptIds: [], confidence: "medium" }],
            marketMaturity: { maturity: "growing", reasons: ["x"] },
            competitionPressure: { pressure: "low", explanation: "x" },
            differentiationStrategies: [{ strategy: "Faster UX", evidenceReason: "x" }],
          },
        }),
      );
    }

    // 2 Part-B-eliminated candidates: one praise-dominant, one single-source echo chamber.
    const praiseCluster = makeCluster({ id: "cluster_praise", category: "praise" });
    clusters.push(praiseCluster);
    reports.push(makeReport({ id: "opp_praise", clusterId: praiseCluster.id, category: "praise" }));

    const echoCluster = makeCluster({ id: "cluster_echo", category: "complaint" });
    clusters.push(echoCluster);
    reports.push(
      makeReport({
        id: "opp_echo",
        clusterId: echoCluster.id,
        buyingIntent: makeBuyingIntent(0),
        calibration: {
          ...defaultCalibration(),
          diagnostics: [
            { flag: "Weak Evidence", fired: true, reason: "evidenceCount=1 < 3." },
            { flag: "Low Diversity", fired: true, reason: "uniqueSources=1 < 2." },
          ],
        },
      }),
    );

    return { reports, clusters };
  }

  it("caps survivors at 5, ranks by High Conviction Score, and accounts for every report exactly once", () => {
    const { reports, clusters } = buildCandidates();
    const result = selectTopOpportunities(reports, clusters);

    expect(result.survivors.length).toBeLessThanOrEqual(5);
    expect(result.survivors.length + result.rejected.length).toBe(reports.length);

    // The strong candidate should survive and rank #1.
    const strongSurvivor = result.survivors.find((s) => s.report.id === "opp_strong");
    expect(strongSurvivor).toBeDefined();
    expect(strongSurvivor!.whySurvived).toContain("Ranked #1");

    // Survivor scores are non-increasing.
    for (let i = 1; i < result.survivors.length; i += 1) {
      expect(result.survivors[i - 1]!.highConvictionScore.overall).toBeGreaterThanOrEqual(result.survivors[i]!.highConvictionScore.overall);
    }

    // Part-B-eliminated candidates are rejected with their real elimination reason.
    const praiseRejected = result.rejected.find((r) => r.reportId === "opp_praise");
    expect(praiseRejected).toBeDefined();
    expect(praiseRejected!.whyRejected.some((r) => r.includes("Already-solved-with-strong-satisfaction"))).toBe(true);

    const echoRejected = result.rejected.find((r) => r.reportId === "opp_echo");
    expect(echoRejected).toBeDefined();
    expect(echoRejected!.whyRejected.some((r) => r.startsWith("Single source") || r.startsWith("Weak evidence"))).toBe(true);

    // Below-cap qualifying candidates are rejected with a distinct
    // "below the top 5 survivor cap" reason (not conflated with elimination).
    const belowCapRejections = result.rejected.filter((r) => r.whyRejected.some((why) => why.includes("below the top 5 survivor cap")));
    expect(belowCapRejections.length).toBeGreaterThan(0);
    for (const r of belowCapRejections) {
      expect(r.reportId).not.toBe("opp_praise");
      expect(r.reportId).not.toBe("opp_echo");
    }
  });

  it("populates a real, non-generic self-critique for every survivor", () => {
    const { reports, clusters } = buildCandidates();
    const result = selectTopOpportunities(reports, clusters);
    const strongSurvivor = result.survivors.find((s) => s.report.id === "opp_strong")!;
    const { selfCritique } = strongSurvivor;

    expect(selfCritique.reasonsToBuild.length).toBeGreaterThan(0);
    for (const reason of selfCritique.reasonsToBuild) {
      expect(reason).not.toContain("Placeholder");
    }

    expect(selfCritique.reasonsNotToBuild.length).toBeGreaterThan(0);
    expect(selfCritique.reasonsNotToBuild[0]).toContain("demand may be temporary");

    expect(selfCritique.strongestRisk.risk).toBe("Timing Risk");
    expect(selfCritique.strongestRisk.score).toBe(85);
    expect(selfCritique.strongestRisk.reason).toContain("painTemporaryOrRecurring");

    expect(selfCritique.strongestUnknown).toContain("subscriptionViability");

    expect(selfCritique.evidenceStillMissing.length).toBeGreaterThan(0);

    expect(selfCritique.customerInterviewsRequired.length).toBeGreaterThan(0);
    // soloFounderSuitability="medium" -> gate 9 UNKNOWN -> a real, mapped interview question (not the generic fallback).
    expect(selfCritique.customerInterviewsRequired.some((q) => q.includes("minimum feature set"))).toBe(true);
  });
});
