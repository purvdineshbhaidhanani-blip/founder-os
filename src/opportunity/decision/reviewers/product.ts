import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsProduct(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const gap = intel.opportunityGapScore.score;
  const existing = intel.existingSolutionScore;
  const market = intel.marketSizeEstimate;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (intel.checks.doExistingSolutionsFail) argumentsFor.push(arg("Existing solutions clearly fail users — PMF opening exists", 0.85, existing.solutionFailureSignals.slice(0, 2)));
  if (intel.checks.arePeopleLookingForSolutions) argumentsFor.push(arg("Pull-market signal — users actively searching", 0.80));
  if (gap >= 0.6) argumentsFor.push(arg(`Strong opportunity gap score ${gap.toFixed(2)} — clear value prop possible`, gap));
  if (intel.checks.hasRecurringRevenuePotential) argumentsFor.push(arg("Recurring revenue model supported by evidence", 0.75));

  if (!intel.checks.doExistingSolutionsFail) argumentsAgainst.push(arg("Existing solutions appear adequate — unclear why users would switch", 0.85));
  if (market.tier === "tiny" || market.tier === "small") argumentsAgainst.push(arg(`${market.tier} market limits product ambition`, 0.7));
  if (!intel.checks.isBusinessRelated) argumentsAgainst.push(arg("Category unclear — business use case not proven", 0.75));

  const approve = intel.checks.doExistingSolutionsFail && gap >= 0.5;
  const confidence = clamp(gap * 0.5 + existing.score * 0.3 + market.score * 0.2);

  return {
    role: "product",
    argumentsFor,
    argumentsAgainst,
    evidence: existing.solutionFailureSignals,
    assumptions: ["Users will trial a new tool if onboarding is <5 min", "Feature parity with existing tools within 3 months"],
    unknowns: ["Exact MVP scope", "Activation metric definition", "Time-to-value for first user"],
    risks: ["Feature creep risk if user segment is broad", "Existing players may copy core feature quickly"],
    verdict: approve ? "approve" : gap >= 0.4 ? "neutral" : "reject",
    confidence,
    summary: approve
      ? `Product sees clear opening — existing solutions fail and users are looking.`
      : `Product unconvinced — gap score too low or existing solutions adequate.`,
  };
}
