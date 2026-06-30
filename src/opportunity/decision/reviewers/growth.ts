import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsGrowth(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const market = intel.marketSizeEstimate;
  const gap = intel.opportunityGapScore.score;
  const growing = intel.checks.isOpportunityGrowing;
  const recurring = intel.checks.hasRecurringRevenuePotential;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (growing) argumentsFor.push(arg("Growing market — organic tailwind reduces CAC", 0.80));
  if (intel.sourceTrustScore.score >= 0.7) argumentsFor.push(arg("High-trust sources = credible community presence for PLG", 0.72));
  if (intel.existingSolutionScore.workaroundCount >= 2) argumentsFor.push(arg("Workaround communities (Reddit/GitHub) = built-in acquisition channel", 0.75));
  if (market.score >= 0.7) argumentsFor.push(arg(`Large market (${market.estimatedTAMBillions}B TAM) = room for multiple acquisition channels`, market.score));

  if (!growing) argumentsAgainst.push(arg("Flat market — growth requires taking share, not riding wave", 0.70));
  if (market.tier === "tiny" || market.tier === "small") argumentsAgainst.push(arg(`${market.tier} market — CAC:LTV ratio likely poor without niche pricing`, 0.75));
  if (!recurring) argumentsAgainst.push(arg("No recurring revenue = low LTV — growth math doesn't work", 0.80));

  const approve = gap >= 0.5 && (growing || market.score >= 0.6) && recurring;
  const confidence = clamp(gap * 0.35 + market.score * 0.35 + (growing ? 0.15 : 0) + (recurring ? 0.15 : 0));

  return {
    role: "growth",
    argumentsFor,
    argumentsAgainst,
    evidence: [],
    assumptions: ["PLG via community and free tier is viable", "Organic SEO on pain keywords possible"],
    unknowns: ["CAC by channel", "Viral coefficient in target segment", "Churn rate at 6 months"],
    risks: ["Paid acquisition economics may not work at small market scale", "Competing products with large marketing budgets"],
    verdict: approve ? "approve" : !recurring ? "reject" : "neutral",
    confidence,
    summary: approve
      ? `Growth sees strong motion — ${market.tier} market, recurring revenue, ${growing ? "growing trend" : "stable demand"}.`
      : `Growth skeptical — ${!recurring ? "no recurring revenue" : "market/trend insufficient"} for scalable acquisition.`,
  };
}
