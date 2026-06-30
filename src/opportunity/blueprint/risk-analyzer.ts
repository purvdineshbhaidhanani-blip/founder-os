import type { BlueprintContext, RiskAnalysis, Risk } from "./types.js";

// ---------------------------------------------------------------------------
// Risk Analyzer
// Synthesises business, technical, and legal risks from all intelligence signals.
// ---------------------------------------------------------------------------

export function analyzeRisks(ctx: BlueprintContext): RiskAnalysis {
  const { intelligence: intel, decision } = ctx;
  const legalLevel = intel.technicalFeasibilityScore.legalRiskLevel;
  const market = intel.marketSizeEstimate;
  const feasibility = intel.technicalFeasibilityScore;

  // Business risks
  const businessRisks: Risk[] = [];

  if (!intel.checks.arePeopleAlreadyPaying) {
    businessRisks.push({
      description: "Unproven willingness-to-pay — users complain but may not open wallets",
      severity: "high",
      probability: "medium",
      mitigation: "Run price discovery interviews before committing engineering resources. Offer pay-upfront pre-launch deal.",
    });
  }

  if (market.tier === "small" || market.tier === "tiny") {
    businessRisks.push({
      description: `${market.tier} TAM ($${market.estimatedTAMBillions}B) — venture-scale exit unlikely`,
      severity: "high",
      probability: "high",
      mitigation: "Target adjacent higher-value segment or expand ICP. Reconsider if bootstrapped vs VC-backed.",
    });
  }

  if (!intel.checks.isOpportunityGrowing) {
    businessRisks.push({
      description: "Flat or declining market trend — growth only from taking competitor share",
      severity: "medium",
      probability: "medium",
      mitigation: "Identify adjacent growing use case. Focus on niche domination before category expansion.",
    });
  }

  // Augment with court's top against-arguments as business risks
  for (const arg of decision.topArgumentsAgainst.slice(0, 2)) {
    if (arg.weight >= 0.7) {
      businessRisks.push({
        description: arg.claim,
        severity: arg.weight >= 0.85 ? "high" : "medium",
        probability: "medium",
        mitigation: "Address this before launch — validate or de-risk with customer interviews",
      });
    }
  }

  // Technical risks
  const technicalRisks: Risk[] = [];

  if (feasibility.score < 0.6) {
    technicalRisks.push({
      description: `Low technical feasibility (${feasibility.score.toFixed(2)}) — MVP may exceed team capacity`,
      severity: "high",
      probability: "high",
      mitigation: `Scope MVP aggressively to ${Math.max(1, feasibility.estimatedTeamSize - 1)} engineers. Use managed services over custom-built infrastructure.`,
    });
  }

  if (intel.aiReadinessScore.score >= 0.6) {
    technicalRisks.push({
      description: "AI hallucination risk in user-facing outputs — incorrect results erode trust",
      severity: "medium",
      probability: "medium",
      mitigation: "Build confidence scores + human review step. Graceful fallback to 'needs review' state. Extensive eval harness before launch.",
    });
  }

  technicalRisks.push({
    description: "Third-party API dependency — if a key integration changes its API or pricing, core feature breaks",
    severity: "medium",
    probability: "low",
    mitigation: "Abstract integrations behind internal adapter layer. Monitor API changelogs. Keep 2+ alternatives per integration.",
  });

  if (feasibility.estimatedTeamSize >= 4) {
    technicalRisks.push({
      description: "Team coordination overhead grows non-linearly above 3 engineers in early stage",
      severity: "low",
      probability: "medium",
      mitigation: "Strong CI/CD from day one. Weekly architecture review. Pair programming for complex modules.",
    });
  }

  // Legal risks
  const legalRisks: Risk[] = [];

  if (legalLevel === "high") {
    legalRisks.push({
      description: "High legal risk — product operates in regulated domain (medical/financial/legal advice)",
      severity: "high",
      probability: "high",
      mitigation: "Engage compliance counsel before launch. Clearly disclaim product is not professional advice. Consider waiting for legal opinion before processing real data.",
    });
  }

  if (legalLevel === "medium") {
    legalRisks.push({
      description: "GDPR/CCPA/HIPAA data handling obligations — non-compliance fines can reach €20M",
      severity: "high",
      probability: "medium",
      mitigation: "Implement data classification at ingestion. DPA templates ready. Privacy-by-design architecture. Cookie consent from day one.",
    });
  }

  legalRisks.push({
    description: "IP risk: if AI generates content similar to competitor's, copyright disputes possible",
    severity: "low",
    probability: "low",
    mitigation: "Retain legal counsel for Terms of Service and AI output ownership clauses. Indemnification clause in enterprise contracts.",
  });

  const topRisk = findTopRisk([...businessRisks, ...technicalRisks, ...legalRisks]);

  return { businessRisks, technicalRisks, legalRisks, topRisk };
}

function findTopRisk(risks: Risk[]): string {
  const highRisks = risks.filter((r) => r.severity === "high" && r.probability !== "low");
  if (highRisks.length > 0) return highRisks[0]!.description;
  const medRisks = risks.filter((r) => r.severity === "medium");
  return medRisks[0]?.description ?? risks[0]?.description ?? "No critical risks identified";
}
