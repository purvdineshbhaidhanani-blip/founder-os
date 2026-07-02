import type { ProblemCluster } from "../problems/types.js";
import type { BuyingIntentResult, CompetitionResult, OpportunityScoreBreakdown } from "./types.js";

export interface ComputeOpportunityScoreInput {
  cluster: ProblemCluster;
  buyingIntent: BuyingIntentResult;
  competition: CompetitionResult;
}

/** Fixed factor weights — sum to 1.0. */
const WEIGHTS = {
  painFrequency: 0.2,
  sourceDiversity: 0.15,
  authorDiversity: 0.1,
  buyingIntent: 0.2,
  engagement: 0.1,
  growth: 0.1,
  competition: 0.1,
  confidence: 0.05,
} as const;

function growthScore(label: ProblemCluster["frequency"]["growth"]["label"]): number {
  if (label === "rising") return 1;
  if (label === "stable") return 0.5;
  if (label === "declining") return 0.1;
  return 0.3; // insufficient-data
}

/**
 * Deterministic weighted-sum opportunity score. No LLM call — every weight
 * and threshold is a fixed constant.
 */
export function computeOpportunityScore(input: ComputeOpportunityScoreInput): OpportunityScoreBreakdown {
  const { cluster, buyingIntent, competition } = input;

  const painFrequency = Math.min(1, cluster.evidence.evidenceCount / 15);
  const sourceDiversity = Math.min(1, cluster.frequency.uniqueSources / 4);
  const authorDiversity = Math.min(1, cluster.frequency.uniqueAuthors / 8);
  const buyingIntentScore = buyingIntent.score;
  const engagement = Math.min(1, cluster.frequency.engagementTotal / 100);
  const growth = growthScore(cluster.frequency.growth.label);
  const competitionScore = competition.competitionScore;
  const confidence = cluster.confidence.score;

  const weightedTotal = Math.min(
    1,
    WEIGHTS.painFrequency * painFrequency +
      WEIGHTS.sourceDiversity * sourceDiversity +
      WEIGHTS.authorDiversity * authorDiversity +
      WEIGHTS.buyingIntent * buyingIntentScore +
      WEIGHTS.engagement * engagement +
      WEIGHTS.growth * growth +
      WEIGHTS.competition * competitionScore +
      WEIGHTS.confidence * confidence,
  );

  const factors: Array<[string, number, number]> = [
    ["painFrequency", painFrequency, WEIGHTS.painFrequency],
    ["sourceDiversity", sourceDiversity, WEIGHTS.sourceDiversity],
    ["authorDiversity", authorDiversity, WEIGHTS.authorDiversity],
    ["buyingIntent", buyingIntentScore, WEIGHTS.buyingIntent],
    ["engagement", engagement, WEIGHTS.engagement],
    ["growth", growth, WEIGHTS.growth],
    ["competition", competitionScore, WEIGHTS.competition],
    ["confidence", confidence, WEIGHTS.confidence],
  ];

  const explanation =
    factors
      .map(
        ([name, value, weight]) =>
          `${name}=${value.toFixed(2)}(w=${weight.toFixed(2)},contrib=${(value * weight).toFixed(3)})`,
      )
      .join(", ") + ` -> weightedTotal=${weightedTotal.toFixed(3)}.`;

  return {
    painFrequency,
    sourceDiversity,
    authorDiversity,
    buyingIntent: buyingIntentScore,
    engagement,
    growth,
    competition: competitionScore,
    confidence,
    weightedTotal,
    explanation,
  };
}
