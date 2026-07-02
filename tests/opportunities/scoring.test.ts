import { describe, expect, it } from "vitest";
import { computeOpportunityScore } from "../../src/opportunities/scoring.js";
import type { BuyingIntentResult, CompetitionResult } from "../../src/opportunities/types.js";
import type { ProblemCluster } from "../../src/problems/types.js";

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

const buyingIntent: BuyingIntentResult = {
  score: 0.5,
  matchingItemCount: 2,
  totalItemCount: 4,
  explanation: "x",
};

const competition: CompetitionResult = {
  competitors: [],
  competitionScore: 0.8,
  explanation: "x",
};

describe("computeOpportunityScore", () => {
  it("computes the exact weighted-sum formula", () => {
    const cluster = makeCluster();
    const result = computeOpportunityScore({ cluster, buyingIntent, competition });

    // painFrequency = min(1, 6/15) = 0.4
    // sourceDiversity = min(1, 2/4) = 0.5
    // authorDiversity = min(1, 4/8) = 0.5
    // buyingIntent = 0.5
    // engagement = min(1, 40/100) = 0.4
    // growth = rising -> 1
    // competition = 0.8
    // confidence = 0.6
    expect(result.painFrequency).toBeCloseTo(0.4, 5);
    expect(result.sourceDiversity).toBeCloseTo(0.5, 5);
    expect(result.authorDiversity).toBeCloseTo(0.5, 5);
    expect(result.buyingIntent).toBeCloseTo(0.5, 5);
    expect(result.engagement).toBeCloseTo(0.4, 5);
    expect(result.growth).toBe(1);
    expect(result.competition).toBeCloseTo(0.8, 5);
    expect(result.confidence).toBeCloseTo(0.6, 5);

    const expectedWeightedTotal =
      0.2 * 0.4 + 0.15 * 0.5 + 0.1 * 0.5 + 0.2 * 0.5 + 0.1 * 0.4 + 0.1 * 1 + 0.1 * 0.8 + 0.05 * 0.6;
    expect(result.weightedTotal).toBeCloseTo(expectedWeightedTotal, 5);
    expect(result.explanation).toContain("painFrequency=0.40");
    expect(result.explanation).toContain(`weightedTotal=${expectedWeightedTotal.toFixed(3)}`);
  });

  it("caps weightedTotal at 1", () => {
    const cluster = makeCluster({
      evidence: {
        evidenceCount: 100,
        sourceBreakdown: {},
        originalUrls: [],
        representativeExamples: [],
        engagementTotal: 1000,
        dateRange: null,
      },
      frequency: {
        mentions: 100,
        uniqueAuthors: 50,
        uniqueSources: 10,
        engagementTotal: 1000,
        growth: { label: "rising", recentHalfCount: 50, earlierHalfCount: 10, ratio: 5 },
      },
      confidence: { band: "high", score: 1, explanation: "x" },
    });
    const maxedBuyingIntent: BuyingIntentResult = { score: 1, matchingItemCount: 4, totalItemCount: 4, explanation: "x" };
    const maxedCompetition: CompetitionResult = { competitors: [], competitionScore: 1, explanation: "x" };

    const result = computeOpportunityScore({ cluster, buyingIntent: maxedBuyingIntent, competition: maxedCompetition });
    expect(result.weightedTotal).toBeCloseTo(1, 10);
    expect(result.weightedTotal).toBeLessThanOrEqual(1);
  });

  it("maps each growth label to the documented score", () => {
    const stable = computeOpportunityScore({
      cluster: makeCluster({ frequency: { mentions: 1, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 0, growth: { label: "stable", recentHalfCount: 1, earlierHalfCount: 1, ratio: 1 } } }),
      buyingIntent,
      competition,
    });
    expect(stable.growth).toBe(0.5);

    const declining = computeOpportunityScore({
      cluster: makeCluster({ frequency: { mentions: 1, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 0, growth: { label: "declining", recentHalfCount: 1, earlierHalfCount: 3, ratio: 0.33 } } }),
      buyingIntent,
      competition,
    });
    expect(declining.growth).toBe(0.1);

    const insufficient = computeOpportunityScore({
      cluster: makeCluster({ frequency: { mentions: 1, uniqueAuthors: 1, uniqueSources: 1, engagementTotal: 0, growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null } } }),
      buyingIntent,
      competition,
    });
    expect(insufficient.growth).toBe(0.3);
  });
});
