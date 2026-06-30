import type { CourtContext, DevilsAdvocateResult, DevilsAdvocateRejectionReason } from "./types.js";

// ---------------------------------------------------------------------------
// Devil's Advocate
// Attempts to reject every opportunity on first principles.
// Returns whether the opportunity survived and why.
// ---------------------------------------------------------------------------

interface RejectionCheck {
  reason: DevilsAdvocateRejectionReason;
  test: (ctx: CourtContext) => boolean;
  message: string;
}

const REJECTION_CHECKS: RejectionCheck[] = [
  {
    reason: "market-too-small",
    test: (ctx) => ctx.intelligence.marketSizeEstimate.tier === "tiny" || ctx.intelligence.marketSizeEstimate.tier === "small",
    message: "Market is tiny/small — can't build a scalable business here.",
  },
  {
    reason: "weak-demand",
    test: (ctx) => !ctx.intelligence.checks.isPainRepeated && ctx.intelligence.opportunityGapScore.score < 0.4,
    message: "Pain not repeated across users — isolated complaint, not market signal.",
  },
  {
    reason: "existing-solution-dominates",
    test: (ctx) => ctx.intelligence.existingSolutionScore.score < 0.3,
    message: "Existing solutions are adequate — users have no strong reason to switch.",
  },
  {
    reason: "low-willingness-to-pay",
    test: (ctx) => !ctx.intelligence.checks.arePeopleAlreadyPaying && ctx.intelligence.humanTimeSavedScore.annualisedValueUSD < 2000,
    message: "No budget signal and low economic value saved — price discovery will fail.",
  },
  {
    reason: "temporary-trend",
    test: (ctx) => ctx.intelligence.freshnessScore.oldestEvidenceDays > 365 && !ctx.intelligence.checks.isOpportunityGrowing,
    message: "Evidence is old and market not growing — may be a passing trend already peaking.",
  },
  {
    reason: "high-legal-risk",
    test: (ctx) => ctx.intelligence.technicalFeasibilityScore.legalRiskLevel === "high",
    message: "High legal risk — compliance will consume early runway and block revenue.",
  },
  {
    reason: "high-technical-complexity",
    test: (ctx) => ctx.intelligence.technicalFeasibilityScore.score < 0.35,
    message: "Technical complexity too high — small team can't deliver MVP in reasonable timeframe.",
  },
  {
    reason: "easy-to-copy",
    test: (ctx) =>
      ctx.intelligence.technicalFeasibilityScore.score >= 0.85 &&
      ctx.intelligence.marketSizeEstimate.score >= 0.7 &&
      ctx.intelligence.existingSolutionScore.score < 0.5,
    message: "Easy to build in large market — incumbents will copy within months, no moat.",
  },
  {
    reason: "low-confidence",
    test: (ctx) => ctx.intelligence.overallConfidence < 0.35,
    message: `Overall intelligence confidence too low — insufficient evidence to make a decision.`,
  },
];

export function runDevilsAdvocate(ctx: CourtContext): DevilsAdvocateResult {
  const { intelligence: intel } = ctx;
  const rejectionAttempts: DevilsAdvocateRejectionReason[] = [];
  const failedReasons: string[] = [];

  for (const check of REJECTION_CHECKS) {
    if (check.test(ctx)) {
      rejectionAttempts.push(check.reason);
      failedReasons.push(check.message);
    }
  }

  const survived = rejectionAttempts.length === 0;

  // Find weakest and strongest points
  const weakestPoint = pickWeakestPoint(intel);
  const strongestPoint = pickStrongestPoint(intel);

  const rebuttal = survived
    ? `Opportunity survived all ${REJECTION_CHECKS.length} rejection tests. Strongest asset: ${strongestPoint}`
    : `Failed ${rejectionAttempts.length} test(s): ${failedReasons[0] ?? "unknown"}. Weakest point: ${weakestPoint}`;

  return { rejectionAttempts, survived, rebuttal, weakestPoint, strongestPoint };
}

function pickWeakestPoint(intel: CourtContext["intelligence"]): string {
  const scores: Array<{ label: string; score: number }> = [
    { label: `market size (${intel.marketSizeEstimate.tier})`, score: intel.marketSizeEstimate.score },
    { label: "existing solution gap", score: intel.existingSolutionScore.score },
    { label: "technical feasibility", score: intel.technicalFeasibilityScore.score },
    { label: "AI readiness", score: intel.aiReadinessScore.score },
    { label: "overall confidence", score: intel.overallConfidence },
  ];
  const weakest = scores.reduce((min, s) => (s.score < min.score ? s : min));
  return `${weakest.label} (score ${weakest.score.toFixed(2)})`;
}

function pickStrongestPoint(intel: CourtContext["intelligence"]): string {
  const scores: Array<{ label: string; score: number }> = [
    { label: `market size (${intel.marketSizeEstimate.tier}, $${intel.marketSizeEstimate.estimatedTAMBillions}B)`, score: intel.marketSizeEstimate.score },
    { label: "existing solution gap", score: intel.existingSolutionScore.score },
    { label: "technical feasibility", score: intel.technicalFeasibilityScore.score },
    { label: "opportunity gap", score: intel.opportunityGapScore.score },
    { label: "overall confidence", score: intel.overallConfidence },
  ];
  const strongest = scores.reduce((max, s) => (s.score > max.score ? s : max));
  return `${strongest.label} (score ${strongest.score.toFixed(2)})`;
}
