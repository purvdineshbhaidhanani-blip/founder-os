import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsInvestor(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const market = intel.marketSizeEstimate;
  const gap = intel.opportunityGapScore.score;
  const feasibility = intel.technicalFeasibilityScore;
  const recurring = intel.checks.hasRecurringRevenuePotential;
  const growing = intel.checks.isOpportunityGrowing;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (market.tier === "massive" || market.tier === "large") argumentsFor.push(arg(`${market.tier} TAM ($${market.estimatedTAMBillions}B) — venture-scale returns possible`, market.score, [market.rationale]));
  if (recurring) argumentsFor.push(arg("Recurring revenue model = high LTV, predictable ARR", 0.85));
  if (growing) argumentsFor.push(arg("Growing market — rising tide, not share battle", 0.80));
  if (gap >= 0.65) argumentsFor.push(arg(`Opportunity gap ${gap.toFixed(2)} — defensible position before category matures`, gap));
  if (intel.checks.arePeopleAlreadyPaying) argumentsFor.push(arg("Proven WTP — de-risks revenue hypothesis", 0.90));

  if (market.tier === "small" || market.tier === "tiny") argumentsAgainst.push(arg(`${market.tier} TAM — can't build venture-scale business`, 0.90, [market.rationale]));
  if (!recurring) argumentsAgainst.push(arg("No recurring revenue = low multiple at exit", 0.85));
  if (feasibility.legalRiskLevel === "high") argumentsAgainst.push(arg("High legal risk → long compliance roadmap → delayed revenue", 0.80));
  if (!growing) argumentsAgainst.push(arg("Flat market — growth only from taking share, harder path", 0.65));

  const approve = (market.tier === "large" || market.tier === "massive") && recurring && gap >= 0.5;
  const confidence = clamp(market.score * 0.4 + gap * 0.3 + (recurring ? 0.15 : 0) + (growing ? 0.15 : 0));

  return {
    role: "investor",
    argumentsFor,
    argumentsAgainst,
    evidence: [market.rationale],
    assumptions: ["Team can execute to $10M ARR within 36 months", "Equity financing available if needed"],
    unknowns: ["Exact TAM addressable by this specific solution", "Competitive moat durability", "Time to profitability"],
    risks: ["Market may not reach venture scale before runway ends", "Incumbent acqui-hire before product matures"],
    verdict: approve ? "approve" : market.score < 0.5 ? "reject" : "neutral",
    confidence,
    summary: approve
      ? `Investor approves — ${market.tier} market, recurring revenue, strong gap. Fundable.`
      : `Investor passes — ${market.tier} market or missing recurring model limits return potential.`,
  };
}
