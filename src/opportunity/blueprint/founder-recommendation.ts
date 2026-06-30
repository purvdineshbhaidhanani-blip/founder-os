import type { BlueprintContext, FounderRecommendation, BlueprintVerdict } from "./types.js";
import type { ROIAnalysis, BreakevenAnalysis, RiskAnalysis } from "./types.js";

// ---------------------------------------------------------------------------
// Founder Recommendation Engine
// Synthesises all signals into actionable verdict + next steps.
// ---------------------------------------------------------------------------

export function buildFounderRecommendation(
  ctx: BlueprintContext,
  roi: ROIAnalysis,
  breakeven: BreakevenAnalysis,
  risks: RiskAnalysis,
): FounderRecommendation {
  const { intelligence: intel, decision } = ctx;

  const verdict = deriveBlueprintVerdict(ctx, roi, risks);
  const confidence = Math.round(intel.overallConfidence * decision.confidence * 100) / 100;

  const topReasonsFor = decision.topArgumentsFor.slice(0, 3).map((a) => a.claim);
  const topReasonsAgainst = decision.topArgumentsAgainst.slice(0, 3).map((a) => a.claim);

  const immediateActions = buildImmediateActions(verdict, ctx, breakeven);
  const keyRisks = [
    risks.topRisk,
    ...risks.businessRisks.filter((r) => r.severity === "high").map((r) => r.description),
  ].slice(0, 4);

  const founderFitNotes = buildFitNotes(intel.category, intel.technicalFeasibilityScore.estimatedTeamSize);

  const summary = buildSummary(verdict, intel, roi, breakeven);

  return {
    verdict,
    summary,
    topReasonsFor,
    topReasonsAgainst,
    immediateActions,
    keyRisks,
    confidence,
    founderFitNotes,
  };
}

function deriveBlueprintVerdict(
  ctx: BlueprintContext,
  roi: ROIAnalysis,
  risks: RiskAnalysis,
): BlueprintVerdict {
  const { intelligence: intel, decision } = ctx;
  const highRiskCount = risks.businessRisks.filter((r) => r.severity === "high").length
    + risks.technicalRisks.filter((r) => r.severity === "high").length
    + risks.legalRisks.filter((r) => r.severity === "high").length;

  // Court already said REJECT → align
  if (decision.verdict === "REJECT") return "REJECT";

  // High legal risk is blocking
  if (intel.technicalFeasibilityScore.legalRiskLevel === "high") return "RESEARCH_MORE";

  // Strong signal: BUILD_NOW
  if (
    decision.verdict === "BUILD_NOW" &&
    intel.overallConfidence >= 0.5 &&
    roi.projectedROIPercent >= 200 &&
    highRiskCount <= 1
  ) return "BUILD_NOW";

  // Moderate signal + research gap
  if (decision.verdict === "RESEARCH_MORE" || !intel.checks.arePeopleAlreadyPaying) return "RESEARCH_MORE";

  // Good market but needs more validation
  if (intel.marketSizeEstimate.score >= 0.6 && intel.overallConfidence >= 0.4) return "BUILD_LATER";

  // Watching space
  if (decision.verdict === "MONITOR" || decision.verdict === "WAIT") return "MONITOR";

  return "REJECT";
}

function buildImmediateActions(verdict: BlueprintVerdict, ctx: BlueprintContext, breakeven: BreakevenAnalysis): string[] {
  const { intelligence: intel } = ctx;

  if (verdict === "BUILD_NOW") {
    return [
      `Run 5 customer discovery calls with ${intel.category} practitioners this week`,
      `Set up waitlist landing page — validate demand before writing code`,
      `Recruit co-founder or first engineer with ${intel.category} domain experience`,
      `Build working prototype in 2 weeks — validate core workflow automation`,
      `Target ${breakeven.customersNeeded} paying customers for break-even — set milestone date`,
    ];
  }

  if (verdict === "BUILD_LATER") {
    return [
      "Run 10 customer interviews to sharpen ICP and validate willingness-to-pay",
      "Publish 3 content pieces on the problem to build audience before building product",
      "Track competitor moves monthly — watch for pricing changes or product gaps",
      "Define go/no-go criteria: 3 people commit to pay before building",
    ];
  }

  if (verdict === "RESEARCH_MORE") {
    return [
      "Conduct 15 structured interviews with target ICP",
      "Run a concierge MVP — do the job manually for 3 customers to validate",
      "Quantify willingness-to-pay with a fake door test or pre-sale",
      `Investigate legal risk in ${intel.category} before any technical investment`,
    ];
  }

  if (verdict === "MONITOR") {
    return [
      "Set a 90-day monitoring alert on key communities (Reddit, GitHub, HN)",
      "Re-evaluate if 3+ new high-signal posts appear in next 30 days",
      "Do not invest engineering time — signal too weak for ROI",
    ];
  }

  // REJECT
  return [
    "Do not pursue — insufficient market or evidence",
    "Document rejection reasons in opportunity database for future reference",
    "Revisit in 12 months if market conditions change",
  ];
}

function buildFitNotes(category: string, teamSize: number): string {
  const techHeavy = ["developer-tools", "devops", "cloud", "cybersecurity", "ai"];
  const domainHeavy = ["healthcare-tech", "legal-tech", "finance", "construction-tech"];

  if (techHeavy.includes(category)) {
    return `${category} opportunity requires strong engineering team (${teamSize} engineers). Ideal founder: technical co-founder with domain experience.`;
  }
  if (domainHeavy.includes(category)) {
    return `${category} requires domain expertise — regulatory and industry knowledge is a competitive moat. Ideal founder has 3+ years in sector.`;
  }
  return `${category} — balanced founder profile: product sense + technical judgment. ${teamSize}-person team sufficient for MVP.`;
}

function buildSummary(
  verdict: BlueprintVerdict,
  intel: BlueprintContext["intelligence"],
  roi: ROIAnalysis,
  breakeven: BreakevenAnalysis,
): string {
  const conf = Math.round(intel.overallConfidence * 100);
  const marketTier = intel.marketSizeEstimate.tier;
  const y3arr = `$${(roi.year3ARR / 1_000_000).toFixed(1)}M`;

  if (verdict === "BUILD_NOW") {
    return `Strong signal in ${marketTier} ${intel.category} market (${conf}% confidence). Projected Y3 ARR: ${y3arr}. Break-even at ${breakeven.customersNeeded} customers in ~${breakeven.monthsToBreakeven} months. BUILD NOW.`;
  }
  if (verdict === "BUILD_LATER") {
    return `Good opportunity in ${marketTier} ${intel.category} market but confidence at ${conf}% needs strengthening. Validate WTP first, then build in 30-60 days.`;
  }
  if (verdict === "RESEARCH_MORE") {
    return `${conf}% confidence insufficient to commit. ${intel.category} has potential (${marketTier} market, ${y3arr} Y3 ARR possible) but key unknowns remain. Research first.`;
  }
  if (verdict === "MONITOR") {
    return `Signal too weak at ${conf}% confidence. ${intel.category} market exists (${marketTier}) but no clear tipping point yet. Monitor 90 days.`;
  }
  return `Opportunity rejected. ${intel.category} signal at ${conf}% — insufficient evidence, market, or feasibility to justify build.`;
}
