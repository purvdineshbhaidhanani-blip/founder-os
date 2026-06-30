import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsCompetitor(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const existing = intel.existingSolutionScore;
  const gap = intel.opportunityGapScore.score;
  const market = intel.marketSizeEstimate;
  const feasibility = intel.technicalFeasibilityScore;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (existing.score >= 0.6) argumentsFor.push(arg("Incumbents failing users — vulnerable to disruption", existing.score, existing.solutionFailureSignals.slice(0, 2)));
  if (feasibility.score >= 0.7) argumentsFor.push(arg("Fast MVP possible — can beat incumbents to market if they're slow to respond", 0.70));
  if (gap >= 0.65) argumentsFor.push(arg("Large gap means no single competitor owns this yet", gap));

  if (existing.score < 0.35) argumentsAgainst.push(arg("Existing solutions are adequate — incumbents will defend hard", 1 - existing.score));
  if (market.tier === "massive" || market.tier === "large") argumentsAgainst.push(arg(`${market.tier} market attracts well-funded competitors — differentiation window short`, 0.65));
  if (feasibility.score >= 0.85) argumentsAgainst.push(arg("Low build complexity means incumbents can copy MVP quickly", 0.60));

  const approve = existing.score >= 0.5 && gap >= 0.5;
  const confidence = clamp(existing.score * 0.5 + gap * 0.3 + (market.score * 0.2));

  return {
    role: "competitor",
    argumentsFor,
    argumentsAgainst,
    evidence: existing.solutionFailureSignals,
    assumptions: ["Incumbents are slow to iterate on core pain", "New entrant can differentiate on UX + AI speed"],
    unknowns: ["Competitor product roadmap", "Incumbent pricing pressure tactics", "Partnership moats"],
    risks: ["Competitor acquires talent or buys adjacent startup", "Open-source alternative emerges"],
    verdict: approve ? "approve" : "neutral",
    confidence,
    summary: approve
      ? `Competitor lens: incumbents failing on key dimension — window for disruption open.`
      : `Competitor lens: incumbents may be adequate or will copy quickly.`,
  };
}
