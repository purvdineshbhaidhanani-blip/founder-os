import type { OpportunityGapScore, ScoringContext, ExistingSolutionScore, MarketSizeEstimate, AIReadinessScore } from "./types.js";

// ---------------------------------------------------------------------------
// Opportunity Gap Engine
// Synthesises all major dimensions into a single gap score.
// High gap = nobody has solved it well + big market + real pain + buying intent.
// ---------------------------------------------------------------------------

interface GapInputs {
  existingSolutionScore: ExistingSolutionScore;
  marketSizeEstimate: MarketSizeEstimate;
  aiReadinessScore: AIReadinessScore;
}

// Weights must sum to 1.0
const WEIGHTS = {
  existingSolutionFailure: 0.30,  // biggest driver: no adequate solution = maximum gap
  marketSize: 0.22,               // large market = worth solving
  painScore: 0.18,                // real pain = strong pull
  buyingIntent: 0.15,             // people paying = gap is monetisable
  aiReadiness: 0.10,              // AI-solvable = startup can win fast
  sourceCount: 0.05,              // cross-source validation = confidence in gap
};

// Buying intent: normalise signal count to 0–1 (saturates at 10 signals)
function normaliseBuyingIntent(signalCount: number): number {
  return Math.min(1, signalCount / 10);
}

// Source count: 3+ sources = full score
function normaliseSourceCount(count: number): number {
  return Math.min(1, count / 3);
}

// Recurring revenue keywords in evidence → bonus
const RECURRING_REVENUE_RE = /\b(subscription|monthly|annually|SaaS|recurring|renewal|per seat|per user|per month|enterprise (contract|agreement))\b/i;
const GROWTH_RE = /\b(growing|accelerating|trend(ing)?|increas(ing|ed)|expanding|more and more|wave of)\b/i;

export function scoreOpportunityGap(ctx: ScoringContext, inputs: GapInputs): OpportunityGapScore {
  const { opportunity, allText } = ctx;
  const { existingSolutionScore, marketSizeEstimate, aiReadinessScore } = inputs;

  const painConfidence = opportunity.painScore.confidence;

  const raw =
    existingSolutionScore.score * WEIGHTS.existingSolutionFailure +
    marketSizeEstimate.score * WEIGHTS.marketSize +
    painConfidence * WEIGHTS.painScore +
    normaliseBuyingIntent(opportunity.buyingIntentSignals) * WEIGHTS.buyingIntent +
    aiReadinessScore.score * WEIGHTS.aiReadiness +
    normaliseSourceCount(opportunity.sources.length) * WEIGHTS.sourceCount;

  // Recurring revenue bonus (+5%)
  const recurringBonus = RECURRING_REVENUE_RE.test(allText) ? 0.05 : 0;
  // Growing market bonus (+5%)
  const growthBonus = GROWTH_RE.test(allText) ? 0.05 : 0;

  const score = Math.max(0, Math.min(1, raw + recurringBonus + growthBonus));

  const rationale = buildRationale(
    score,
    existingSolutionScore.score,
    marketSizeEstimate.tier,
    opportunity.buyingIntentSignals,
  );

  return { score, rationale };
}

function buildRationale(
  score: number,
  solutionFailure: number,
  marketTier: string,
  buyingIntentCount: number,
): string {
  const parts: string[] = [];
  if (solutionFailure >= 0.6) parts.push("existing tools fail");
  if (marketTier === "massive" || marketTier === "large") parts.push(`${marketTier} market`);
  if (buyingIntentCount > 0) parts.push(`${buyingIntentCount} buying intent signal${buyingIntentCount > 1 ? "s" : ""}`);
  if (score >= 0.75) return `Strong gap: ${parts.join(", ")}`;
  if (score >= 0.5) return `Moderate gap: ${parts.join(", ")}`;
  return `Weak gap: ${parts.join(", ") || "insufficient differentiation"}`;
}
