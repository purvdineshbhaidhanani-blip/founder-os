import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsFounder(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const gap = intel.opportunityGapScore.score;
  const market = intel.marketSizeEstimate.score;
  const feasibility = intel.technicalFeasibilityScore.score;
  const timeSaved = intel.humanTimeSavedScore.score;
  const buying = intel.existingSolutionScore.score;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (gap >= 0.65) argumentsFor.push(arg("Clear gap — no dominant solution", gap, [intel.opportunityGapScore.rationale]));
  if (market >= 0.7) argumentsFor.push(arg(`Market size attractive: ${intel.marketSizeEstimate.tier} (${intel.marketSizeEstimate.estimatedTAMBillions}B TAM)`, market, [intel.marketSizeEstimate.rationale]));
  if (timeSaved >= 0.5) argumentsFor.push(arg(`Strong ROI for users: ~$${intel.humanTimeSavedScore.annualisedValueUSD.toLocaleString()}/yr saved`, timeSaved));
  if (intel.checks.isOpportunityGrowing) argumentsFor.push(arg("Growing market — timing is right", 0.7));
  if (intel.checks.arePeopleAlreadyPaying) argumentsFor.push(arg("People already paying — monetisation proven", 0.85));

  if (market < 0.4) argumentsAgainst.push(arg("Market too niche for venture-scale returns", 1 - market));
  if (feasibility < 0.5) argumentsAgainst.push(arg("Build complexity high — long time to first revenue", 1 - feasibility, [intel.technicalFeasibilityScore.rationale]));
  if (!intel.checks.hasRecurringRevenuePotential) argumentsAgainst.push(arg("No clear recurring revenue model", 0.7));
  if (intel.technicalFeasibilityScore.legalRiskLevel === "high") argumentsAgainst.push(arg("High legal risk — regulatory moat is a double-edged sword", 0.9));

  const approve = argumentsFor.length > argumentsAgainst.length && gap >= 0.5 && market >= 0.5;
  const confidence = clamp((gap * 0.4 + market * 0.3 + feasibility * 0.3));

  return {
    role: "founder",
    argumentsFor,
    argumentsAgainst,
    evidence: intel.existingSolutionScore.solutionFailureSignals.slice(0, 3),
    assumptions: ["We can recruit 2-3 engineers within 3 months", "Market is reachable via content + community"],
    unknowns: ["Exact ICP segment", "Willingness-to-pay ceiling", "Key competitor response speed"],
    risks: argumentsAgainst.map((a) => a.claim),
    verdict: approve ? "approve" : gap >= 0.4 ? "neutral" : "reject",
    confidence,
    summary: approve
      ? `Founder sees real gap in ${intel.category} market with clear pain signal.`
      : `Founder cautious — market or feasibility doubts outweigh opportunity signals.`,
  };
}
