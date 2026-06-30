import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsCustomer(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const pain = intel.existingSolutionScore.score;
  const buying = intel.opportunityGapScore.score;
  const timeSaved = intel.humanTimeSavedScore;
  const repeatedPain = intel.checks.isPainRepeated;
  const lookingForSolution = intel.checks.arePeopleLookingForSolutions;
  const alreadyPaying = intel.checks.arePeopleAlreadyPaying;

  const argumentsFor = [];
  const argumentsAgainst = [];
  const evidence = intel.existingSolutionScore.solutionFailureSignals.slice(0, 3);

  if (repeatedPain) argumentsFor.push(arg("Pain is repeated across users — not a one-off", 0.85, evidence));
  if (lookingForSolution) argumentsFor.push(arg("Users actively searching for alternatives", 0.80));
  if (alreadyPaying) argumentsFor.push(arg("Budget already allocated — switching intent confirmed", 0.90));
  if (timeSaved.estimatedHoursPerWeekPerUser >= 2) {
    argumentsFor.push(arg(`${timeSaved.estimatedHoursPerWeekPerUser}h/week saved per user — tangible ROI`, 0.75));
  }
  if (intel.existingSolutionScore.workaroundCount > 0) {
    argumentsFor.push(arg(`${intel.existingSolutionScore.workaroundCount} active workarounds = strong unmet need`, 0.80));
  }

  if (!repeatedPain) argumentsAgainst.push(arg("Pain may be isolated — low evidence count", 0.75));
  if (!lookingForSolution) argumentsAgainst.push(arg("No active solution search detected — latent problem", 0.65));
  if (intel.freshnessScore.oldestEvidenceDays > 365) argumentsAgainst.push(arg("Evidence is old — problem may already be solved", 0.6));

  const approve = repeatedPain && lookingForSolution && pain >= 0.4;
  const confidence = clamp(pain * 0.4 + buying * 0.3 + (alreadyPaying ? 0.3 : 0));

  return {
    role: "customer",
    argumentsFor,
    argumentsAgainst,
    evidence,
    assumptions: ["Target users have the same pain as evidence sources", "Evidence is representative sample"],
    unknowns: ["Exact user segment size", "Switching cost from current workaround", "Onboarding complexity tolerance"],
    risks: ["Pain may be niche", "Users may accept workarounds long-term"],
    verdict: approve ? "approve" : "neutral",
    confidence,
    summary: approve
      ? `Customers clearly feel this pain and are actively looking for a better solution.`
      : `Customer pain signal present but insufficient evidence of active solution search.`,
  };
}
