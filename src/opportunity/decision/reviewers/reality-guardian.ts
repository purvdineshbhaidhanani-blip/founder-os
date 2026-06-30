import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

// Reality Guardian: enforces epistemic humility. Challenges overconfidence.

export function reviewAsRealityGuardian(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const confidence = intel.overallConfidence;
  const signalCount = intel.opportunityGapScore.score;
  const freshness = intel.freshnessScore;
  const noise = intel.noiseScore;
  const evidence = intel.existingSolutionScore.solutionFailureSignals.slice(0, 3);

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (confidence >= 0.6) argumentsFor.push(arg(`Intelligence score ${confidence.toFixed(2)} — evidence quality meets bar`, confidence));
  if (freshness.newestEvidenceDays <= 90) argumentsFor.push(arg(`Fresh evidence (newest: ${freshness.newestEvidenceDays}d) — problem is current`, 0.80));
  if (noise.score >= 0.7) argumentsFor.push(arg(`Low noise score — signal is genuine, not hype`, noise.score));
  if (intel.authorCredibilityScore.highCredibilityCount >= 2) argumentsFor.push(arg(`${intel.authorCredibilityScore.highCredibilityCount} high-credibility authors — evidence from practitioners`, 0.75));

  if (confidence < 0.4) argumentsAgainst.push(arg(`Low intelligence score (${confidence.toFixed(2)}) — insufficient evidence to trust this signal`, 0.90));
  if (freshness.oldestEvidenceDays > 365) argumentsAgainst.push(arg(`Oldest evidence ${freshness.oldestEvidenceDays}d old — problem may have evolved or been solved`, 0.75));
  if (noise.score < 0.5) argumentsAgainst.push(arg(`Noise contamination (score ${noise.score.toFixed(2)}) — evidence may include irrelevant content`, 0.80));
  if (intel.sourceTrustScore.score < 0.5) argumentsAgainst.push(arg(`Low source trust (${intel.sourceTrustScore.score.toFixed(2)}) — evidence from low-credibility channels`, 0.75));
  if (intel.rejectionReasons.length > 0) {
    argumentsAgainst.push(arg(`Prior rejection flags: ${intel.rejectionReasons.join(", ")}`, 0.85));
  }

  const approve = confidence >= 0.5 && noise.score >= 0.5 && freshness.newestEvidenceDays <= 180;
  const guardianConfidence = clamp(confidence * 0.4 + noise.score * 0.3 + (freshness.score) * 0.3);

  return {
    role: "reality-guardian",
    argumentsFor,
    argumentsAgainst,
    evidence,
    assumptions: ["Sample of evidence is representative", "Evidence sources are independent"],
    unknowns: ["Total population of affected users", "Selection bias in collected evidence", "Researcher's confirmation bias"],
    risks: ["Evidence may be anecdotal", "Online complaints overrepresent power users, not mainstream"],
    verdict: approve ? "approve" : confidence < 0.3 ? "reject" : "neutral",
    confidence: guardianConfidence,
    summary: approve
      ? `Reality Guardian: evidence is fresh, credible, low-noise. Passes epistemic bar.`
      : `Reality Guardian: confidence too low or evidence too stale/noisy to trust this signal.`,
  };
}
