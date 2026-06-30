import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsUX(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const workarounds = intel.existingSolutionScore.workaroundCount;
  const timeSaved = intel.humanTimeSavedScore;
  const aiReady = intel.aiReadinessScore.score;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (workarounds >= 2) argumentsFor.push(arg(`${workarounds} workarounds = painful UX gap — users desperate for streamlined flow`, 0.80));
  if (timeSaved.estimatedHoursPerWeekPerUser >= 3) argumentsFor.push(arg(`${timeSaved.estimatedHoursPerWeekPerUser}h/week friction = compelling UX before/after story`, 0.75));
  if (intel.checks.arePeopleLookingForSolutions) argumentsFor.push(arg("Active solution search = users motivated to learn new tool", 0.70));
  if (aiReady >= 0.7) argumentsFor.push(arg("AI can automate tedious steps — UX dramatically simpler than manual", 0.72));

  if (workarounds === 0) argumentsAgainst.push(arg("No workarounds detected — current UX may be acceptable", 0.65));
  if (intel.technicalFeasibilityScore.score < 0.5) argumentsAgainst.push(arg("High complexity may produce cluttered UI — simple UX hard to achieve", 0.6));

  const approve = workarounds >= 1 && timeSaved.score >= 0.3;
  const confidence = clamp(timeSaved.score * 0.4 + (workarounds / 5) * 0.4 + aiReady * 0.2);

  return {
    role: "ux",
    argumentsFor,
    argumentsAgainst,
    evidence: [],
    assumptions: ["Target users are technical enough to adopt new tooling", "Onboarding can be reduced to <3 steps"],
    unknowns: ["Exact workflow steps to replace", "Mobile vs desktop split", "Collaboration use cases"],
    risks: ["Over-engineering feature set", "Users unwilling to change habits without strong incentive"],
    verdict: approve ? "approve" : "neutral",
    confidence,
    summary: approve
      ? `UX case is strong — ${workarounds} workarounds and ${timeSaved.estimatedHoursPerWeekPerUser}h/week friction create clear before/after story.`
      : `UX signal weak — insufficient evidence of painful user flow to replace.`,
  };
}
