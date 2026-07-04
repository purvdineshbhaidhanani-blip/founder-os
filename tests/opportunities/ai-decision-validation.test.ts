import { describe, expect, it } from "vitest";
import {
  attachAiDecisionValidation,
  computeAiDecisionValidation,
  defaultAiDecisionValidation,
} from "../../src/opportunities/ai-decision-validation.js";
import type {
  BuildDifficultyResult,
  BuyingIntentResult,
  CompetitionResult,
  CompetitorMention,
  FoisBreakdown,
  FounderDecision,
  FounderIntelligence,
  FounderIntelligenceRisk,
  FounderOpportunityReport,
  OpportunityCalibration,
  PricingSignal,
} from "../../src/opportunities/types.js";
import type { CauseChain, ProblemCategory, ProblemCluster } from "../../src/problems/types.js";
import type { RawResearchItem } from "../../src/research/types.js";
import {
  defaultBusinessIntelligence,
  defaultMarketIntelligence,
  defaultRevenueIntelligence,
  defaultMvpPlan,
  defaultGoToMarket,
  defaultTechnicalBlueprint,
} from "../../src/opportunities/founder-business-intelligence.js";
import { defaultKnowledgeLinks } from "../../src/opportunities/knowledge-links.js";

/* -------------------------------------------------------------------- */
/* Shared, hand-built fixture helpers — mirrors founder-intelligence.   */
/* test.ts's "minimal hand-built fixture" pattern for direct,           */
/* deterministic control over every already-computed input.             */
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
  return { competitors, competitionScore: 1 / (1 + competitors.length), explanation: `${competitors.length} competitor(s).` };
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

function makeFois(overall: number, overrides: Partial<FoisBreakdown> = {}): FoisBreakdown {
  return {
    overall,
    dimensions: [{ name: "businessPain", raw: 50, weight: 0.2, weighted: 10, reason: "x", evidence: [] }],
    reasons: [`fois.overall=${overall}/100 driven by businessPain.`],
    weaknesses: [],
    penalties: [],
    ...overrides,
  };
}

function makeDecision(overrides: Partial<FounderDecision> = {}): FounderDecision {
  return {
    intentDistribution: [{ intent: "Founder Pain", count: 3, fraction: 0.6 }],
    evidence: {
      evidenceCount: 5,
      uniqueSources: 2,
      uniqueAuthors: 3,
      freshness: "fresh",
      crossSourceAgreement: 1,
      echoChamber: false,
      explanation: "No echo-chamber risk detected (top source share 60% < 90% threshold).",
    },
    reasoning: {
      whyThisMatters: "5 piece(s) of evidence were found for a real problem.",
      whyNow: "Mention volume is stable.",
      whoExperiences: "Evidence spans 2 unique source(s) and 3 unique author(s).",
      whatEvidence: "5 item(s) across sources: reddit=3, hackernews=2.",
      whyFoundersPay: "Buying-intent score is 0.40 (2/5 items show explicit or implicit purchase signal).",
      biggestUncertainty: "The weakest decision-confidence contributor is x.",
      biggestImplementationRisk: "Build difficulty is \"low\" (0 difficulty signal(s) matched).",
    },
    confidence: { score: 80, band: "high", contributors: [], weaknesses: [] },
    recommendation: { verdict: "BUILD", justification: "fois.overall=70 >= 60.", primaryRisk: "x risk", primaryOpportunity: "x opportunity" },
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
    ],
    ranking: { rankBefore: 1, rankAfter: 1, movement: 0, reason: "x" },
    explainability: null,
    falsePositive: { likely: false, reasons: [] },
    ...overrides,
  };
}

const DEFAULT_RISKS: FounderIntelligenceRisk[] = [
  { risk: "Market Risk", severity: "low", explanation: "marketMaturity=\"emerging\" -> low market risk." },
  { risk: "Execution Risk", severity: "low", explanation: "buildDifficulty.tier=\"low\" -> low execution risk." },
  { risk: "Technical Risk", severity: "low", explanation: "0 build-difficulty signal(s) matched -> low technical risk." },
  { risk: "Pricing Risk", severity: "low", explanation: "Price data present -> low pricing risk." },
  { risk: "Competition Risk", severity: "low", explanation: "competitionPressure=\"low\" -> low competition risk." },
  { risk: "Customer Risk", severity: "low", explanation: "No echo-chamber risk -> low customer risk." },
  { risk: "Platform Risk", severity: "low", explanation: "40% of evidence from one platform -> low platform risk." },
  { risk: "Regulation Risk", severity: "low", explanation: "No regulated-industry phrase found -> low regulation risk." },
];

function makeFounderIntelligence(overrides: Partial<FounderIntelligence> = {}): FounderIntelligence {
  return {
    competitorIntelligence: {
      primaryCompetitors: [],
      competitorCategory: "no established competitors identified in evidence",
      marketMaturity: "emerging",
      openSourceVsSaas: "unknown",
      enterpriseVsSmb: "unknown",
      soloFounderFriendlyCompetitors: [],
      pricingEvidence: null,
      competitorConfidence: "unknown",
      competitorEvidence: [],
      explanation: "No competitors were extracted from evidence.",
    },
    marketGaps: [],
    marketMaturity: { maturity: "emerging", reasons: ["0 named competitor(s) found in evidence."] },
    founderOpportunity: {
      shouldBuild: true,
      why: ["x"],
      whyNot: [],
      bestCustomer: "developers/technical users",
      whyThisCustomer: "Dominant evidence source is github.",
      bestPricingModel: "subscription",
      expectedBuildDifficulty: "low",
      expectedMvpComplexity: "low",
      soloFounderSuitability: "high",
    },
    competitionPressure: { pressure: "low", explanation: "x" },
    differentiationStrategies: [],
    risks: DEFAULT_RISKS,
    ...overrides,
  };
}

interface ComputeParams {
  cluster: ProblemCluster;
  competition?: CompetitionResult;
  buyingIntent?: BuyingIntentResult;
  pricing?: PricingSignal;
  buildDifficulty?: BuildDifficultyResult;
  fois?: FoisBreakdown;
  decision?: FounderDecision;
  calibration?: OpportunityCalibration;
  founderIntelligence?: FounderIntelligence;
}

function compute(params: ComputeParams) {
  return computeAiDecisionValidation({
    cluster: params.cluster,
    competition: params.competition ?? makeCompetition([]),
    buyingIntent: params.buyingIntent ?? makeBuyingIntent(0.4),
    pricing: params.pricing ?? makePricing([]),
    buildDifficulty: params.buildDifficulty ?? makeBuildDifficulty("low"),
    fois: params.fois ?? makeFois(70),
    decision: params.decision ?? makeDecision(),
    calibration: params.calibration ?? makeCalibration(),
    founderIntelligence: params.founderIntelligence ?? makeFounderIntelligence(),
  });
}

/* -------------------------------------------------------------------- */
/* Module 1 — Decision Reasoning                                        */
/* -------------------------------------------------------------------- */

describe("Module 1 — Decision Reasoning", () => {
  it("actualBusinessProblem / whyExists cite real cluster.rootCause / causeChain when present, honest fallback when absent", () => {
    const withRootCause = makeCluster({
      category: "complaint",
      rootCause: "Poor UX",
      causeChain: {
        observedProblem: "x",
        underlyingCause: "Poor UX",
        businessCause: "Users churn when the UX is confusing.",
        technicalCause: "No dedicated UX review process.",
      } satisfies CauseChain,
    });
    const withResult = compute({ cluster: withRootCause });
    expect(withResult.decisionReasoning.actualBusinessProblem).toContain("Poor UX");
    expect(withResult.decisionReasoning.whyExists).toContain("Users churn when the UX is confusing.");
    expect(withResult.decisionReasoning.whyExists).toContain("No dedicated UX review process.");

    const withoutRootCause = makeCluster({ category: "complaint", rootCause: undefined, causeChain: undefined });
    const withoutResult = compute({ cluster: withoutRootCause });
    expect(withoutResult.decisionReasoning.actualBusinessProblem).toContain("no specific root cause was identified");
    expect(withoutResult.decisionReasoning.whyExists).toContain("cluster.causeChain is absent");
  });

  it("whyCurrentSolutionsFailing reuses real marketGaps, with an explicit honest fallback when empty", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const withGaps = compute({
      cluster,
      founderIntelligence: makeFounderIntelligence({
        marketGaps: [{ gap: "Expensive Pricing", evidenceCount: 6, exampleConceptIds: ["automation-too-expensive"], confidence: "high" }],
      }),
    });
    expect(withGaps.decisionReasoning.whyCurrentSolutionsFailing).toContain("Expensive Pricing");
    expect(withGaps.decisionReasoning.whyCurrentSolutionsFailing).toContain("6 evidence item(s)");

    const withoutGaps = compute({ cluster, founderIntelligence: makeFounderIntelligence({ marketGaps: [] }) });
    expect(withoutGaps.decisionReasoning.whyCurrentSolutionsFailing).toBe(
      "No specific solution-failure evidence collected beyond the base complaint",
    );
  });

  it("evidenceSupporting/evidenceWeakening reuse decision.reasoning / fired gates+weaknesses+diagnostics verbatim, never regenerated", () => {
    const cluster = makeCluster({ category: "complaint" });
    const decision = makeDecision({
      qualityGates: [{ name: "confidenceTooLow", fired: true, reason: "band=low." }],
    });
    const fois = makeFois(40, { weaknesses: ["Weak businessPain dimension."] });
    const calibration = makeCalibration({ diagnostics: [{ flag: "Weak Evidence", fired: true, reason: "evidenceCount=1 < 3." }] });

    const result = compute({ cluster, decision, fois, calibration });
    expect(result.decisionReasoning.evidenceSupporting).toContain(decision.reasoning.whyThisMatters);
    expect(result.decisionReasoning.evidenceSupporting).toContain(decision.reasoning.whyFoundersPay);
    expect(result.decisionReasoning.evidenceWeakening.some((s) => s.includes("confidenceTooLow"))).toBe(true);
    expect(result.decisionReasoning.evidenceWeakening).toContain("Weak businessPain dimension.");
    expect(result.decisionReasoning.evidenceWeakening.some((s) => s.includes("Weak Evidence"))).toBe(true);
  });

  it("painTemporaryOrRecurring maps cluster.frequency.growth.label exactly: rising/stable->recurring, declining->temporary, insufficient-data->unknown", () => {
    const growthLabels: Array<[ProblemCluster["frequency"]["growth"]["label"], "temporary" | "recurring" | "unknown"]> = [
      ["rising", "recurring"],
      ["stable", "recurring"],
      ["declining", "temporary"],
      ["insufficient-data", "unknown"],
    ];
    for (const [label, expected] of growthLabels) {
      const cluster = makeCluster({
        category: "complaint",
        frequency: { mentions: 5, uniqueAuthors: 3, uniqueSources: 2, engagementTotal: 10, growth: { label, recentHalfCount: 1, earlierHalfCount: 1, ratio: 1 } },
      });
      const result = compute({ cluster });
      expect(result.decisionReasoning.painTemporaryOrRecurring).toBe(expected);
    }
  });
});

/* -------------------------------------------------------------------- */
/* Module 2 — Counter-Evidence Engine                                    */
/* -------------------------------------------------------------------- */

describe("Module 2 — Counter-Evidence Engine", () => {
  it("always returns exactly the 5 fixed claims, each with fired + a real reason, even when none fire", () => {
    const cluster = makeCluster({ category: "bug", rootCause: "Missing Integration" });
    const result = compute({
      cluster,
      decision: makeDecision({ evidence: { ...makeDecision().evidence, evidenceCount: 10 } }),
      calibration: makeCalibration({ falsePositive: { likely: false, reasons: [] } }),
      founderIntelligence: makeFounderIntelligence({ marketMaturity: { maturity: "emerging", reasons: ["x"] }, competitionPressure: { pressure: "low", explanation: "x" } }),
    });
    expect(result.counterEvidence).toHaveLength(5);
    expect(result.counterEvidence.map((c) => c.claim)).toEqual([
      "problem is exaggerated",
      "market already saturated",
      "users solved it manually",
      "competitors already dominate",
      "demand may be temporary",
    ]);
    for (const claim of result.counterEvidence) {
      expect(claim.reason.length).toBeGreaterThan(0);
    }
    expect(result.counterEvidence.every((c) => c.fired === false)).toBe(true);
  });

  it("is genuinely capable of firing 2+ claims against a nominal BUILD verdict on real data", () => {
    const cluster = makeCluster({
      category: "complaint",
      rootCause: "Manual Process",
      evidence: { evidenceCount: 2, sourceBreakdown: { reddit: 2 }, originalUrls: [], representativeExamples: [], engagementTotal: 0, dateRange: null },
      frequency: { mentions: 2, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 0, growth: { label: "declining", recentHalfCount: 1, earlierHalfCount: 3, ratio: 0.33 } },
    });
    const decision = makeDecision({
      recommendation: { verdict: "BUILD", justification: "x", primaryRisk: "x", primaryOpportunity: "x" },
      evidence: { evidenceCount: 2, uniqueSources: 1, uniqueAuthors: 1, freshness: "stale", crossSourceAgreement: 0, echoChamber: false, explanation: "x" },
    });
    const founderIntelligence = makeFounderIntelligence({
      marketMaturity: { maturity: "saturated", reasons: ["x"] },
      competitionPressure: { pressure: "high", explanation: "x" },
    });
    const result = compute({ cluster, decision, founderIntelligence });
    const firedClaims = result.counterEvidence.filter((c) => c.fired);
    expect(firedClaims.length).toBeGreaterThanOrEqual(2);
    expect(firedClaims.map((c) => c.claim)).toContain("market already saturated");
    expect(firedClaims.map((c) => c.claim)).toContain("users solved it manually");
    expect(firedClaims.map((c) => c.claim)).toContain("competitors already dominate");
    expect(firedClaims.map((c) => c.claim)).toContain("demand may be temporary");
  });
});

/* -------------------------------------------------------------------- */
/* Module 3 — BUILD/WATCH/IGNORE Validation                              */
/* -------------------------------------------------------------------- */

describe("Module 3 — BUILD/WATCH/IGNORE Validation", () => {
  it("strong BUILD fixture: no counter-evidence claim overrides it — validatedRecommendation stays BUILD, reason states no override", () => {
    const cluster = makeCluster({
      category: "bug",
      rootCause: "Missing Integration",
      evidence: { evidenceCount: 10, sourceBreakdown: { github: 6, stackoverflow: 4 }, originalUrls: [], representativeExamples: [], engagementTotal: 20, dateRange: null },
      frequency: { mentions: 10, uniqueAuthors: 6, uniqueSources: 2, engagementTotal: 20, growth: { label: "rising", recentHalfCount: 7, earlierHalfCount: 3, ratio: 2.33 } },
      trending: true,
    });
    const decision = makeDecision({
      recommendation: { verdict: "BUILD", justification: "fois.overall=80 >= 60.", primaryRisk: "x", primaryOpportunity: "x" },
      evidence: { evidenceCount: 10, uniqueSources: 2, uniqueAuthors: 6, freshness: "fresh", crossSourceAgreement: 2, echoChamber: false, explanation: "x" },
    });
    const founderIntelligence = makeFounderIntelligence({
      marketMaturity: { maturity: "emerging", reasons: ["x"] },
      competitionPressure: { pressure: "low", explanation: "x" },
    });
    const result = compute({ cluster, decision, founderIntelligence, calibration: makeCalibration({ falsePositive: { likely: false, reasons: [] } }) });

    expect(result.counterEvidence.filter((c) => c.fired)).toHaveLength(0);
    expect(result.validation.validatedRecommendation).toBe("BUILD");
    expect(result.validation.validationReason).toContain("No override");
    expect(result.validation.confidenceAdjustment).toBe(0);
    expect(result.finalRecommendation.recommendedAction).toBe("BUILD");
  });

  it("2+ counter-evidence claims firing against a nominal BUILD DOES downgrade to WATCH, loudly citing the exact fired claims", () => {
    const cluster = makeCluster({
      category: "complaint",
      rootCause: "Manual Process",
      evidence: { evidenceCount: 2, sourceBreakdown: { reddit: 2 }, originalUrls: [], representativeExamples: [], engagementTotal: 0, dateRange: null },
      frequency: { mentions: 2, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 0, growth: { label: "declining", recentHalfCount: 1, earlierHalfCount: 3, ratio: 0.33 } },
    });
    const decision = makeDecision({
      recommendation: { verdict: "BUILD", justification: "x", primaryRisk: "x", primaryOpportunity: "x" },
      evidence: { evidenceCount: 2, uniqueSources: 1, uniqueAuthors: 1, freshness: "stale", crossSourceAgreement: 0, echoChamber: false, explanation: "x" },
      confidence: { score: 80, band: "high", contributors: [], weaknesses: [] },
    });
    const founderIntelligence = makeFounderIntelligence({
      marketMaturity: { maturity: "saturated", reasons: ["x"] },
      competitionPressure: { pressure: "high", explanation: "x" },
    });
    const result = compute({ cluster, decision, founderIntelligence, calibration: makeCalibration({ falsePositive: { likely: true, reasons: ["x"] } }) });

    const firedClaims = result.counterEvidence.filter((c) => c.fired);
    expect(firedClaims.length).toBeGreaterThanOrEqual(2);
    expect(result.validation.validatedRecommendation).toBe("WATCH");
    expect(result.validation.validationReason).toContain("Override");
    expect(result.validation.validationReason).toContain("BUILD -> WATCH");
    for (const claim of firedClaims) {
      expect(result.validation.validationReason).toContain(claim.claim);
    }
    expect(result.validation.confidenceAdjustment).toBeLessThan(0);
    expect(result.finalRecommendation.recommendedAction).toBe("WATCH");
  });

  it("never upgrades a verdict, and never downgrades WATCH -> IGNORE, even with every counter-evidence claim firing", () => {
    const cluster = makeCluster({
      category: "complaint",
      rootCause: "Manual Process",
      evidence: { evidenceCount: 1, sourceBreakdown: { reddit: 1 }, originalUrls: [], representativeExamples: [], engagementTotal: 0, dateRange: null },
      frequency: { mentions: 1, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 0, growth: { label: "declining", recentHalfCount: 0, earlierHalfCount: 1, ratio: 0 } },
    });
    const founderIntelligence = makeFounderIntelligence({
      marketMaturity: { maturity: "saturated", reasons: ["x"] },
      competitionPressure: { pressure: "very-high", explanation: "x" },
    });
    const calibration = makeCalibration({ falsePositive: { likely: true, reasons: ["x"] } });

    const watchResult = compute({
      cluster,
      founderIntelligence,
      calibration,
      decision: makeDecision({ recommendation: { verdict: "WATCH", justification: "x", primaryRisk: "x", primaryOpportunity: "x" } }),
    });
    expect(watchResult.counterEvidence.filter((c) => c.fired).length).toBe(5);
    expect(watchResult.validation.validatedRecommendation).toBe("WATCH"); // never downgraded further to IGNORE

    const ignoreResult = compute({
      cluster,
      founderIntelligence: makeFounderIntelligence({
        marketMaturity: { maturity: "emerging", reasons: ["x"] },
        competitionPressure: { pressure: "very-low", explanation: "x" },
      }),
      calibration: makeCalibration({ falsePositive: { likely: false, reasons: [] } }),
      decision: makeDecision({
        recommendation: { verdict: "IGNORE", justification: "x", primaryRisk: "x", primaryOpportunity: "x" },
        evidence: { evidenceCount: 10, uniqueSources: 3, uniqueAuthors: 5, freshness: "fresh", crossSourceAgreement: 2, echoChamber: false, explanation: "x" },
      }),
      cluster: makeCluster({ category: "complaint", rootCause: "Missing Integration", frequency: { mentions: 5, uniqueAuthors: 3, uniqueSources: 2, engagementTotal: 5, growth: { label: "rising", recentHalfCount: 3, earlierHalfCount: 1, ratio: 3 } } }),
    });
    expect(ignoreResult.validation.validatedRecommendation).toBe("IGNORE"); // never upgraded even with 0 claims fired
  });
});

/* -------------------------------------------------------------------- */
/* Module 4 — Founder Risk Engine (always all 8 present)                 */
/* -------------------------------------------------------------------- */

describe("Module 4 — Founder Risk Engine", () => {
  it("always returns exactly the 8 fixed risks in the documented order, each with a real, non-empty reason", () => {
    const cluster = makeCluster({ category: "complaint" });
    const result = compute({ cluster });
    expect(result.risks.map((r) => r.risk)).toEqual([
      "Market Risk",
      "Competition Risk",
      "Execution Risk",
      "Technical Risk",
      "Distribution Risk",
      "Monetization Risk",
      "Timing Risk",
      "Platform Risk",
    ]);
    for (const risk of result.risks) {
      expect(risk.reason.length).toBeGreaterThan(0);
      expect(risk.score).toBeGreaterThanOrEqual(0);
      expect(risk.score).toBeLessThanOrEqual(100);
    }
  });

  it("5 reused risks (Market/Competition/Execution/Technical/Platform) mirror founderIntelligence.risks severity via the fixed score table", () => {
    const cluster = makeCluster({ category: "complaint" });
    const founderIntelligence = makeFounderIntelligence({
      risks: DEFAULT_RISKS.map((r) => (r.risk === "Market Risk" ? { ...r, severity: "high" as const, explanation: "saturated market" } : r)),
    });
    const result = compute({ cluster, founderIntelligence });
    const marketRisk = result.risks.find((r) => r.risk === "Market Risk")!;
    expect(marketRisk.score).toBe(85); // high -> 85
    expect(marketRisk.reason).toContain("saturated market");
  });

  it("Distribution Risk: fewer unique sources -> higher risk", () => {
    const cluster = makeCluster({ category: "complaint" });
    const oneSource = compute({ cluster, decision: makeDecision({ evidence: { ...makeDecision().evidence, uniqueSources: 1 } }) });
    const threeSources = compute({ cluster, decision: makeDecision({ evidence: { ...makeDecision().evidence, uniqueSources: 3 } }) });
    const oneSourceRisk = oneSource.risks.find((r) => r.risk === "Distribution Risk")!;
    const threeSourceRisk = threeSources.risks.find((r) => r.risk === "Distribution Risk")!;
    expect(oneSourceRisk.score).toBeGreaterThan(threeSourceRisk.score);
  });

  it("Monetization Risk: null pricingEvidence -> high risk; 2+ price points -> low risk", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const noPricing = compute({ cluster, founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: null } }) });
    const withPricing = compute({
      cluster,
      founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: makePricing([20, 40]) } }),
    });
    expect(noPricing.risks.find((r) => r.risk === "Monetization Risk")!.score).toBe(85);
    expect(withPricing.risks.find((r) => r.risk === "Monetization Risk")!.score).toBe(20);
  });

  it("Timing Risk: temporary pain with no trending flag -> high risk; recurring pain -> low risk", () => {
    const decliningCluster = makeCluster({
      category: "complaint",
      frequency: { mentions: 5, uniqueAuthors: 3, uniqueSources: 2, engagementTotal: 5, growth: { label: "declining", recentHalfCount: 1, earlierHalfCount: 4, ratio: 0.25 } },
      trending: undefined,
    });
    const risingCluster = makeCluster({
      category: "complaint",
      frequency: { mentions: 5, uniqueAuthors: 3, uniqueSources: 2, engagementTotal: 5, growth: { label: "rising", recentHalfCount: 4, earlierHalfCount: 1, ratio: 4 } },
      trending: true,
    });
    const decliningResult = compute({ cluster: decliningCluster });
    const risingResult = compute({ cluster: risingCluster });
    expect(decliningResult.risks.find((r) => r.risk === "Timing Risk")!.score).toBe(85);
    expect(risingResult.risks.find((r) => r.risk === "Timing Risk")!.score).toBe(20);
  });
});

/* -------------------------------------------------------------------- */
/* Module 5 — Founder Opportunity Engine                                 */
/* -------------------------------------------------------------------- */

describe("Module 5 — Founder Opportunity Engine", () => {
  it("idealCustomerProfile/corePain reuse real founderIntelligence/cluster fields verbatim", () => {
    const cluster = makeCluster({ category: "complaint", normalizedStatement: "Users can't export their data." });
    const result = compute({ cluster, founderIntelligence: makeFounderIntelligence({ founderOpportunity: { ...makeFounderIntelligence().founderOpportunity, bestCustomer: "cost-conscious SMB users", whyThisCustomer: "Dominant source is reddit." } }) });
    expect(result.founderOpportunity.idealCustomerProfile).toContain("cost-conscious SMB users");
    expect(result.founderOpportunity.idealCustomerProfile).toContain("Dominant source is reddit.");
    expect(result.founderOpportunity.corePain).toBe("Users can't export their data.");
  });

  it("whoShouldNotBeTargeted branches on enterpriseVsSmb exactly as documented", () => {
    const cluster = makeCluster({ category: "complaint" });
    const nonEnterprise = compute({ cluster, founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, enterpriseVsSmb: "smb" } }) });
    expect(nonEnterprise.founderOpportunity.whoShouldNotBeTargeted).toContain("Enterprise buyers");

    const enterprise = compute({ cluster, founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, enterpriseVsSmb: "enterprise" } }) });
    expect(enterprise.founderOpportunity.whoShouldNotBeTargeted).toContain("Individual/hobbyist users");
  });

  it("earlyAdopterProfile cites the real dominant evidence source", () => {
    const githubCluster = makeCluster({
      category: "bug",
      evidence: { evidenceCount: 4, sourceBreakdown: { github: 3, reddit: 1 }, originalUrls: [], representativeExamples: [], engagementTotal: 0, dateRange: null },
    });
    const result = compute({ cluster: githubCluster });
    expect(result.founderOpportunity.earlyAdopterProfile).toContain("technical early adopters");
    expect(result.founderOpportunity.earlyAdopterProfile).toContain("github");
  });

  it("topMvpFeatures reuses marketGaps, capped at 3, even when more gaps exist", () => {
    const cluster = makeCluster({ category: "missing-capability" });
    const founderIntelligence = makeFounderIntelligence({
      marketGaps: [
        { gap: "Missing Features", evidenceCount: 10, exampleConceptIds: [], confidence: "high" },
        { gap: "Complex UX", evidenceCount: 8, exampleConceptIds: [], confidence: "high" },
        { gap: "Weak Integrations", evidenceCount: 6, exampleConceptIds: [], confidence: "medium" },
        { gap: "Poor Onboarding", evidenceCount: 2, exampleConceptIds: [], confidence: "low" },
      ],
    });
    const result = compute({ cluster, founderIntelligence });
    expect(result.founderOpportunity.topMvpFeatures).toHaveLength(3);
    expect(result.founderOpportunity.topMvpFeatures[0]).toContain("Missing Features");
  });

  it("featuresToAvoid reuses buildDifficulty.matchedSignals, empty array (never invented) when none matched", () => {
    const cluster = makeCluster({ category: "complaint" });
    const withSignals = compute({ cluster, buildDifficulty: makeBuildDifficulty("high", ["machine learning", "real-time", "compliance"]) });
    expect(withSignals.founderOpportunity.featuresToAvoid).toEqual(["machine learning", "real-time", "compliance"]);

    const withoutSignals = compute({ cluster, buildDifficulty: makeBuildDifficulty("low", []) });
    expect(withoutSignals.founderOpportunity.featuresToAvoid).toEqual([]);
  });

  it("suggestedLaunchStrategy: emerging+solo-friendly -> direct launch; saturated+not-solo-friendly -> differentiated wedge", () => {
    const cluster = makeCluster({ category: "complaint" });
    const direct = compute({
      cluster,
      founderIntelligence: makeFounderIntelligence({
        marketMaturity: { maturity: "emerging", reasons: ["x"] },
        founderOpportunity: { ...makeFounderIntelligence().founderOpportunity, soloFounderSuitability: "high" },
      }),
    });
    expect(direct.founderOpportunity.suggestedLaunchStrategy).toContain("Direct launch");

    const wedge = compute({
      cluster,
      founderIntelligence: makeFounderIntelligence({
        marketMaturity: { maturity: "saturated", reasons: ["x"] },
        founderOpportunity: { ...makeFounderIntelligence().founderOpportunity, soloFounderSuitability: "low" },
      }),
    });
    expect(wedge.founderOpportunity.suggestedLaunchStrategy).toContain("differentiated wedge");
  });
});

/* -------------------------------------------------------------------- */
/* Module 6 — Monetization Reasoning                                     */
/* -------------------------------------------------------------------- */

describe("Module 6 — Monetization Reasoning", () => {
  it("no-pricing-evidence fixture -> pricingConfidence=not-verified and the literal string 'NOT VERIFIED' in possiblePricing, never a fabricated number", () => {
    const cluster = makeCluster({ category: "complaint" });
    const result = compute({
      cluster,
      founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: null } }),
    });
    expect(result.monetization.pricingConfidence).toBe("not-verified");
    expect(result.monetization.possiblePricing).toContain("NOT VERIFIED");
    expect(result.monetization.possiblePricing).not.toMatch(/\$\d/);
  });

  it("with real pricing evidence, cites the actual extracted price numbers, never a different/invented one", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const pricing = makePricing([29, 99]);
    const result = compute({
      cluster,
      founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: pricing, competitorConfidence: "medium" } }),
    });
    expect(result.monetization.pricingConfidence).toBe("medium");
    expect(result.monetization.possiblePricing).toContain("$29");
    expect(result.monetization.possiblePricing).toContain("$99");
  });

  it("subscriptionViability/enterprisePotential default to not-verified absent a real signal, never guessed", () => {
    const cluster = makeCluster({ category: "complaint" });
    const result = compute({
      cluster,
      buyingIntent: makeBuyingIntent(0),
      founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: null, enterpriseVsSmb: "unknown" } }),
    });
    expect(result.monetization.subscriptionViability).toBe("not-verified");
    expect(result.monetization.enterprisePotential).toBe("not-verified");
  });

  it("subscriptionViability supported when buying intent is strong", () => {
    const cluster = makeCluster({ category: "buying-intent" });
    const result = compute({ cluster, buyingIntent: makeBuyingIntent(0.8) });
    expect(result.monetization.subscriptionViability).toBe("supported");
  });
});

/* -------------------------------------------------------------------- */
/* Module 7 — AI Confidence Review                                       */
/* -------------------------------------------------------------------- */

describe("Module 7 — AI Confidence Review", () => {
  it("shows verdict='justified' with no reduction on a clean (0-fired-claims) fixture", () => {
    const cluster = makeCluster({
      category: "bug",
      rootCause: "Missing Integration",
      evidence: { evidenceCount: 10, sourceBreakdown: { github: 6, stackoverflow: 4 }, originalUrls: [], representativeExamples: [], engagementTotal: 20, dateRange: null },
      frequency: { mentions: 10, uniqueAuthors: 6, uniqueSources: 2, engagementTotal: 20, growth: { label: "rising", recentHalfCount: 7, earlierHalfCount: 3, ratio: 2.33 } },
    });
    const decision = makeDecision({ confidence: { score: 80, band: "high", contributors: [], weaknesses: [] } });
    const founderIntelligence = makeFounderIntelligence({ marketMaturity: { maturity: "emerging", reasons: ["x"] }, competitionPressure: { pressure: "low", explanation: "x" } });
    const result = compute({ cluster, decision, founderIntelligence, calibration: makeCalibration({ falsePositive: { likely: false, reasons: [] } }) });

    expect(result.reviewedConfidence.verdict).toBe("justified");
    expect(result.reviewedConfidence.originalScore).toBe(80);
    expect(result.reviewedConfidence.adjustedScore).toBeCloseTo(0.8, 5);
    expect(result.reviewedConfidence.adjustment).toBe(0);
  });

  it("shows a real reduction on a counter-evidence-heavy fixture, never increasing confidence", () => {
    const cluster = makeCluster({
      category: "complaint",
      rootCause: "Manual Process",
      evidence: { evidenceCount: 1, sourceBreakdown: { reddit: 1 }, originalUrls: [], representativeExamples: [], engagementTotal: 0, dateRange: null },
      frequency: { mentions: 1, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 0, growth: { label: "declining", recentHalfCount: 0, earlierHalfCount: 1, ratio: 0 } },
    });
    const decision = makeDecision({ confidence: { score: 80, band: "high", contributors: [], weaknesses: [] } });
    const founderIntelligence = makeFounderIntelligence({ marketMaturity: { maturity: "saturated", reasons: ["x"] }, competitionPressure: { pressure: "very-high", explanation: "x" } });
    const result = compute({ cluster, decision, founderIntelligence, calibration: makeCalibration({ falsePositive: { likely: true, reasons: ["x"] } }) });

    expect(result.counterEvidence.filter((c) => c.fired).length).toBe(5);
    expect(result.reviewedConfidence.verdict).toBe("reduced");
    expect(result.reviewedConfidence.originalScore).toBe(80);
    expect(result.reviewedConfidence.adjustedScore).toBeLessThan(0.8);
    expect(result.reviewedConfidence.adjustment).toBeLessThan(0);
    // Floor: 5 claims * -0.1 = -0.5, so adjustedScore is clamped, never negative.
    expect(result.reviewedConfidence.adjustedScore).toBeGreaterThanOrEqual(0);
  });
});

/* -------------------------------------------------------------------- */
/* Module 8 — Decision Explainability                                    */
/* -------------------------------------------------------------------- */

describe("Module 8 — Decision Explainability", () => {
  it("every field is populated and cites real, already-computed values", () => {
    const cluster = makeCluster({ category: "complaint" });
    const result = compute({ cluster });
    expect(result.explainability.whyBuild.length).toBeGreaterThan(0);
    expect(result.explainability.whyWait.length).toBeGreaterThan(0);
    expect(result.explainability.whyIgnore.length).toBeGreaterThan(0);
    expect(result.explainability.evidenceThatMattersMost.length).toBeGreaterThan(0);
    expect(result.explainability.evidenceMissing.length).toBeGreaterThan(0);
    expect(result.explainability.whatCouldChangeThis.length).toBeGreaterThan(0);
  });

  it("whatCouldChangeThis cites the actual fired counter-evidence claims when an override happened", () => {
    const cluster = makeCluster({
      category: "complaint",
      rootCause: "Manual Process",
      evidence: { evidenceCount: 2, sourceBreakdown: { reddit: 2 }, originalUrls: [], representativeExamples: [], engagementTotal: 0, dateRange: null },
      frequency: { mentions: 2, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 0, growth: { label: "declining", recentHalfCount: 1, earlierHalfCount: 3, ratio: 0.33 } },
    });
    const founderIntelligence = makeFounderIntelligence({ marketMaturity: { maturity: "saturated", reasons: ["x"] }, competitionPressure: { pressure: "high", explanation: "x" } });
    const result = compute({ cluster, founderIntelligence, calibration: makeCalibration({ falsePositive: { likely: true, reasons: ["x"] } }) });
    expect(result.validation.validatedRecommendation).toBe("WATCH");
    expect(result.explainability.whatCouldChangeThis).toContain("market already saturated");
  });
});

/* -------------------------------------------------------------------- */
/* Module 9 — Final Founder Recommendation                               */
/* -------------------------------------------------------------------- */

describe("Module 9 — Final Founder Recommendation", () => {
  it("executiveSummary is template-composed citing real numbers: category, fois.overall, validatedRecommendation, evidenceCount", () => {
    const cluster = makeCluster({ category: "bug" });
    const result = compute({ cluster, fois: makeFois(72) });
    expect(result.finalRecommendation.executiveSummary).toContain("bug");
    expect(result.finalRecommendation.executiveSummary).toContain("72");
    expect(result.finalRecommendation.executiveSummary).toContain(result.validation.validatedRecommendation);
    expect(result.finalRecommendation.executiveSummary).toContain("5 evidence item(s)");
  });

  it("aggregates real unknowns/NOT VERIFIED signals from Modules 1-7, never inventing one", () => {
    const cluster = makeCluster({
      category: "complaint",
      frequency: { mentions: 5, uniqueAuthors: 3, uniqueSources: 2, engagementTotal: 5, growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null } },
    });
    const result = compute({
      cluster,
      decision: makeDecision({ evidence: { ...makeDecision().evidence, freshness: "unknown" } }),
      founderIntelligence: makeFounderIntelligence({
        competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: null, enterpriseVsSmb: "unknown", competitorConfidence: "unknown" },
      }),
      buyingIntent: makeBuyingIntent(0),
    });
    expect(result.finalRecommendation.unknowns.some((u) => u.includes('painTemporaryOrRecurring="unknown"'))).toBe(true);
    expect(result.finalRecommendation.unknowns.some((u) => u.includes("pricingConfidence"))).toBe(true);
    expect(result.finalRecommendation.unknowns.some((u) => u.includes("subscriptionViability"))).toBe(true);
    expect(result.finalRecommendation.unknowns.some((u) => u.includes("enterprisePotential"))).toBe(true);
    expect(result.finalRecommendation.unknowns.some((u) => u.includes("freshness"))).toBe(true);
  });

  it("nextValidationSteps includes pricing research when pricingConfidence is not-verified", () => {
    const cluster = makeCluster({ category: "complaint" });
    const result = compute({
      cluster,
      founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: null } }),
    });
    expect(result.finalRecommendation.nextValidationSteps.some((s) => s.toLowerCase().includes("pricing"))).toBe(true);
  });

  it("carries the same 8 risks and topMvpFeatures/possiblePricing/suggestedLaunchStrategy from Modules 4-5-6", () => {
    const cluster = makeCluster({ category: "complaint" });
    const result = compute({ cluster });
    expect(result.finalRecommendation.risks).toEqual(result.risks);
    expect(result.finalRecommendation.recommendedMvp).toEqual(result.founderOpportunity.topMvpFeatures);
    expect(result.finalRecommendation.suggestedPricingDirection).toBe(result.monetization.possiblePricing);
    expect(result.finalRecommendation.goToMarketDirection).toBe(result.founderOpportunity.suggestedLaunchStrategy);
  });
});

/* -------------------------------------------------------------------- */
/* Module 10 — Quality Gates ("NOT VERIFIED", never a fabricated number) */
/* -------------------------------------------------------------------- */

describe("Module 10 — Quality Gates", () => {
  it("a low-evidence, no-pricing fixture never contains a fabricated dollar amount anywhere in the output", () => {
    const cluster = makeCluster({
      category: "complaint",
      evidence: { evidenceCount: 1, sourceBreakdown: { reddit: 1 }, originalUrls: [], representativeExamples: [], engagementTotal: 0, dateRange: null },
    });
    const pricing = makePricing([]); // no extracted prices at all
    const result = compute({
      cluster,
      pricing,
      founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: null } }),
    });

    const serialized = JSON.stringify(result);
    const dollarMatches = serialized.match(/\$\d+(\.\d+)?/g) ?? [];
    const allowedPrices = new Set(pricing.extractedPrices.map((p) => `$${p}`));
    for (const match of dollarMatches) {
      expect(allowedPrices.has(match)).toBe(true);
    }
    expect(serialized).toContain("NOT VERIFIED");
  });

  it("a fixture WITH real pricing evidence only ever cites those exact extracted price numbers, nothing extra", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const pricing = makePricing([15, 49]);
    const result = compute({
      cluster,
      pricing,
      founderIntelligence: makeFounderIntelligence({ competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: pricing } }),
    });
    const serialized = JSON.stringify(result);
    const dollarMatches = serialized.match(/\$\d+(\.\d+)?/g) ?? [];
    const allowedPrices = new Set(pricing.extractedPrices.map((p) => `$${p}`));
    expect(dollarMatches.length).toBeGreaterThan(0);
    for (const match of dollarMatches) {
      expect(allowedPrices.has(match)).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------- */
/* Module 11 — Self Review                                               */
/* -------------------------------------------------------------------- */

describe("Module 11 — Self Review", () => {
  it("a fully clean fixture (no not-verified signals, no high risks, no confidence reduction) reports all 4 checks consistent, internallyConsistent=true", () => {
    const cluster = makeCluster({ category: "complaint" });
    const founderIntelligence = makeFounderIntelligence({
      competitorIntelligence: {
        ...makeFounderIntelligence().competitorIntelligence,
        pricingEvidence: makePricing([20, 40]),
        competitorConfidence: "medium",
        enterpriseVsSmb: "smb",
      },
    });
    const result = compute({ cluster, founderIntelligence, buyingIntent: makeBuyingIntent(0.3) });

    expect(result.finalRecommendation.unknowns).toEqual([]);
    expect(result.reviewedConfidence.verdict).toBe("justified");
    expect(result.validation.validatedRecommendation).toBe("BUILD");
    expect(result.selfReview.checks).toHaveLength(4);
    expect(result.selfReview.checks.every((c) => c.consistent)).toBe(true);
    expect(result.selfReview.internallyConsistent).toBe(true);
    for (const check of result.selfReview.checks) {
      expect(check.detail.length).toBeGreaterThan(0);
    }
  });

  it("fires 'BUILD verdict vs high-scoring risks' when validatedRecommendation=BUILD and >= 2 risks score >= 85, citing the exact risk names/scores", () => {
    const cluster = makeCluster({ category: "complaint" });
    const founderIntelligence = makeFounderIntelligence({
      risks: DEFAULT_RISKS.map((r) => (r.risk === "Technical Risk" || r.risk === "Platform Risk" ? { ...r, severity: "high" as const } : r)),
    });
    const result = compute({ cluster, founderIntelligence });

    expect(result.validation.validatedRecommendation).toBe("BUILD");
    const highRiskCheck = result.selfReview.checks.find((c) => c.check === "BUILD verdict vs high-scoring risks")!;
    expect(highRiskCheck.consistent).toBe(false);
    expect(highRiskCheck.detail).toContain("Technical Risk=85");
    expect(highRiskCheck.detail).toContain("Platform Risk=85");
    expect(result.selfReview.internallyConsistent).toBe(false);
  });

  it("fires 'subscriptionViability vs pricingConfidence' when subscriptionViability=supported but pricingConfidence=not-verified", () => {
    const cluster = makeCluster({ category: "complaint" });
    const founderIntelligence = makeFounderIntelligence({
      competitorIntelligence: { ...makeFounderIntelligence().competitorIntelligence, pricingEvidence: null },
    });
    const result = compute({ cluster, founderIntelligence, buyingIntent: makeBuyingIntent(0.8) });

    expect(result.monetization.subscriptionViability).toBe("supported");
    expect(result.monetization.pricingConfidence).toBe("not-verified");
    const monetizationCheck = result.selfReview.checks.find((c) => c.check === "monetization.subscriptionViability vs monetization.pricingConfidence")!;
    expect(monetizationCheck.consistent).toBe(false);
    expect(monetizationCheck.detail).toContain('subscriptionViability="supported"');
    expect(monetizationCheck.detail).toContain('pricingConfidence="not-verified"');
  });

  it("fires 'confidenceAdjustment vs recommendedAction' when confidence was reduced (1 fired claim, below the 2-claim downgrade threshold) but recommendedAction stays BUILD", () => {
    const cluster = makeCluster({ category: "complaint", rootCause: "Missing Integration" });
    const decision = makeDecision({ recommendation: { verdict: "BUILD", justification: "x", primaryRisk: "x", primaryOpportunity: "x" } });
    const founderIntelligence = makeFounderIntelligence({
      marketMaturity: { maturity: "saturated", reasons: ["x"] }, // fires exactly 1 counter-evidence claim
      competitionPressure: { pressure: "low", explanation: "x" },
    });
    const result = compute({ cluster, decision, founderIntelligence, calibration: makeCalibration({ falsePositive: { likely: false, reasons: [] } }) });

    expect(result.counterEvidence.filter((c) => c.fired)).toHaveLength(1);
    expect(result.validation.confidenceAdjustment).toBeLessThan(0);
    expect(result.validation.validatedRecommendation).toBe("BUILD");
    expect(result.finalRecommendation.recommendedAction).toBe("BUILD");
    const adjustmentCheck = result.selfReview.checks.find((c) => c.check === "validation.confidenceAdjustment vs finalRecommendation.recommendedAction")!;
    expect(adjustmentCheck.consistent).toBe(false);
    expect(adjustmentCheck.detail).toContain("confidenceAdjustment=-0.10");
    expect(adjustmentCheck.detail).toContain('recommendedAction="BUILD"');
  });

  it("fires 'unknowns vs reviewedConfidence.verdict' when unknowns are non-empty but reviewedConfidence.verdict=justified (0 fired claims)", () => {
    const cluster = makeCluster({
      category: "complaint",
      frequency: { mentions: 5, uniqueAuthors: 3, uniqueSources: 2, engagementTotal: 5, growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null } },
    });
    const result = compute({ cluster }); // default founderIntelligence has pricingEvidence=null -> pricingConfidence unknown too

    expect(result.finalRecommendation.unknowns.length).toBeGreaterThan(0);
    expect(result.reviewedConfidence.verdict).toBe("justified");
    const unknownsCheck = result.selfReview.checks.find((c) => c.check === "finalRecommendation.unknowns vs reviewedConfidence.verdict")!;
    expect(unknownsCheck.consistent).toBe(false);
    expect(unknownsCheck.detail).toContain(`finalRecommendation.unknowns has ${result.finalRecommendation.unknowns.length} item(s)`);
    expect(unknownsCheck.detail).toContain('reviewedConfidence.verdict="justified"');
  });

  it("never mutates validation/risks/monetization/reviewedConfidence/finalRecommendation — purely reports on them", () => {
    const cluster = makeCluster({ category: "complaint" });
    const founderIntelligence = makeFounderIntelligence({
      risks: DEFAULT_RISKS.map((r) => (r.risk === "Technical Risk" || r.risk === "Platform Risk" ? { ...r, severity: "high" as const } : r)),
    });
    const result = compute({ cluster, founderIntelligence });
    expect(result.validation.validatedRecommendation).toBe("BUILD"); // unchanged despite self-review firing
    expect(result.finalRecommendation.recommendedAction).toBe("BUILD");
  });
});

/* -------------------------------------------------------------------- */
/* defaultAiDecisionValidation + attachAiDecisionValidation wiring        */
/* -------------------------------------------------------------------- */

describe("defaultAiDecisionValidation + attachAiDecisionValidation", () => {
  it("defaultAiDecisionValidation returns a fully type-valid, empty/neutral placeholder", () => {
    const placeholder = defaultAiDecisionValidation();
    expect(placeholder.counterEvidence).toEqual([]);
    expect(placeholder.risks).toEqual([]);
    expect(placeholder.validation.validatedRecommendation).toBe("IGNORE");
    expect(placeholder.monetization.pricingConfidence).toBe("not-verified");
    expect(placeholder.reviewedConfidence.verdict).toBe("justified");
    expect(placeholder.selfReview.checks).toEqual([]);
    expect(placeholder.selfReview.internallyConsistent).toBe(true);
  });

  function makeMinimalReport(overrides: Partial<FounderOpportunityReport> & { id: string; clusterId: string }): FounderOpportunityReport {
    const buyingIntent = makeBuyingIntent(0.4);
    const competition = makeCompetition([]);
    const pricing = makePricing([]);
    const difficulty = makeBuildDifficulty("low");
    return {
      id: overrides.id,
      clusterId: overrides.clusterId,
      category: "complaint",
      problem: "x",
      summary: "s",
      painScore: 0.5,
      buyingIntent,
      competition,
      confidence: { band: "medium", score: 0.5 },
      scoreBreakdown: {
        painFrequency: 0.5,
        sourceDiversity: 0.5,
        authorDiversity: 0.5,
        buyingIntent: 0.5,
        engagement: 0.5,
        growth: 0.5,
        competition: 0.5,
        confidence: 0.5,
        weightedTotal: 0.5,
        explanation: "x",
      },
      fois: makeFois(70),
      supportingEvidence: { evidenceCount: 5, sourceBreakdown: {}, urls: [] },
      representativeQuotes: [],
      recommendedMvp: "x",
      suggestedPricing: pricing,
      targetUsers: "x",
      buildDifficulty: difficulty,
      estimatedTimeToMvp: "x",
      recommendation: { verdict: "WAIT", whyBuild: [], whyNotBuild: [], risk: [], explanation: "x" },
      createdAt: "2026-01-01T00:00:00.000Z",
      sourceSessionId: "session_1",
      sourceProblemReportId: "report_1",
      decision: makeDecision(),
      semanticCluster: { canonicalTitle: "x", aliases: [], mentionCount: 5, supportingSources: [], mergedCount: 1 },
      calibration: makeCalibration(),
      founderIntelligence: makeFounderIntelligence(),
      aiDecisionValidation: defaultAiDecisionValidation(),
      businessIntelligence: defaultBusinessIntelligence(),
      marketIntelligence: defaultMarketIntelligence(),
      revenueIntelligence: defaultRevenueIntelligence(),
      mvpPlan: defaultMvpPlan(),
      goToMarket: defaultGoToMarket(),
      technicalBlueprint: defaultTechnicalBlueprint(),
      knowledgeLinks: defaultKnowledgeLinks(),
      ...overrides,
    };
  }

  it("overwrites the placeholder with a real bundle looked up by clusterId", () => {
    const cluster = makeCluster({ id: "cluster_real", category: "complaint" });
    const report = makeMinimalReport({ id: "opp_1", clusterId: "cluster_real" });

    const [attached] = attachAiDecisionValidation([report], [cluster]);
    expect(attached!.aiDecisionValidation.risks).toHaveLength(8);
    expect(attached!.aiDecisionValidation).not.toEqual(defaultAiDecisionValidation());
    expect(attached!.aiDecisionValidation.selfReview.checks).toHaveLength(4);
  });

  it("falls back to the existing (placeholder) report, not a crash, when clusterId has no matching cluster", () => {
    const cluster = makeCluster({ id: "cluster_other", category: "complaint" });
    const report = makeMinimalReport({ id: "opp_orphan", clusterId: "cluster_missing" });

    const [attached] = attachAiDecisionValidation([report], [cluster]);
    expect(attached!.aiDecisionValidation).toEqual(defaultAiDecisionValidation());
  });
});
