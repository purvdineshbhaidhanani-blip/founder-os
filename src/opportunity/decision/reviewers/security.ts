import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

const HIGH_SECURITY_CATEGORIES = new Set(["cybersecurity", "finance", "healthcare-tech", "legal-tech", "enterprise"]);
const MEDIUM_SECURITY_CATEGORIES = new Set(["hr", "operations", "sales", "marketing", "saas"]);

export function reviewAsSecurity(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const legal = intel.technicalFeasibilityScore.legalRiskLevel;
  const category = intel.category;
  const isHighRisk = HIGH_SECURITY_CATEGORIES.has(category);
  const isMediumRisk = MEDIUM_SECURITY_CATEGORIES.has(category);

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (!isHighRisk && !isMediumRisk) argumentsFor.push(arg("Low-security-risk category — no PII/PHI/PCI scope", 0.80));
  if (legal === "low") argumentsFor.push(arg("No high-risk regulatory triggers detected in evidence", 0.75));
  if (intel.aiReadinessScore.score >= 0.7 && !isHighRisk) argumentsFor.push(arg("AI-native approach avoids human data handling complexity", 0.65));

  if (legal === "high") argumentsAgainst.push(arg("High legal risk flag — likely touches sensitive regulated data", 0.95));
  if (isHighRisk) argumentsAgainst.push(arg(`${category} category requires SOC2/ISO27001/HIPAA/PCI compliance from day one`, 0.85));
  if (isMediumRisk) argumentsAgainst.push(arg(`${category} handles customer data — GDPR/CCPA compliance mandatory`, 0.65));

  const approve = legal !== "high" && !isHighRisk;
  const confidence = clamp(
    (legal === "low" ? 0.8 : legal === "medium" ? 0.5 : 0.2) * 0.5 +
    (!isHighRisk ? 0.5 : 0.1) * 0.5,
  );

  return {
    role: "security",
    argumentsFor,
    argumentsAgainst,
    evidence: [],
    assumptions: ["MVP deployed on SOC2-compliant cloud provider", "No PII stored in initial version"],
    unknowns: ["Data residency requirements of target customers", "Pen test scope for MVP", "Insurance requirements"],
    risks: legal === "high" ? ["Regulatory violation risk if compliance not built in from start"] : [],
    verdict: approve ? "approve" : legal === "high" ? "reject" : "neutral",
    confidence,
    summary: approve
      ? `Security: ${category} at ${legal} risk — manageable compliance scope for startup.`
      : `Security: ${category} requires significant compliance investment before revenue.`,
  };
}
