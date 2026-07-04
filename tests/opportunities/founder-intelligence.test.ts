import { describe, expect, it } from "vitest";
import {
  attachFounderIntelligence,
  computeFounderIntelligence,
  defaultFounderIntelligence,
  detectMarketGaps,
  estimateCompetitionPressure,
  estimateMarketMaturity,
} from "../../src/opportunities/founder-intelligence.js";
import { defaultAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
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
/* Shared, hand-built fixture helpers (mirrors calibration.test.ts's /  */
/* dedup.test.ts's "minimal hand-built fixture" pattern for direct,     */
/* deterministic control over conceptBreakdown/frequency/sourceBreakdown */
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

function makeFois(overall: number): FoisBreakdown {
  return {
    overall,
    dimensions: [{ name: "businessPain", raw: 50, weight: 0.2, weighted: 10, reason: "x", evidence: [] }],
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

interface ComputeParams {
  cluster: ProblemCluster;
  competition?: CompetitionResult;
  buyingIntent?: BuyingIntentResult;
  pricing?: PricingSignal;
  buildDifficulty?: BuildDifficultyResult;
  fois?: FoisBreakdown;
  decision?: FounderDecision;
  calibration?: OpportunityCalibration;
}

function compute(params: ComputeParams) {
  return computeFounderIntelligence({
    cluster: params.cluster,
    competition: params.competition ?? makeCompetition([]),
    buyingIntent: params.buyingIntent ?? makeBuyingIntent(0.4),
    pricing: params.pricing ?? makePricing([]),
    buildDifficulty: params.buildDifficulty ?? makeBuildDifficulty("low"),
    fois: params.fois ?? makeFois(70),
    decision: params.decision ?? makeDecision(),
    calibration: params.calibration ?? makeCalibration(),
  });
}

/* -------------------------------------------------------------------- */
/* Part A — Competitor Intelligence                                      */
/* -------------------------------------------------------------------- */

describe("Part A — Competitor Intelligence", () => {
  it("0 competitors -> UNKNOWN confidence, empty primaryCompetitors, never an invented competitor name", () => {
    const cluster = makeCluster({ category: "complaint" });
    const result = compute({ cluster, competition: makeCompetition([]) });

    expect(result.competitorIntelligence.primaryCompetitors).toEqual([]);
    expect(result.competitorIntelligence.competitorConfidence).toBe("unknown");
    expect(result.competitorIntelligence.competitorEvidence).toEqual([]);
    expect(result.competitorIntelligence.explanation.length).toBeGreaterThan(0);
    expect(result.competitorIntelligence.explanation).toContain("No competitors were extracted");
  });

  it("3+ competitors -> real primaryCompetitors (sorted, capped at 3), crowded maturity, computed pressure", () => {
    const cluster = makeCluster({
      category: "migration",
      frequency: {
        mentions: 20,
        uniqueAuthors: 10,
        uniqueSources: 3,
        engagementTotal: 40,
        growth: { label: "rising", recentHalfCount: 12, earlierHalfCount: 8, ratio: 1.5 },
      },
    });
    const competition = makeCompetition([
      { name: "Trello", mentionCount: 5 },
      { name: "Asana", mentionCount: 3 },
      { name: "Notion", mentionCount: 2 },
      { name: "ClickUp", mentionCount: 1 },
    ]);
    const result = compute({ cluster, competition });

    expect(result.competitorIntelligence.primaryCompetitors).toEqual(["Trello", "Asana", "Notion"]);
    expect(result.competitorIntelligence.competitorCategory).toBe("established category with switching activity");
    expect(result.marketMaturity.maturity).toBe("crowded"); // 4 competitors -> 3-5 bucket
    expect(result.marketMaturity.reasons.some((r) => r.includes("4"))).toBe(true);
    expect(result.competitionPressure.pressure).not.toBe("unknown" as never);
    expect(result.competitionPressure.explanation).toContain("competitionScore=");
  });

  it("competitor evidence text signals open-source vs SaaS deterministically from name/URL, never guessed", () => {
    const cluster = makeCluster({ category: "looking-for-alternative" });
    const openSourceCompetition = makeCompetition([
      { name: "SelfHostedTool", mentionCount: 2, evidenceUrls: ["https://github.com/example/tool"] },
    ]);
    const openSourceResult = compute({ cluster, competition: openSourceCompetition });
    expect(openSourceResult.competitorIntelligence.openSourceVsSaas).toBe("open-source");

    const unknownCompetition = makeCompetition([{ name: "SomeTool", mentionCount: 2, evidenceUrls: ["https://example.com/tool"] }]);
    const unknownResult = compute({ cluster, competition: unknownCompetition });
    expect(unknownResult.competitorIntelligence.openSourceVsSaas).toBe("unknown");
  });

  it("reuses the pricing field AS-IS as pricingEvidence when prices exist, else null — never fabricated", () => {
    const cluster = makeCluster({ category: "pricing-complaint" });
    const withPrice = compute({ cluster, pricing: makePricing([40]) });
    expect(withPrice.competitorIntelligence.pricingEvidence).toEqual(makePricing([40]));

    const withoutPrice = compute({ cluster, pricing: makePricing([]) });
    expect(withoutPrice.competitorIntelligence.pricingEvidence).toBeNull();
  });
});

/* -------------------------------------------------------------------- */
/* Part B — Market Gap Engine                                            */
/* -------------------------------------------------------------------- */

describe("Part B — Market Gap Engine", () => {
  it("detects a real 'Expensive Pricing' gap from conceptBreakdown, with real evidenceCount/exampleConceptIds", () => {
    const cluster = makeCluster({
      category: "pricing-complaint",
      conceptBreakdown: [
        { conceptId: "automation-too-expensive", canonicalStatement: "x", rootCause: "Pricing Friction", count: 6 },
      ],
    });
    const gaps = detectMarketGaps(cluster);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.gap).toBe("Expensive Pricing");
    expect(gaps[0]!.evidenceCount).toBe(6);
    expect(gaps[0]!.exampleConceptIds).toEqual(["automation-too-expensive"]);
    expect(gaps[0]!.confidence).toBe("high"); // 6 >= GAP_CONFIDENCE_HIGH_THRESHOLD (5)
  });

  it("never lists a gap with zero evidence — a cluster with no conceptBreakdown and a non-fallback category yields []", () => {
    const cluster = makeCluster({ category: "praise" });
    expect(detectMarketGaps(cluster)).toEqual([]);
  });

  it("aggregates multiple concept ids mapping to the SAME gap and sorts by evidenceCount desc", () => {
    const cluster = makeCluster({
      category: "missing-capability",
      conceptBreakdown: [
        { conceptId: "no-way-to-accomplish-task", canonicalStatement: "x", rootCause: "Missing Integration", count: 3 },
        { conceptId: "product-lacks-capability", canonicalStatement: "x", rootCause: "Lack of Automation", count: 2 },
        { conceptId: "mobile-experience-gaps", canonicalStatement: "x", rootCause: "Poor UX", count: 1 },
      ],
    });
    const gaps = detectMarketGaps(cluster);
    expect(gaps[0]!.gap).toBe("Missing Features");
    expect(gaps[0]!.evidenceCount).toBe(5); // 3 + 2 aggregated
    expect(gaps[0]!.exampleConceptIds).toEqual(["no-way-to-accomplish-task", "product-lacks-capability"]);
    expect(gaps[1]!.gap).toBe("Poor Mobile Experience");
    expect(gaps[1]!.evidenceCount).toBe(1);
  });

  it("falls back to a category-level gap only when conceptBreakdown is absent", () => {
    const cluster = makeCluster({ category: "pricing-complaint", conceptBreakdown: undefined });
    const gaps = detectMarketGaps(cluster);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.gap).toBe("Expensive Pricing");
    expect(gaps[0]!.exampleConceptIds).toEqual([]); // no concept-level match, category fallback only
  });
});

/* -------------------------------------------------------------------- */
/* Part C — Market Maturity                                              */
/* -------------------------------------------------------------------- */

describe("Part C — estimateMarketMaturity", () => {
  it("0 competitors + rising -> emerging", () => {
    const result = estimateMarketMaturity(makeCompetition([]), 5, 2, "rising");
    expect(result.maturity).toBe("emerging");
    expect(result.reasons.some((r) => r.includes("0 named competitor"))).toBe(true);
  });

  it("1-2 competitors + stable -> growing", () => {
    const competition = makeCompetition([{ name: "A", mentionCount: 2 }, { name: "B", mentionCount: 1 }]);
    const result = estimateMarketMaturity(competition, 5, 2, "stable");
    expect(result.maturity).toBe("growing");
  });

  it("6+ competitors -> saturated", () => {
    const competition = makeCompetition(
      ["A", "B", "C", "D", "E", "F"].map((name, i) => ({ name, mentionCount: 6 - i })),
    );
    const result = estimateMarketMaturity(competition, 20, 4, "stable");
    expect(result.maturity).toBe("saturated");
  });

  it("declining growth overrides any competitor count", () => {
    const competition = makeCompetition(
      ["A", "B", "C", "D", "E", "F"].map((name, i) => ({ name, mentionCount: 6 - i })),
    );
    const result = estimateMarketMaturity(competition, 20, 4, "declining");
    expect(result.maturity).toBe("declining");
    expect(result.reasons.some((r) => r.includes("overrides"))).toBe(true);
  });
});

/* -------------------------------------------------------------------- */
/* Part E — Competition Pressure                                         */
/* -------------------------------------------------------------------- */

describe("Part E — estimateCompetitionPressure", () => {
  it("0 competitors (competitionScore=1) -> very-low pressure", () => {
    const result = estimateCompetitionPressure(makeCompetition([]), "emerging");
    expect(result.pressure).toBe("very-low");
  });

  it("saturated maturity floors pressure at 'high' minimum even with a moderate competitionScore", () => {
    const competition = makeCompetition([{ name: "A", mentionCount: 1 }]); // competitionScore=0.5 -> base tier "low"
    const result = estimateCompetitionPressure(competition, "saturated");
    expect(result.pressure).toBe("high");
    expect(result.explanation).toContain("floors pressure at \"high\"");
  });
});

/* -------------------------------------------------------------------- */
/* Part D — Founder Opportunity synthesis                                */
/* -------------------------------------------------------------------- */

describe("Part D — founderOpportunity synthesis", () => {
  it("shouldBuild mirrors decision.recommendation.verdict exactly, never diverges", () => {
    const cluster = makeCluster({ category: "complaint" });
    const buildResult = compute({ cluster, decision: makeDecision({ recommendation: { verdict: "BUILD", justification: "x", primaryRisk: "x", primaryOpportunity: "x" } }) });
    expect(buildResult.founderOpportunity.shouldBuild).toBe(true);

    const ignoreResult = compute({ cluster, decision: makeDecision({ recommendation: { verdict: "IGNORE", justification: "x", primaryRisk: "x", primaryOpportunity: "x" } }) });
    expect(ignoreResult.founderOpportunity.shouldBuild).toBe(false);
  });

  it("bestPricingModel: enterprise signal wins first, then subscription/one-time/freemium/usage by rule table", () => {
    const cluster = makeCluster({ category: "existing-spending" });
    const withPrice = compute({ cluster, pricing: makePricing([50]) });
    expect(withPrice.founderOpportunity.bestPricingModel).toBe("subscription"); // existing-spending + price present

    const noPriceHighIntent = compute({ cluster: makeCluster({ category: "complaint" }), pricing: makePricing([]), buyingIntent: makeBuyingIntent(0.8) });
    expect(noPriceHighIntent.founderOpportunity.bestPricingModel).toBe("freemium");

    const noPriceLowIntent = compute({ cluster: makeCluster({ category: "complaint" }), pricing: makePricing([]), buyingIntent: makeBuyingIntent(0.1) });
    expect(noPriceLowIntent.founderOpportunity.bestPricingModel).toBe("usage");
  });

  it("expectedMvpComplexity bumps up one tier when marketGaps.length >= 4 (4 DISTINCT gaps, not just 4 concept ids)", () => {
    const manyGapsCluster = makeCluster({
      category: "missing-capability",
      conceptBreakdown: [
        { conceptId: "automation-too-expensive", canonicalStatement: "x", rootCause: "Pricing Friction", count: 1 }, // Expensive Pricing
        { conceptId: "mobile-experience-gaps", canonicalStatement: "x", rootCause: "Poor UX", count: 1 }, // Poor Mobile Experience
        { conceptId: "clunky-many-steps", canonicalStatement: "x", rootCause: "Poor UX", count: 1 }, // Complex UX
        { conceptId: "missing-integration", canonicalStatement: "x", rootCause: "Missing Integration", count: 1 }, // Weak Integrations
      ],
    });
    const result = compute({ cluster: manyGapsCluster, buildDifficulty: makeBuildDifficulty("low") });
    expect(result.marketGaps.length).toBe(4);
    expect(result.founderOpportunity.expectedMvpComplexity).toBe("medium"); // low(0) + 1 bump = medium
  });
});

/* -------------------------------------------------------------------- */
/* Part F — Differentiation Engine                                       */
/* -------------------------------------------------------------------- */

describe("Part F — Differentiation Engine", () => {
  it("recommends 'Lower Pricing' ONLY when a real 'Expensive Pricing' gap is present", () => {
    const cluster = makeCluster({
      category: "pricing-complaint",
      conceptBreakdown: [
        { conceptId: "automation-too-expensive", canonicalStatement: "x", rootCause: "Pricing Friction", count: 3 },
      ],
    });
    const result = compute({ cluster });
    expect(result.differentiationStrategies.map((s) => s.strategy)).toContain("Lower Pricing");
    const lowerPricing = result.differentiationStrategies.find((s) => s.strategy === "Lower Pricing")!;
    expect(lowerPricing.evidenceReason).toContain("Expensive Pricing");
  });

  it("recommends NO strategy when nothing is evidence-backed — empty array is valid and expected", () => {
    const cluster = makeCluster({ category: "praise", conceptBreakdown: undefined });
    const result = compute({ cluster, competition: makeCompetition([]), buildDifficulty: makeBuildDifficulty("high") });
    expect(result.differentiationStrategies).toEqual([]);
  });

  it("recommends 'Developer-first' only when the dominant evidence source is GitHub/StackExchange", () => {
    const githubCluster = makeCluster({
      category: "bug",
      evidence: {
        evidenceCount: 4,
        sourceBreakdown: { github: 3, reddit: 1 },
        originalUrls: [],
        representativeExamples: [],
        engagementTotal: 0,
        dateRange: null,
      },
    });
    const result = compute({ cluster: githubCluster });
    expect(result.differentiationStrategies.map((s) => s.strategy)).toContain("Developer-first");
  });
});

/* -------------------------------------------------------------------- */
/* Part G — Risk Engine (always all 8 present)                           */
/* -------------------------------------------------------------------- */

describe("Part G — Risk Engine", () => {
  it("always returns exactly the 8 fixed risks, each with a real, non-empty explanation", () => {
    const cluster = makeCluster({ category: "complaint" });
    const result = compute({ cluster });
    const names = result.risks.map((r) => r.risk);
    expect(names).toEqual([
      "Market Risk",
      "Execution Risk",
      "Technical Risk",
      "Pricing Risk",
      "Competition Risk",
      "Customer Risk",
      "Platform Risk",
      "Regulation Risk",
    ]);
    for (const risk of result.risks) {
      expect(risk.explanation.length).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(risk.severity);
    }
  });

  it("echo-chamber fixture -> high Customer Risk citing decision.evidence.echoChamber", () => {
    const cluster = makeCluster({ category: "complaint" });
    const echoChamberDecision = makeDecision({
      evidence: {
        evidenceCount: 5,
        uniqueSources: 1,
        uniqueAuthors: 1,
        freshness: "unknown",
        crossSourceAgreement: 0,
        echoChamber: true,
        explanation: 'Echo-chamber risk: source "reddit" accounts for 100% of evidence (>= 90% threshold).',
      },
    });
    const result = compute({ cluster, decision: echoChamberDecision });
    const customerRisk = result.risks.find((r) => r.risk === "Customer Risk")!;
    expect(customerRisk.severity).toBe("high");
    expect(customerRisk.explanation).toContain("echoChamber=true");
  });

  it("regulated-industry-phrase fixture (HIPAA) -> elevated Regulation Risk vs a control fixture -> low", () => {
    const regulatedCluster = makeCluster({
      category: "complaint",
      evidence: {
        evidenceCount: 3,
        sourceBreakdown: { reddit: 3 },
        originalUrls: [],
        representativeExamples: [
          makeRawItem({ url: "https://r1", title: "Not HIPAA compliant", body: "We need HIPAA and GDPR compliance before we can adopt this." }),
        ],
        engagementTotal: 0,
        dateRange: null,
      },
    });
    const regulatedResult = compute({ cluster: regulatedCluster });
    const regulatedRisk = regulatedResult.risks.find((r) => r.risk === "Regulation Risk")!;
    expect(regulatedRisk.severity).toBe("high"); // 2 phrase matches: hipaa + gdpr
    expect(regulatedRisk.explanation).toContain("hipaa");

    const controlCluster = makeCluster({ category: "complaint" }); // default representativeExamples has no regulated phrase
    const controlResult = compute({ cluster: controlCluster });
    const controlRisk = controlResult.risks.find((r) => r.risk === "Regulation Risk")!;
    expect(controlRisk.severity).toBe("low");
  });

  it("Weak Buying Intent calibration diagnostic firing -> medium Customer Risk (when not an echo chamber)", () => {
    const cluster = makeCluster({ category: "complaint" });
    const calibration = makeCalibration({
      diagnostics: [{ flag: "Weak Buying Intent", fired: true, reason: "buyingIntent.score=0.10 < 0.20." }],
    });
    const result = compute({ cluster, calibration });
    const customerRisk = result.risks.find((r) => r.risk === "Customer Risk")!;
    expect(customerRisk.severity).toBe("medium");
  });
});

/* -------------------------------------------------------------------- */
/* defaultFounderIntelligence / attachFounderIntelligence wiring          */
/* -------------------------------------------------------------------- */

describe("defaultFounderIntelligence + attachFounderIntelligence", () => {
  it("defaultFounderIntelligence returns a fully type-valid, empty placeholder", () => {
    const placeholder = defaultFounderIntelligence();
    expect(placeholder.marketGaps).toEqual([]);
    expect(placeholder.risks).toEqual([]);
    expect(placeholder.differentiationStrategies).toEqual([]);
    expect(placeholder.competitorIntelligence.competitorConfidence).toBe("unknown");
  });

  it("attachFounderIntelligence overwrites the placeholder with a real bundle looked up by clusterId", () => {
    const cluster = makeCluster({ id: "cluster_real", category: "complaint" });
    const report: FounderOpportunityReport = {
      id: "opp_1",
      clusterId: "cluster_real",
      category: cluster.category,
      problem: cluster.normalizedStatement,
      summary: "s",
      painScore: 0.5,
      buyingIntent: makeBuyingIntent(0.4),
      competition: makeCompetition([]),
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
      supportingEvidence: { evidenceCount: 5, sourceBreakdown: cluster.evidence.sourceBreakdown, urls: [] },
      representativeQuotes: [],
      recommendedMvp: "x",
      suggestedPricing: makePricing([]),
      targetUsers: "x",
      buildDifficulty: makeBuildDifficulty("low"),
      estimatedTimeToMvp: "x",
      recommendation: { verdict: "WAIT", whyBuild: [], whyNotBuild: [], risk: [], explanation: "x" },
      createdAt: "2026-01-01T00:00:00.000Z",
      sourceSessionId: "session_1",
      sourceProblemReportId: "report_1",
      decision: makeDecision(),
      semanticCluster: { canonicalTitle: "x", aliases: [], mentionCount: 5, supportingSources: [], mergedCount: 1 },
      calibration: makeCalibration(),
      founderIntelligence: defaultFounderIntelligence(),
      aiDecisionValidation: defaultAiDecisionValidation(),
      businessIntelligence: defaultBusinessIntelligence(),
      marketIntelligence: defaultMarketIntelligence(),
      revenueIntelligence: defaultRevenueIntelligence(),
      mvpPlan: defaultMvpPlan(),
      goToMarket: defaultGoToMarket(),
      technicalBlueprint: defaultTechnicalBlueprint(),
      knowledgeLinks: defaultKnowledgeLinks(),
    };

    const [attached] = attachFounderIntelligence([report], [cluster]);
    expect(attached!.founderIntelligence.risks).toHaveLength(8);
    expect(attached!.founderIntelligence).not.toEqual(defaultFounderIntelligence());
  });

  it("falls back to the existing (placeholder) report, not a crash, when clusterId has no matching cluster", () => {
    const cluster = makeCluster({ id: "cluster_other", category: "complaint" });
    const report: FounderOpportunityReport = {
      id: "opp_orphan",
      clusterId: "cluster_missing",
      category: "complaint",
      problem: "x",
      summary: "s",
      painScore: 0.5,
      buyingIntent: makeBuyingIntent(0.4),
      competition: makeCompetition([]),
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
      suggestedPricing: makePricing([]),
      targetUsers: "x",
      buildDifficulty: makeBuildDifficulty("low"),
      estimatedTimeToMvp: "x",
      recommendation: { verdict: "WAIT", whyBuild: [], whyNotBuild: [], risk: [], explanation: "x" },
      createdAt: "2026-01-01T00:00:00.000Z",
      sourceSessionId: "session_1",
      sourceProblemReportId: "report_1",
      decision: makeDecision(),
      semanticCluster: { canonicalTitle: "x", aliases: [], mentionCount: 5, supportingSources: [], mergedCount: 1 },
      calibration: makeCalibration(),
      founderIntelligence: defaultFounderIntelligence(),
      aiDecisionValidation: defaultAiDecisionValidation(),
      businessIntelligence: defaultBusinessIntelligence(),
      marketIntelligence: defaultMarketIntelligence(),
      revenueIntelligence: defaultRevenueIntelligence(),
      mvpPlan: defaultMvpPlan(),
      goToMarket: defaultGoToMarket(),
      technicalBlueprint: defaultTechnicalBlueprint(),
      knowledgeLinks: defaultKnowledgeLinks(),
    };

    const [attached] = attachFounderIntelligence([report], [cluster]);
    expect(attached!.founderIntelligence).toEqual(defaultFounderIntelligence());
  });
});
