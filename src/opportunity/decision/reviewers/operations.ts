import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsOperations(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const feasibility = intel.technicalFeasibilityScore;
  const timeSaved = intel.humanTimeSavedScore;
  const aiReady = intel.aiReadinessScore.score;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (feasibility.score >= 0.7) argumentsFor.push(arg(`Small team (${feasibility.estimatedTeamSize}) delivers MVP — lean ops from day one`, feasibility.score));
  if (aiReady >= 0.7) argumentsFor.push(arg("AI-first approach = low marginal cost per additional user", 0.75));
  if (timeSaved.annualisedValueUSD >= 5000) argumentsFor.push(arg(`High per-user value ($${timeSaved.annualisedValueUSD.toLocaleString()}/yr) enables support-light model`, 0.70));

  if (feasibility.estimatedTeamSize >= 5) argumentsAgainst.push(arg(`${feasibility.estimatedTeamSize}-person team required — high burn before first customer`, 0.75));
  if (feasibility.score < 0.4) argumentsAgainst.push(arg("Complex build = long ops ramp — support burden before product stable", 0.80));
  if (intel.technicalFeasibilityScore.estimatedTimeToMVP.includes("12") || intel.technicalFeasibilityScore.estimatedTimeToMVP.includes("18")) {
    argumentsAgainst.push(arg("Long MVP timeline — operational cash burn before revenue", 0.70));
  }

  const approve = feasibility.score >= 0.55 && feasibility.estimatedTeamSize <= 4;
  const confidence = clamp(feasibility.score * 0.5 + aiReady * 0.3 + Math.min(0.2, timeSaved.score * 0.2));

  return {
    role: "operations",
    argumentsFor,
    argumentsAgainst,
    evidence: [feasibility.rationale],
    assumptions: ["Cloud-first deployment — no on-prem", "Customer success at 1:50 ratio feasible"],
    unknowns: ["Infra cost at 1000 customers", "Support ticket volume per customer", "SLA requirements"],
    risks: [`Build estimate: ${feasibility.estimatedTeamSize} engineers × ${feasibility.estimatedTimeToMVP} months`],
    verdict: approve ? "approve" : "neutral",
    confidence,
    summary: approve
      ? `Operations: lean build — ${feasibility.estimatedTeamSize}-person team, ${feasibility.estimatedTimeToMVP} to MVP.`
      : `Operations: headcount or timeline risk — ${feasibility.estimatedTeamSize} engineers or ${feasibility.estimatedTimeToMVP} MVP timeline is high.`,
  };
}
