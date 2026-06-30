import type { ReviewerOutput, ConsensusScore } from "./types.js";

// ---------------------------------------------------------------------------
// Consensus Engine
// Calculates agreement, conflict, evidence strength, risk, and confidence.
// ---------------------------------------------------------------------------

export function calculateConsensus(outputs: ReviewerOutput[]): ConsensusScore {
  const n = outputs.length;
  if (n === 0) return { agreementScore: 0, conflictScore: 1, evidenceScore: 0, riskScore: 1, confidenceScore: 0 };

  const approveCount = outputs.filter((o) => o.verdict === "approve").length;
  const rejectCount = outputs.filter((o) => o.verdict === "reject").length;
  const neutralCount = outputs.filter((o) => o.verdict === "neutral").length;

  // Agreement: fraction of reviewers on majority side
  const majorityCount = Math.max(approveCount, rejectCount, neutralCount);
  const agreementScore = majorityCount / n;

  // Conflict: normalised std-deviation proxy — how split the vote is
  const majorityFrac = majorityCount / n;
  const conflictScore = 1 - majorityFrac;

  // Evidence score: average weight of all arguments across all reviewers
  const allArgWeights = outputs.flatMap((o) => [
    ...o.argumentsFor.map((a) => a.weight),
    ...o.argumentsAgainst.map((a) => a.weight),
  ]);
  const evidenceScore = allArgWeights.length > 0
    ? allArgWeights.reduce((s, w) => s + w, 0) / allArgWeights.length
    : 0;

  // Risk score: average weight of against-arguments (higher = more at risk)
  const againstWeights = outputs.flatMap((o) => o.argumentsAgainst.map((a) => a.weight));
  const riskScore = againstWeights.length > 0
    ? againstWeights.reduce((s, w) => s + w, 0) / againstWeights.length
    : 0;

  // Confidence: weighted blend of reviewer confidence scores
  const avgReviewerConfidence = outputs.reduce((s, o) => s + o.confidence, 0) / n;
  const confidenceScore = Math.max(0, Math.min(1,
    avgReviewerConfidence * 0.5 + agreementScore * 0.3 + evidenceScore * 0.2,
  ));

  return { agreementScore, conflictScore, evidenceScore, riskScore, confidenceScore };
}
