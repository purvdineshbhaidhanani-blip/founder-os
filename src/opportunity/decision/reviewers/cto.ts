import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsCTO(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const feasibility = intel.technicalFeasibilityScore;
  const aiReady = intel.aiReadinessScore;
  const legal = feasibility.legalRiskLevel;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (feasibility.score >= 0.7) argumentsFor.push(arg(`Buildable by ${feasibility.estimatedTeamSize}-person team in ${feasibility.estimatedTimeToMVP}`, feasibility.score, [feasibility.rationale]));
  if (aiReady.score >= 0.65) argumentsFor.push(arg(`AI-solvable — strong fit for current capabilities`, aiReady.score, [aiReady.rationale]));
  if (intel.checks.isTechnicallyPossible) argumentsFor.push(arg("No novel R&D required — proven tech stack", 0.75));

  if (feasibility.score < 0.5) argumentsAgainst.push(arg(`Low feasibility score ${feasibility.score.toFixed(2)} — significant engineering risk`, 1 - feasibility.score, [feasibility.rationale]));
  if (legal === "high") argumentsAgainst.push(arg("High legal risk — compliance overhead will slow delivery", 0.9));
  if (legal === "medium") argumentsAgainst.push(arg("Medium legal risk — HIPAA/GDPR/fintech compliance required", 0.5));
  if (aiReady.score < 0.4) argumentsAgainst.push(arg("Low AI fit — solution requires specialised non-AI engineering", 0.6));

  const approve = feasibility.score >= 0.5 && legal !== "high";
  const confidence = clamp(feasibility.score * 0.5 + aiReady.score * 0.3 + (legal === "low" ? 0.2 : legal === "medium" ? 0.1 : 0));

  return {
    role: "cto",
    argumentsFor,
    argumentsAgainst,
    evidence: [feasibility.rationale, aiReady.rationale],
    assumptions: [
      `Team of ${feasibility.estimatedTeamSize} engineers available`,
      "Modern cloud infrastructure in place",
      "AI APIs (LLMs) accessible at required latency",
    ],
    unknowns: ["Data pipeline complexity", "Third-party API reliability", "Scaling cost at 10x usage"],
    risks: legal !== "low" ? [`${legal} legal risk in ${intel.category}`] : [],
    verdict: approve ? "approve" : "reject",
    confidence,
    summary: approve
      ? `CTO approves — ${intel.category} buildable with ${feasibility.estimatedTeamSize} engineers, ${legal} legal risk.`
      : `CTO rejects — feasibility score ${feasibility.score.toFixed(2)} or ${legal} legal risk blocks MVP.`,
  };
}
