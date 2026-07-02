import { describe, expect, it } from "vitest";
import { decideRecommendation } from "../../src/opportunities/recommendation.js";
import type { BuyingIntentResult, OpportunityScoreBreakdown } from "../../src/opportunities/types.js";
import type { ProblemCluster } from "../../src/problems/types.js";

function makeScoreBreakdown(overrides: Partial<OpportunityScoreBreakdown> = {}): OpportunityScoreBreakdown {
  return {
    painFrequency: 0.5,
    sourceDiversity: 0.5,
    authorDiversity: 0.5,
    buyingIntent: 0.5,
    engagement: 0.5,
    growth: 0.5,
    competition: 1,
    confidence: 0.5,
    weightedTotal: 0.7,
    explanation: "x",
    ...overrides,
  };
}

function makeCluster(overrides: Partial<ProblemCluster> = {}): ProblemCluster {
  return {
    id: "cluster_1",
    category: "complaint",
    normalizedStatement: "Users express general dissatisfaction.",
    evidence: {
      evidenceCount: 6,
      sourceBreakdown: {},
      originalUrls: [],
      representativeExamples: [],
      engagementTotal: 0,
      dateRange: null,
    },
    frequency: {
      mentions: 6,
      uniqueAuthors: 4,
      uniqueSources: 2,
      engagementTotal: 0,
      growth: { label: "rising", recentHalfCount: 4, earlierHalfCount: 2, ratio: 2 },
    },
    confidence: { band: "medium", score: 0.6, explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    ...overrides,
  };
}

const positiveBuyingIntent: BuyingIntentResult = { score: 0.5, matchingItemCount: 2, totalItemCount: 4, explanation: "x" };
const zeroBuyingIntent: BuyingIntentResult = { score: 0, matchingItemCount: 0, totalItemCount: 4, explanation: "x" };

describe("decideRecommendation", () => {
  it("returns BUILD when score>=0.6, confidence!=low, and buyingIntent>0", () => {
    const scoreBreakdown = makeScoreBreakdown({ weightedTotal: 0.65 });
    const cluster = makeCluster({ confidence: { band: "medium", score: 0.6, explanation: "x" } });
    const result = decideRecommendation(scoreBreakdown, cluster, positiveBuyingIntent);
    expect(result.verdict).toBe("BUILD");
    expect(result.explanation).toContain("weightedTotal=0.650");
    expect(result.explanation).toContain("-> BUILD");
    expect(result.whyBuild.length).toBeGreaterThan(0);
  });

  it("returns WAIT when score>=0.6 but confidence is low (buying intent BUILD condition fails)", () => {
    const scoreBreakdown = makeScoreBreakdown({ weightedTotal: 0.65 });
    const cluster = makeCluster({ confidence: { band: "low", score: 0.3, explanation: "x" } });
    const result = decideRecommendation(scoreBreakdown, cluster, positiveBuyingIntent);
    expect(result.verdict).toBe("WAIT");
    expect(result.whyNotBuild.some((b) => b.toLowerCase().includes("confidence"))).toBe(true);
  });

  it("returns WAIT when score>=0.6 and confidence is fine but buying intent is 0", () => {
    const scoreBreakdown = makeScoreBreakdown({ weightedTotal: 0.65 });
    const cluster = makeCluster({ confidence: { band: "medium", score: 0.6, explanation: "x" } });
    const result = decideRecommendation(scoreBreakdown, cluster, zeroBuyingIntent);
    expect(result.verdict).toBe("WAIT");
    expect(result.whyNotBuild).toContain("No buying-intent signal found in evidence.");
  });

  it("returns IGNORE when weightedTotal < 0.4", () => {
    const scoreBreakdown = makeScoreBreakdown({ weightedTotal: 0.2 });
    const cluster = makeCluster();
    const result = decideRecommendation(scoreBreakdown, cluster, zeroBuyingIntent);
    expect(result.verdict).toBe("IGNORE");
    expect(result.explanation).toContain("-> IGNORE");
  });

  it("returns WAIT for the middle band (0.4 <= score < 0.6)", () => {
    const scoreBreakdown = makeScoreBreakdown({ weightedTotal: 0.5 });
    const cluster = makeCluster();
    const result = decideRecommendation(scoreBreakdown, cluster, positiveBuyingIntent);
    expect(result.verdict).toBe("WAIT");
  });

  it("flags crowded competition in risk and whyNotBuild when 3+ competitors are estimated", () => {
    // competitionScore = 1/(1+3) = 0.25
    const scoreBreakdown = makeScoreBreakdown({ weightedTotal: 0.5, competition: 0.25 });
    const cluster = makeCluster();
    const result = decideRecommendation(scoreBreakdown, cluster, positiveBuyingIntent);
    expect(result.risk.some((r) => r.includes("Multiple named competitors"))).toBe(true);
    expect(result.whyNotBuild.some((r) => r.includes("named competitor"))).toBe(true);
  });

  it("always returns at least one risk bullet, capped at 2", () => {
    const scoreBreakdown = makeScoreBreakdown({ weightedTotal: 0.9, competition: 1 });
    const cluster = makeCluster({ confidence: { band: "high", score: 0.9, explanation: "x" } });
    const result = decideRecommendation(scoreBreakdown, cluster, positiveBuyingIntent);
    expect(result.risk.length).toBeGreaterThanOrEqual(1);
    expect(result.risk.length).toBeLessThanOrEqual(2);
  });

  it("caps whyBuild and whyNotBuild at 3 bullets", () => {
    const scoreBreakdown = makeScoreBreakdown({ weightedTotal: 0.65 });
    const cluster = makeCluster({
      evidence: {
        evidenceCount: 10,
        sourceBreakdown: {},
        originalUrls: [],
        representativeExamples: [],
        engagementTotal: 0,
        dateRange: null,
      },
      frequency: {
        mentions: 10,
        uniqueAuthors: 1,
        uniqueSources: 1,
        engagementTotal: 0,
        growth: { label: "rising", recentHalfCount: 8, earlierHalfCount: 2, ratio: 4 },
      },
      confidence: { band: "low", score: 0.2, explanation: "x" },
    });
    const result = decideRecommendation(scoreBreakdown, cluster, positiveBuyingIntent);
    expect(result.whyBuild.length).toBeLessThanOrEqual(3);
    expect(result.whyNotBuild.length).toBeLessThanOrEqual(3);
  });
});
