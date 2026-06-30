import { nowIso } from "../../utils/id.js";
import type { Opportunity } from "../types.js";
import type {
  IntelligenceChecklist,
  OpportunityIntelligence,
  RejectionReason,
  ScoringContext,
} from "./types.js";
import { scoreNoise } from "./noise-engine.js";
import { scoreSourceTrust } from "./source-trust-engine.js";
import { scoreAuthorCredibility } from "./author-credibility-engine.js";
import { scoreFreshness } from "./freshness-engine.js";
import { scoreExistingSolution } from "./existing-solution-engine.js";
import { scoreMarketSize } from "./market-size-engine.js";
import { scoreHumanTimeSaved } from "./human-time-saved-engine.js";
import { scoreAIReadiness } from "./ai-readiness-engine.js";
import { scoreTechnicalFeasibility } from "./technical-feasibility-engine.js";
import { scoreOpportunityGap } from "./opportunity-gap-engine.js";

// ---------------------------------------------------------------------------
// Rejection thresholds
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  minNoiseScore: 0.35,
  minBuyingIntentForSingleSignal: 1,  // single-signal opportunities need buying intent
  minExistingSolutionScore: 0.20,     // below = already perfectly solved
  minFeasibilityScore: 0.25,
  minOverallConfidence: 0.20,
  minMarketScore: 0.35,               // tiny market → "small" tier minimum
  highLegalRisk: "high" as const,
};

// ---------------------------------------------------------------------------
// Overall confidence weights
// ---------------------------------------------------------------------------

const CONFIDENCE_WEIGHTS = {
  noiseScore: 0.10,
  sourceTrust: 0.12,
  authorCredibility: 0.08,
  freshness: 0.08,
  existingSolution: 0.15,
  marketSize: 0.14,
  humanTimeSaved: 0.08,
  aiReadiness: 0.10,
  technicalFeasibility: 0.10,
  opportunityGap: 0.05,
};

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

export function scoreOpportunity(opportunity: Opportunity): OpportunityIntelligence {
  const nowMs = Date.now();
  const allText = opportunity.evidence.map((e) => e.quote).join("\n");

  const ctx: ScoringContext = { opportunity, allText, nowMs };

  // Run all 10 engines
  const noiseScore = scoreNoise(ctx);
  const sourceTrustScore = scoreSourceTrust(ctx);
  const authorCredibilityScore = scoreAuthorCredibility(ctx);
  const freshnessScore = scoreFreshness(ctx);
  const existingSolutionScore = scoreExistingSolution(ctx);
  const marketSizeEstimate = scoreMarketSize(ctx);
  const humanTimeSavedScore = scoreHumanTimeSaved(ctx);
  const aiReadinessScore = scoreAIReadiness(ctx);
  const technicalFeasibilityScore = scoreTechnicalFeasibility(ctx);
  const opportunityGapScore = scoreOpportunityGap(ctx, {
    existingSolutionScore,
    marketSizeEstimate,
    aiReadinessScore,
  });

  // Blend overall confidence
  const overallConfidence = Math.min(
    1,
    noiseScore.score * CONFIDENCE_WEIGHTS.noiseScore +
    sourceTrustScore.score * CONFIDENCE_WEIGHTS.sourceTrust +
    authorCredibilityScore.score * CONFIDENCE_WEIGHTS.authorCredibility +
    freshnessScore.score * CONFIDENCE_WEIGHTS.freshness +
    existingSolutionScore.score * CONFIDENCE_WEIGHTS.existingSolution +
    marketSizeEstimate.score * CONFIDENCE_WEIGHTS.marketSize +
    humanTimeSavedScore.score * CONFIDENCE_WEIGHTS.humanTimeSaved +
    aiReadinessScore.score * CONFIDENCE_WEIGHTS.aiReadiness +
    technicalFeasibilityScore.score * CONFIDENCE_WEIGHTS.technicalFeasibility +
    opportunityGapScore.score * CONFIDENCE_WEIGHTS.opportunityGap,
  );

  // Build checklist
  const checks = buildChecklist(opportunity, {
    noiseScore: noiseScore.score,
    existingSolutionScore: existingSolutionScore.score,
    marketSizeScore: marketSizeEstimate.score,
    aiReadinessScore: aiReadinessScore.score,
    technicalFeasibilityScore: technicalFeasibilityScore.score,
    legalRiskLevel: technicalFeasibilityScore.legalRiskLevel,
    overallConfidence,
    allText,
  });

  // Apply rejection rules
  const { rejected, rejectionReasons } = evaluateRejection(opportunity, {
    noiseScore,
    existingSolutionScore,
    marketSizeEstimate,
    technicalFeasibilityScore,
    overallConfidence,
    allText,
  });

  return {
    opportunityId: opportunity.id,
    problem: opportunity.problemSummary,
    category: opportunity.category,
    sources: [...opportunity.sources],
    noiseScore,
    sourceTrustScore,
    authorCredibilityScore,
    freshnessScore,
    existingSolutionScore,
    marketSizeEstimate,
    humanTimeSavedScore,
    aiReadinessScore,
    technicalFeasibilityScore,
    opportunityGapScore,
    checks,
    rejected,
    rejectionReasons,
    overallConfidence,
    scoredAt: nowIso(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ChecklistInputs {
  noiseScore: number;
  existingSolutionScore: number;
  marketSizeScore: number;
  aiReadinessScore: number;
  technicalFeasibilityScore: number;
  legalRiskLevel: string;
  overallConfidence: number;
  allText: string;
}

const SOLUTION_LOOKING_RE = /\b(looking for|need(ing)? (a|an|something)|is there (a|an|any)|alternative|replace|recommendation|suggest)\b/i;
const PAYING_RE = /\b(would pay|gladly pay|paid|pricing|subscription|budget|we pay|cost us)\b/i;
const RECURRING_RE = /\b(subscription|monthly|annually|recurring|SaaS|per seat|enterprise (contract|plan))\b/i;
const GROWING_RE = /\b(growing|more and more|increasing|trend|accelerat|rising)\b/i;

function buildChecklist(opportunity: Opportunity, inputs: ChecklistInputs): IntelligenceChecklist {
  const { allText } = inputs;
  return {
    isRealProblem: opportunity.signalCount >= 1 && opportunity.evidence.length >= 1,
    isBusinessRelated: opportunity.category !== "other" || opportunity.painScore.businessImpact > 0.1,
    isPainRepeated: opportunity.signalCount >= 2 || opportunity.sources.length >= 2,
    arePeopleLookingForSolutions: SOLUTION_LOOKING_RE.test(allText) || opportunity.buyingIntentSignals > 0,
    arePeopleAlreadyPaying: PAYING_RE.test(allText) || opportunity.buyingIntentSignals >= 2,
    doExistingSolutionsFail: inputs.existingSolutionScore >= 0.4,
    isThereAMarket: inputs.marketSizeScore >= THRESHOLDS.minMarketScore,
    canAISolveIt: inputs.aiReadinessScore >= 0.5,
    isTechnicallyPossible: inputs.technicalFeasibilityScore >= THRESHOLDS.minFeasibilityScore,
    isLegallySafe: inputs.legalRiskLevel !== "high",
    canStartupBuildIt: inputs.technicalFeasibilityScore >= 0.5 && inputs.legalRiskLevel !== "high",
    hasRecurringRevenuePotential: RECURRING_RE.test(allText) || opportunity.buyingIntentSignals > 0,
    isOpportunityGrowing: GROWING_RE.test(allText),
    isConfidenceHighEnough: inputs.overallConfidence >= THRESHOLDS.minOverallConfidence,
  };
}

interface RejectionInputs {
  noiseScore: ReturnType<typeof scoreNoise>;
  existingSolutionScore: ReturnType<typeof scoreExistingSolution>;
  marketSizeEstimate: ReturnType<typeof scoreMarketSize>;
  technicalFeasibilityScore: ReturnType<typeof scoreTechnicalFeasibility>;
  overallConfidence: number;
  allText: string;
}

const ENTERTAINMENT_RE = /\b(entertainment only|movie|tv show|celebrity gossip|gaming|sports fan)\b/i;
const POLITICAL_RE = /\b(democrat|republican|election|political party|vote for)\b/i;
const CELEBRITY_RE = /\b(celebrity|kardashian|influencer drama|red carpet)\b/i;
const MEME_RE = /\b(meme|going viral|twitter drama|tiktok trend)\b/i;

function evaluateRejection(
  opportunity: Opportunity,
  inputs: RejectionInputs,
): { rejected: boolean; rejectionReasons: RejectionReason[] } {
  const reasons: RejectionReason[] = [];
  const { noiseScore, existingSolutionScore, marketSizeEstimate, technicalFeasibilityScore, overallConfidence, allText } = inputs;

  if (ENTERTAINMENT_RE.test(allText)) reasons.push("entertainment-only");
  if (MEME_RE.test(allText)) reasons.push("meme-or-viral");
  if (POLITICAL_RE.test(allText)) reasons.push("political-content");
  if (CELEBRITY_RE.test(allText)) reasons.push("celebrity-content");
  if (opportunity.evidence.length === 0) reasons.push("no-evidence");

  // No buying intent AND one-off complaint (single signal, no strong workarounds)
  if (
    opportunity.buyingIntentSignals === 0 &&
    opportunity.signalCount === 1 &&
    opportunity.workaroundsDetected.length === 0
  ) {
    reasons.push("one-off-complaint");
  }

  if (opportunity.buyingIntentSignals === 0 && opportunity.signalCount <= 1 && opportunity.evidence.length <= 1) {
    reasons.push("no-buying-intent");
  }

  if (existingSolutionScore.score < THRESHOLDS.minExistingSolutionScore) {
    reasons.push("already-perfectly-solved");
  }

  if (marketSizeEstimate.tier === "tiny") {
    reasons.push("tiny-market");
  }

  if (technicalFeasibilityScore.score < THRESHOLDS.minFeasibilityScore) {
    reasons.push("technically-impossible");
  }

  if (technicalFeasibilityScore.legalRiskLevel === "high") {
    reasons.push("high-legal-risk");
  }

  if (noiseScore.score < THRESHOLDS.minNoiseScore) {
    reasons.push("noise-dominated");
  }

  if (overallConfidence < THRESHOLDS.minOverallConfidence) {
    reasons.push("low-confidence");
  }

  return { rejected: reasons.length > 0, rejectionReasons: reasons };
}
