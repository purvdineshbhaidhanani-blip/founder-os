import type { ProblemCluster } from "../problems/types.js";
import type { BuyingIntentResult, FounderRecommendation, OpportunityScoreBreakdown } from "./types.js";

/** Below this, a cluster is treated as having "enough" raw evidence volume to cite as a BUILD-favoring fact. */
const HIGH_EVIDENCE_COUNT_THRESHOLD = 5;
/** At or above this many distinct named competitors, the market is treated as "crowded" for risk/whyNotBuild bullets. */
const CROWDED_COMPETITION_THRESHOLD = 3;

/**
 * Deterministic BUILD / WAIT / IGNORE verdict from a fixed threshold table.
 * No LLM call — every bullet is grounded in an actual number from the input,
 * never fabricated.
 */
export function decideRecommendation(
  scoreBreakdown: OpportunityScoreBreakdown,
  cluster: ProblemCluster,
  buyingIntent: BuyingIntentResult,
): FounderRecommendation {
  let verdict: FounderRecommendation["verdict"];
  if (scoreBreakdown.weightedTotal >= 0.6 && cluster.confidence.band !== "low" && buyingIntent.score > 0) {
    verdict = "BUILD";
  } else if (scoreBreakdown.weightedTotal < 0.4) {
    verdict = "IGNORE";
  } else {
    verdict = "WAIT";
  }

  const whyBuild: string[] = [];
  if (cluster.evidence.evidenceCount >= HIGH_EVIDENCE_COUNT_THRESHOLD) {
    whyBuild.push(`${cluster.evidence.evidenceCount} pieces of evidence collected for this problem.`);
  }
  if (buyingIntent.score > 0) {
    whyBuild.push(
      `${(buyingIntent.score * 100).toFixed(0)}% of evidence (${buyingIntent.matchingItemCount}/${buyingIntent.totalItemCount}) shows buying-intent signal (explicit or implicit).`,
    );
  }
  if (cluster.frequency.growth.label === "rising") {
    whyBuild.push(
      `Mention volume is rising (recent half ${cluster.frequency.growth.recentHalfCount} vs earlier half ${cluster.frequency.growth.earlierHalfCount}).`,
    );
  }

  // competitionScore = 1/(1+n) where n = distinct named competitors found, so
  // n can be reconstructed from the score without needing the raw list here.
  const estimatedCompetitorCount = Math.round(1 / scoreBreakdown.competition - 1);

  const whyNotBuild: string[] = [];
  if (cluster.confidence.band === "low") {
    whyNotBuild.push(`Evidence confidence band is low (score ${cluster.confidence.score.toFixed(2)}).`);
  }
  if (cluster.frequency.uniqueSources < 2) {
    whyNotBuild.push(`Evidence comes from only ${cluster.frequency.uniqueSources} source(s).`);
  }
  if (buyingIntent.score === 0) {
    whyNotBuild.push("No buying-intent signal found in evidence.");
  }
  if (estimatedCompetitorCount >= CROWDED_COMPETITION_THRESHOLD) {
    whyNotBuild.push(`${estimatedCompetitorCount} named competitor(s) already mentioned in evidence.`);
  }
  if (cluster.frequency.growth.label === "declining") {
    whyNotBuild.push("Mention volume is declining.");
  }

  const risk: string[] = [];
  if (cluster.confidence.band === "low") {
    risk.push("Evidence confidence is low — treat findings as directional, not conclusive.");
  }
  if (estimatedCompetitorCount >= CROWDED_COMPETITION_THRESHOLD) {
    risk.push("Multiple named competitors already active in this space.");
  }
  if (risk.length === 0) {
    risk.push("No major heuristic risk signals detected in this evidence — this does not guarantee low risk.");
  }

  return {
    verdict,
    whyBuild: whyBuild.slice(0, 3),
    whyNotBuild: whyNotBuild.slice(0, 3),
    risk: risk.slice(0, 2),
    explanation: `weightedTotal=${scoreBreakdown.weightedTotal.toFixed(3)}, confidence band=${cluster.confidence.band}, buyingIntent=${buyingIntent.score.toFixed(2)} -> ${verdict} (BUILD requires score>=0.6 AND confidence!=low AND buyingIntent>0; IGNORE if score<0.4; otherwise WAIT).`,
  };
}
