import type { ReviewerOutput, ConsensusScore, CourtVerdict, DevilsAdvocateResult } from "./types.js";

// ---------------------------------------------------------------------------
// Verdict Engine
// Maps consensus + devil's advocate outcome to exactly one of 5 verdicts.
// ---------------------------------------------------------------------------

interface VerdictInputs {
  outputs: ReviewerOutput[];
  consensus: ConsensusScore;
  devilsAdvocate: DevilsAdvocateResult;
  intelligenceScore: number;
}

export function determineVerdict(inputs: VerdictInputs): { verdict: CourtVerdict; rationale: string; confidence: number } {
  const { outputs, consensus, devilsAdvocate, intelligenceScore } = inputs;

  const approveCount = outputs.filter((o) => o.verdict === "approve").length;
  const rejectCount = outputs.filter((o) => o.verdict === "reject").length;
  const n = outputs.length;

  const approveFrac = approveCount / n;
  const rejectFrac = rejectCount / n;

  // Devil's advocate failure = hard REJECT unless tiny rejection count
  if (!devilsAdvocate.survived && devilsAdvocate.rejectionAttempts.length >= 3) {
    return {
      verdict: "REJECT",
      rationale: `Failed ${devilsAdvocate.rejectionAttempts.length} Devil's Advocate tests. ${devilsAdvocate.rebuttal}`,
      confidence: consensus.confidenceScore,
    };
  }

  // Decisive approve: >50% approve and intelligence high
  if (approveFrac >= 0.5 && intelligenceScore >= 0.55 && devilsAdvocate.survived) {
    return {
      verdict: "BUILD_NOW",
      rationale: `${approveCount}/${n} reviewers approve, intelligence score ${intelligenceScore.toFixed(2)}, survived Devil's Advocate. ${devilsAdvocate.rebuttal}`,
      confidence: Math.min(1, consensus.confidenceScore * 1.1),
    };
  }

  // Moderate approve with confidence gap
  if (approveFrac >= 0.35 && intelligenceScore >= 0.4) {
    return {
      verdict: "RESEARCH_MORE",
      rationale: `${approveCount}/${n} approve but intelligence score ${intelligenceScore.toFixed(2)} below confidence threshold. Gather more evidence on: ${devilsAdvocate.weakestPoint}`,
      confidence: consensus.confidenceScore,
    };
  }

  // Low confidence but not actively rejected
  if (rejectFrac < 0.35 && intelligenceScore >= 0.3) {
    return {
      verdict: "WAIT",
      rationale: `Split verdict (${approveCount} approve, ${rejectCount} reject, ${n - approveCount - rejectCount} neutral). Monitor for stronger signal.`,
      confidence: consensus.confidenceScore * 0.8,
    };
  }

  // Mostly neutral / monitoring signal
  if (rejectFrac < 0.5 && intelligenceScore >= 0.25) {
    return {
      verdict: "MONITOR",
      rationale: `Weak signal — insufficient consensus (${approveCount}/${n} approve). Track for 30–90 days for trend confirmation.`,
      confidence: consensus.confidenceScore * 0.7,
    };
  }

  // Reject
  return {
    verdict: "REJECT",
    rationale: `${rejectCount}/${n} reviewers reject. Intelligence score ${intelligenceScore.toFixed(2)}. Weakest point: ${devilsAdvocate.weakestPoint}`,
    confidence: consensus.confidenceScore,
  };
}
