import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsSales(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const paying = intel.checks.arePeopleAlreadyPaying;
  const buying = intel.opportunityGapScore.score;
  const timeSaved = intel.humanTimeSavedScore;
  const market = intel.marketSizeEstimate;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (paying) argumentsFor.push(arg("People already paying for inferior solution — upgrade sale", 0.90));
  if (timeSaved.annualisedValueUSD >= 5000) argumentsFor.push(arg(`$${timeSaved.annualisedValueUSD.toLocaleString()} value/user/yr — easy ROI conversation`, 0.85));
  if (intel.checks.isPainRepeated) argumentsFor.push(arg("Repeated pain across users = replicable pipeline", 0.75));
  if (market.tier === "large" || market.tier === "massive") argumentsFor.push(arg(`${market.tier} market — large Rolodex of potential accounts`, 0.70));

  if (!paying) argumentsAgainst.push(arg("No budget signal — price discovery will be painful", 0.75));
  if (timeSaved.annualisedValueUSD < 2000) argumentsAgainst.push(arg("Low value delivered per user — price ceiling too low for B2B", 0.80));
  if (intel.technicalFeasibilityScore.estimatedTimeToMVP.includes("12")) {
    argumentsAgainst.push(arg("Long build cycle — sales pipeline starts cold with no product to show", 0.65));
  }

  const approve = paying && timeSaved.annualisedValueUSD >= 3000;
  const confidence = clamp(buying * 0.4 + (paying ? 0.3 : 0) + Math.min(0.3, timeSaved.annualisedValueUSD / 30000));

  return {
    role: "sales",
    argumentsFor,
    argumentsAgainst,
    evidence: [],
    assumptions: ["Enterprise sales cycle 30–90 days", "Bottom-up PLG to top-down possible"],
    unknowns: ["Pricing ceiling per seat", "Procurement complexity", "Champion profile in target org"],
    risks: ["Long sales cycle with no early revenue", "Competition on price from incumbents"],
    verdict: approve ? "approve" : buying >= 0.5 ? "neutral" : "reject",
    confidence,
    summary: approve
      ? `Sales-ready: proven budget, $${timeSaved.annualisedValueUSD.toLocaleString()} ROI/user/yr.`
      : `Sales skeptical — budget signal or value-per-user insufficient for repeatable close.`,
  };
}
