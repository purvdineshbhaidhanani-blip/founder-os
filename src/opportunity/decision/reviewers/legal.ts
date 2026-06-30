import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsLegal(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const legal = intel.technicalFeasibilityScore.legalRiskLevel;
  const category = intel.category;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (legal === "low") argumentsFor.push(arg("No regulated data or industry — standard SaaS terms sufficient", 0.85));
  if (intel.checks.isLegallySafe) argumentsFor.push(arg("Legal safety check passed — no medical/financial/legal advice scope", 0.80));

  if (legal === "high") {
    argumentsAgainst.push(arg("High legal risk — product likely falls under regulated practice (medical/legal/financial)", 0.95));
    argumentsAgainst.push(arg("Liability exposure requires expensive professional indemnity insurance", 0.80));
  }
  if (legal === "medium") {
    argumentsAgainst.push(arg("GDPR/HIPAA/CCPA compliance required — DPA, privacy policy, data processing agreements", 0.65));
  }
  if (category === "legal-tech") argumentsAgainst.push(arg("Legal tech: UPL (unauthorized practice of law) risk in jurisdictions", 0.75));
  if (category === "healthcare-tech") argumentsAgainst.push(arg("FDA SaMD classification may apply — 510(k) or De Novo pathway", 0.85));
  if (category === "finance") argumentsAgainst.push(arg("Money transmission / securities laws — state-by-state licensing", 0.80));

  const approve = legal === "low";
  const confidence = clamp(legal === "low" ? 0.85 : legal === "medium" ? 0.5 : 0.15);

  return {
    role: "legal",
    argumentsFor,
    argumentsAgainst,
    evidence: [],
    assumptions: ["Operating in US/EU jurisdictions", "B2B SaaS model — not consumer financial product"],
    unknowns: ["IP ownership of AI-generated outputs", "Data ownership clauses in customer contracts", "Export control implications"],
    risks: legal !== "low" ? [`${legal} legal risk in ${category} — regulatory non-compliance could halt operations`] : [],
    verdict: approve ? "approve" : legal === "high" ? "reject" : "neutral",
    confidence,
    summary: approve
      ? `Legal clear — ${category} at low risk, standard SaaS legal stack sufficient.`
      : `Legal flags ${legal} risk in ${category} — significant compliance budget required.`,
  };
}
