import { describe, expect, it } from "vitest";
import { dedupeOpportunities } from "../../src/opportunities/dedup.js";
import { defaultCalibration } from "../../src/opportunities/calibration.js";
import { defaultFounderIntelligence } from "../../src/opportunities/founder-intelligence.js";
import { defaultAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
import type {
  BuildDifficultyResult,
  BuyingIntentResult,
  CompetitionResult,
  FoisBreakdown,
  FounderDecision,
  FounderOpportunityReport,
  OpportunityScoreBreakdown,
  PricingSignal,
  SemanticClusterInfo,
} from "../../src/opportunities/types.js";

const buyingIntent: BuyingIntentResult = { score: 0.5, matchingItemCount: 1, totalItemCount: 2, explanation: "x" };
const difficulty: BuildDifficultyResult = { tier: "low", matchedSignals: [], explanation: "heuristic estimate, not an engineering estimate" };
const pricing: PricingSignal = { extractedPrices: [], suggestedPriceText: "x" };

/**
 * Minimal valid FounderDecision fixture for dedup tests, which only
 * exercise dedupeOpportunities' URL-overlap/competitor-name logic and don't
 * assert anything about the Loop 3 decision layer — present purely so the
 * FounderOpportunityReport literal type-checks (see decision.test.ts for
 * real Founder Decision behavior coverage).
 */
const decision: FounderDecision = {
  intentDistribution: [],
  evidence: {
    evidenceCount: 2,
    uniqueSources: 1,
    uniqueAuthors: 1,
    freshness: "unknown",
    crossSourceAgreement: 0,
    echoChamber: false,
    explanation: "x",
  },
  reasoning: {
    whyThisMatters: "x",
    whyNow: "x",
    whoExperiences: "x",
    whatEvidence: "x",
    whyFoundersPay: "x",
    biggestUncertainty: "x",
    biggestImplementationRisk: "x",
  },
  confidence: { score: 50, band: "medium", contributors: [], weaknesses: [] },
  recommendation: { verdict: "WATCH", justification: "x", primaryRisk: "x", primaryOpportunity: "x" },
  qualityGates: [],
};

/** Minimal valid SemanticClusterInfo fixture — see semantic.test.ts for real Part A merge behavior coverage. */
const semanticCluster: SemanticClusterInfo = {
  canonicalTitle: "Users express general dissatisfaction.",
  aliases: [],
  mentionCount: 2,
  supportingSources: [],
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
 * Minimal valid FoisBreakdown fixture for dedup tests, which only exercise
 * dedupeOpportunities' URL-overlap/competitor-name logic and don't assert
 * anything about FOIS itself — `fois` is here purely so the
 * FounderOpportunityReport literal type-checks (see fois.test.ts for real
 * FOIS behavior coverage).
 */
function makeFois(overall: number): FoisBreakdown {
  return { overall, dimensions: [], reasons: [], weaknesses: [], penalties: [] };
}

function makeCompetition(names: string[]): CompetitionResult {
  const competitors = names.map((name, i) => ({ name, mentionCount: names.length - i, evidenceUrls: [] }));
  return {
    competitors,
    competitionScore: competitors.length === 0 ? 1 : 1 / (1 + competitors.length),
    explanation: "x",
  };
}

function makeReport(
  overrides: Partial<FounderOpportunityReport> & { id: string; weightedTotal: number },
): FounderOpportunityReport {
  const { weightedTotal, ...rest } = overrides;
  return {
    id: overrides.id,
    clusterId: `cluster_${overrides.id}`,
    category: "complaint",
    problem: "Users express general dissatisfaction.",
    summary: "s",
    painScore: 0.5,
    buyingIntent,
    competition: makeCompetition([]),
    confidence: { band: "medium", score: 0.5 },
    scoreBreakdown: makeScoreBreakdown(weightedTotal),
    fois: makeFois(Math.round(weightedTotal * 100)),
    supportingEvidence: { evidenceCount: 2, sourceBreakdown: {}, urls: [] },
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
    decision,
    semanticCluster,
    calibration: defaultCalibration(),
    founderIntelligence: defaultFounderIntelligence(),
    aiDecisionValidation: defaultAiDecisionValidation(),
    ...rest,
  };
}

describe("dedupeOpportunities", () => {
  it("collapses two near-duplicate opportunities with >50% overlapping evidence URLs, keeping the higher-scored one", () => {
    const weaker = makeReport({
      id: "opp_weak",
      weightedTotal: 0.4,
      supportingEvidence: { evidenceCount: 3, sourceBreakdown: {}, urls: ["https://a", "https://b", "https://c"] },
    });
    const stronger = makeReport({
      id: "opp_strong",
      weightedTotal: 0.7,
      // shares 2 of 3 URLs with `weaker` -> overlap = 2/3 (min set size 3) > 0.5
      supportingEvidence: { evidenceCount: 3, sourceBreakdown: {}, urls: ["https://a", "https://b", "https://d"] },
    });

    const result = dedupeOpportunities([weaker, stronger]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("opp_strong");
  });

  it("collapses two opportunities sharing an identical top-competitor name, keeping the higher-scored one", () => {
    const weaker = makeReport({
      id: "opp_weak",
      weightedTotal: 0.3,
      category: "migration",
      supportingEvidence: { evidenceCount: 2, sourceBreakdown: {}, urls: ["https://x1"] },
      competition: makeCompetition(["Trello"]),
    });
    const stronger = makeReport({
      id: "opp_strong",
      weightedTotal: 0.8,
      category: "looking-for-alternative",
      // no URL overlap at all with `weaker`, but the same top competitor name (case-insensitive)
      supportingEvidence: { evidenceCount: 2, sourceBreakdown: {}, urls: ["https://y1"] },
      competition: makeCompetition(["trello"]),
    });

    const result = dedupeOpportunities([weaker, stronger]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("opp_strong");
  });

  it("keeps two genuinely distinct opportunities (no URL overlap, different/no competitors)", () => {
    const a = makeReport({
      id: "opp_a",
      weightedTotal: 0.6,
      supportingEvidence: { evidenceCount: 2, sourceBreakdown: {}, urls: ["https://a1", "https://a2"] },
      competition: makeCompetition(["Trello"]),
    });
    const b = makeReport({
      id: "opp_b",
      weightedTotal: 0.5,
      supportingEvidence: { evidenceCount: 2, sourceBreakdown: {}, urls: ["https://b1", "https://b2"] },
      competition: makeCompetition(["Notion"]),
    });

    const result = dedupeOpportunities([a, b]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id).sort()).toEqual(["opp_a", "opp_b"]);
  });

  it("keeps opportunities with no competitor extracted from being falsely matched against each other", () => {
    const a = makeReport({ id: "opp_a", weightedTotal: 0.6, supportingEvidence: { evidenceCount: 1, sourceBreakdown: {}, urls: ["https://a1"] } });
    const b = makeReport({ id: "opp_b", weightedTotal: 0.5, supportingEvidence: { evidenceCount: 1, sourceBreakdown: {}, urls: ["https://b1"] } });

    const result = dedupeOpportunities([a, b]);
    expect(result).toHaveLength(2);
  });

  it("returns an empty array for an empty input", () => {
    expect(dedupeOpportunities([])).toEqual([]);
  });
});
