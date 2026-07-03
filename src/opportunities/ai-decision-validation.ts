import type { ProblemCluster } from "../problems/types.js";
import type {
  AiConfidenceReview,
  AiCounterEvidenceClaim,
  AiDecisionExplainability,
  AiDecisionReasoning,
  AiDecisionValidation,
  AiFounderOpportunityProfile,
  AiFounderRisk,
  AiFounderRiskName,
  AiMonetizationReasoning,
  AiSelfReview,
  AiSelfReviewCheck,
  AiValidationResult,
  BuildDifficultyResult,
  BuyingIntentResult,
  CompetitionResult,
  EnterpriseVsSmb,
  FinalFounderRecommendation,
  FoisBreakdown,
  FounderDecision,
  FounderDecisionVerdict,
  FounderIntelligence,
  FounderIntelligenceRisk,
  FounderOpportunityReport,
  FounderPricingModel,
  MonetizationSupportLabel,
  OpportunityCalibration,
  PricingConfidence,
  PricingSignal,
} from "./types.js";

/**
 * Loop 8 — AI Decision Validation layer.
 *
 * This module is an ADVERSARIAL REVIEW / explainability layer over the
 * already-computed `decision` (decision.ts), `founderIntelligence`
 * (founder-intelligence.ts), `fois` (fois.ts), and `calibration`
 * (calibration.ts) fields on a `FounderOpportunityReport` — all read-only
 * inputs here. No LLM call, no re-scan of raw evidence items, no
 * re-derivation of clustering/FOIS/decision/calibration/founderIntelligence.
 * Every claim/reason/explanation cites a real, already-computed number or
 * fact; nothing is fabricated. Where a fact genuinely isn't available in
 * already-computed data (e.g. a dollar figure with no supporting pricing
 * evidence), this module returns the literal string "NOT VERIFIED" rather
 * than inventing one (see Module 10 / possiblePricingFor).
 *
 * The whole point of this layer (per the mission) is to be capable of
 * pushing back against an upstream BUILD verdict with real counter-evidence
 * — never to rubber-stamp it. The override mechanism (Module 3) is
 * deliberately ASYMMETRIC: it can only ever downgrade BUILD -> WATCH, never
 * upgrade a verdict and never downgrade WATCH -> IGNORE. This mirrors this
 * codebase's existing "quality gate" philosophy (decision.ts Part G,
 * fois.ts's penalties) of only ever making a founder MORE cautious from a
 * read-only diagnostic layer, never more bullish.
 */

/* ======================================================================= */
/* Shared helpers                                                          */
/* ======================================================================= */

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function dominantSourceOf(sourceBreakdown: Record<string, number>): { sourceId: string; count: number } {
  let bestId = "unknown";
  let bestCount = -1;
  for (const [sourceId, count] of Object.entries(sourceBreakdown)) {
    if (count > bestCount) {
      bestId = sourceId;
      bestCount = count;
    }
  }
  return { sourceId: bestId, count: Math.max(0, bestCount) };
}

/**
 * cluster.frequency.growth.label -> painTemporaryOrRecurring mapping
 * (documented exactly, per the Module 1 spec):
 *   rising | stable        -> "recurring" (the pain keeps showing up)
 *   declining               -> "temporary" (the conversation is fading)
 *   insufficient-data       -> "unknown"   (never guessed)
 */
function painTemporaryOrRecurringFor(growthLabel: ProblemCluster["frequency"]["growth"]["label"]): "temporary" | "recurring" | "unknown" {
  if (growthLabel === "rising" || growthLabel === "stable") return "recurring";
  if (growthLabel === "declining") return "temporary";
  return "unknown";
}

/* ======================================================================= */
/* Module 1 — Decision Reasoning                                           */
/* ======================================================================= */

function buildDecisionReasoning(params: {
  cluster: ProblemCluster;
  decision: FounderDecision;
  fois: FoisBreakdown;
  calibration: OpportunityCalibration;
  founderIntelligence: FounderIntelligence;
}): AiDecisionReasoning {
  const { cluster, decision, fois, calibration, founderIntelligence } = params;

  const actualBusinessProblem = cluster.rootCause
    ? `${cluster.normalizedStatement} (root cause: "${cluster.rootCause}").`
    : `${cluster.normalizedStatement} (no specific root cause was identified for this cluster — cluster.rootCause is absent, not guessed).`;

  const whyExists = cluster.causeChain
    ? `Business cause: ${cluster.causeChain.businessCause} Technical cause: ${cluster.causeChain.technicalCause}`
    : "No root-cause chain was computed for this cluster (cluster.causeChain is absent — no dominant concept matched any item), so a business/technical cause cannot be cited without inventing one.";

  const whyCurrentSolutionsFailing =
    founderIntelligence.marketGaps.length > 0
      ? `Evidence-backed gap(s) in existing solutions: ${founderIntelligence.marketGaps
          .map((gap) => `${gap.gap} (${gap.evidenceCount} evidence item(s), confidence=${gap.confidence})`)
          .join("; ")}.`
      : "No specific solution-failure evidence collected beyond the base complaint";

  const evidenceSupporting: string[] = [
    decision.reasoning.whyThisMatters,
    decision.reasoning.whyNow,
    decision.reasoning.whoExperiences,
    decision.reasoning.whatEvidence,
    decision.reasoning.whyFoundersPay,
    decision.reasoning.biggestUncertainty,
    decision.reasoning.biggestImplementationRisk,
  ];

  const evidenceWeakening: string[] = [
    ...decision.qualityGates.filter((gate) => gate.fired).map((gate) => `Quality gate "${gate.name}" fired: ${gate.reason}`),
    ...fois.weaknesses,
    ...calibration.diagnostics.filter((d) => d.fired).map((d) => `Diagnostic "${d.flag}" fired: ${d.reason}`),
  ];

  const painTemporaryOrRecurring = painTemporaryOrRecurringFor(cluster.frequency.growth.label);

  return { actualBusinessProblem, whyExists, whyCurrentSolutionsFailing, evidenceSupporting, evidenceWeakening, painTemporaryOrRecurring };
}

/* ======================================================================= */
/* Module 2 — Counter-Evidence Engine (always 5 claims, fired or not)      */
/* ======================================================================= */

/**
 * Documented floor, mirroring calibration.ts's own "Weak Evidence"
 * diagnostic threshold (evidenceCount < 3) — a deliberate, documented
 * duplicate (same reasoning as calibration.ts's FOIS_BUILD_THRESHOLD_MIRROR:
 * calibration.ts is a READ-ONLY input here, so if its threshold ever
 * changes, this mirror must be updated in lockstep).
 */
const COUNTER_EVIDENCE_LOW_EVIDENCE_FLOOR = 3;

function buildCounterEvidence(params: {
  cluster: ProblemCluster;
  decision: FounderDecision;
  calibration: OpportunityCalibration;
  founderIntelligence: FounderIntelligence;
  painTemporaryOrRecurring: "temporary" | "recurring" | "unknown";
}): AiCounterEvidenceClaim[] {
  const { cluster, decision, calibration, founderIntelligence, painTemporaryOrRecurring } = params;
  const claims: AiCounterEvidenceClaim[] = [];

  const lowEvidence = decision.evidence.evidenceCount < COUNTER_EVIDENCE_LOW_EVIDENCE_FLOOR;
  const exaggeratedFired = lowEvidence || calibration.falsePositive.likely;
  claims.push({
    claim: "problem is exaggerated",
    fired: exaggeratedFired,
    reason: `decision.evidence.evidenceCount=${decision.evidence.evidenceCount} ${lowEvidence ? "<" : ">="} ${COUNTER_EVIDENCE_LOW_EVIDENCE_FLOOR} (documented floor) OR calibration.falsePositive.likely=${calibration.falsePositive.likely} -> ${
      exaggeratedFired ? "thin and/or likely-false-positive evidence — the pain may be exaggerated" : "evidence volume is adequate and the false-positive check is clear"
    }.`,
  });

  const saturatedMaturity =
    founderIntelligence.marketMaturity.maturity === "saturated" || founderIntelligence.marketMaturity.maturity === "crowded";
  claims.push({
    claim: "market already saturated",
    fired: saturatedMaturity,
    reason: `founderIntelligence.marketMaturity.maturity="${founderIntelligence.marketMaturity.maturity}" -> ${
      saturatedMaturity ? "saturated/crowded market — a new entrant faces real headwinds" : "not saturated/crowded"
    }.`,
  });

  const manualWorkaround = cluster.rootCause === "Manual Process";
  claims.push({
    claim: "users solved it manually",
    fired: manualWorkaround,
    reason: `cluster.rootCause=${cluster.rootCause ? `"${cluster.rootCause}"` : "undefined"} -> ${
      manualWorkaround
        ? 'users already have a workaround ("Manual Process" root cause) — the pain is survivable, not necessarily unsolved'
        : 'root cause is not "Manual Process"'
    }.`,
  });

  const strongCompetition =
    founderIntelligence.competitionPressure.pressure === "high" || founderIntelligence.competitionPressure.pressure === "very-high";
  claims.push({
    claim: "competitors already dominate",
    fired: strongCompetition,
    reason: `founderIntelligence.competitionPressure.pressure="${founderIntelligence.competitionPressure.pressure}" -> ${
      strongCompetition ? "high/very-high competitive pressure already present" : "competitive pressure is not high"
    }.`,
  });

  const temporaryDemand = painTemporaryOrRecurring === "temporary";
  claims.push({
    claim: "demand may be temporary",
    fired: temporaryDemand,
    reason: `Module 1's painTemporaryOrRecurring="${painTemporaryOrRecurring}" (derived from cluster.frequency.growth.label="${cluster.frequency.growth.label}") -> ${
      temporaryDemand ? "declining mention volume suggests the window may already be closing" : "not flagged as temporary"
    }.`,
  });

  return claims;
}

/* ======================================================================= */
/* Module 3 — BUILD/WATCH/IGNORE Validation                                */
/* ======================================================================= */

/**
 * Named, documented threshold: a BUILD verdict is only ever downgraded to
 * WATCH when at least this many Module 2 counter-evidence claims fired.
 * Rare and loud by design (a founder shouldn't have a promising verdict
 * second-guessed by one adversarial signal alone).
 */
const COUNTER_EVIDENCE_DOWNGRADE_THRESHOLD = 2;
/** Points deducted from a 0-1 normalized confidence view per fired counter-evidence claim. */
const CONFIDENCE_ADJUSTMENT_PER_FIRED_CLAIM = -0.1;
/** Floor on the total adjustment even if all 5 claims fire (5 * -0.1). */
const CONFIDENCE_ADJUSTMENT_FLOOR = -0.5;

function computeValidation(decisionVerdict: FounderDecisionVerdict, counterEvidence: AiCounterEvidenceClaim[]): AiValidationResult {
  const firedClaims = counterEvidence.filter((c) => c.fired);
  const firedCount = firedClaims.length;
  // "+ 0" normalizes the firedCount===0 case (0 * -0.1 === -0 in JS) to a
  // clean positive zero, so downstream `=== 0` / `toBe(0)` checks behave as
  // expected rather than tripping on IEEE754's signed-zero distinction.
  const confidenceAdjustment = Math.max(CONFIDENCE_ADJUSTMENT_FLOOR, firedCount * CONFIDENCE_ADJUSTMENT_PER_FIRED_CLAIM) + 0;

  let validatedRecommendation: FounderDecisionVerdict = decisionVerdict;
  let validationReason: string;

  // Asymmetric override: BUILD -> WATCH only. Never upgrades anything, and
  // never downgrades an existing WATCH to IGNORE (see module doc).
  if (decisionVerdict === "BUILD" && firedCount >= COUNTER_EVIDENCE_DOWNGRADE_THRESHOLD) {
    validatedRecommendation = "WATCH";
    validationReason = `Override: downgraded BUILD -> WATCH because ${firedCount}/5 counter-evidence claims fired (>= threshold ${COUNTER_EVIDENCE_DOWNGRADE_THRESHOLD}): ${firedClaims
      .map((c) => `"${c.claim}" (${c.reason})`)
      .join("; ")}. This engine only ever makes founders MORE cautious (asymmetric) — it never upgrades a verdict and never downgrades WATCH -> IGNORE.`;
  } else {
    validationReason = `No override: ${firedCount}/5 counter-evidence claims fired, below the threshold of ${COUNTER_EVIDENCE_DOWNGRADE_THRESHOLD}. validatedRecommendation mirrors decision.recommendation.verdict="${decisionVerdict}" exactly.`;
  }

  return { validatedRecommendation, validationReason, confidenceAdjustment };
}

/* ======================================================================= */
/* Module 4 — Founder Risk Engine (always all 8 present)                   */
/* ======================================================================= */

/** Fixed, documented severity->0-100-score mapping, reused for both the 5 reused founderIntelligence.risks entries and the 3 freshly-computed ones, so every AiFounderRisk.score is on the same scale. */
const RISK_SEVERITY_SCORE: Record<FounderIntelligenceRisk["severity"], number> = { low: 20, medium: 55, high: 85 };

function reuseFounderIntelligenceRisk(
  name: AiFounderRiskName,
  sourceRiskName: FounderIntelligenceRisk["risk"],
  founderIntelligenceRisks: FounderIntelligenceRisk[],
): AiFounderRisk {
  const sourceRisk = founderIntelligenceRisks.find((r) => r.risk === sourceRiskName);
  if (!sourceRisk) {
    // Should not happen — founderIntelligence.risks always has all 8 named
    // entries (Loop 7 invariant, asserted in founder-intelligence.test.ts).
    // Fail safe with an honest "unable to find" score rather than inventing
    // one.
    return {
      risk: name,
      score: 0,
      reason: `No matching founderIntelligence.risks entry named "${sourceRiskName}" was found (unexpected) — score defaults to 0 rather than being invented.`,
      supportingEvidence: [],
    };
  }
  return {
    risk: name,
    score: RISK_SEVERITY_SCORE[sourceRisk.severity],
    reason: `Reused from founderIntelligence.risks ("${sourceRisk.risk}", severity="${sourceRisk.severity}"): ${sourceRisk.explanation}`,
    supportingEvidence: [`founderIntelligence.risks["${sourceRisk.risk}"].severity="${sourceRisk.severity}"`],
  };
}

/** <= this many unique sources -> "high" distribution risk; <= this+1 -> "medium". */
const DISTRIBUTION_RISK_HIGH_MAX_SOURCES = 1;
const DISTRIBUTION_RISK_MEDIUM_MAX_SOURCES = 2;

function distributionRiskFor(uniqueSources: number): AiFounderRisk {
  const severity: FounderIntelligenceRisk["severity"] =
    uniqueSources <= DISTRIBUTION_RISK_HIGH_MAX_SOURCES ? "high" : uniqueSources <= DISTRIBUTION_RISK_MEDIUM_MAX_SOURCES ? "medium" : "low";
  return {
    risk: "Distribution Risk",
    score: RISK_SEVERITY_SCORE[severity],
    reason: `decision.evidence.uniqueSources=${uniqueSources} -> ${severity} distribution/discovery risk (few sources found this problem, so reaching an audience beyond where it was found is unproven).`,
    supportingEvidence: [`uniqueSources=${uniqueSources}`],
  };
}

function monetizationRiskFor(pricingEvidence: PricingSignal | null): AiFounderRisk {
  const severity: FounderIntelligenceRisk["severity"] =
    pricingEvidence === null ? "high" : pricingEvidence.extractedPrices.length < 2 ? "medium" : "low";
  return {
    risk: "Monetization Risk",
    score: RISK_SEVERITY_SCORE[severity],
    reason:
      pricingEvidence === null
        ? "founderIntelligence.competitorIntelligence.pricingEvidence=null -> no comparable pricing data exists in evidence -> pricing must be validated independently before committing."
        : `founderIntelligence.competitorIntelligence.pricingEvidence has ${pricingEvidence.extractedPrices.length} price point(s) -> ${severity} monetization risk.`,
    supportingEvidence: pricingEvidence ? pricingEvidence.extractedPrices.map((p) => `$${p}`) : [],
  };
}

function timingRiskFor(painTemporaryOrRecurring: "temporary" | "recurring" | "unknown", trending: boolean | undefined): AiFounderRisk {
  const isTrending = trending === true;
  let severity: FounderIntelligenceRisk["severity"];
  let reason: string;
  if (painTemporaryOrRecurring === "temporary" && !isTrending) {
    severity = "high";
    reason = 'painTemporaryOrRecurring="temporary" AND cluster.trending is not true -> the window may already be closing (declining mention volume with no rising-trend signal to offset it).';
  } else if (painTemporaryOrRecurring === "unknown") {
    severity = "medium";
    reason = 'painTemporaryOrRecurring="unknown" (insufficient growth data) -> timing cannot be confirmed either way.';
  } else {
    severity = "low";
    reason = `painTemporaryOrRecurring="${painTemporaryOrRecurring}"${isTrending ? " AND cluster.trending=true" : ""} -> no evidence the window is closing.`;
  }
  return {
    risk: "Timing Risk",
    score: RISK_SEVERITY_SCORE[severity],
    reason,
    supportingEvidence: [`painTemporaryOrRecurring=${painTemporaryOrRecurring}`, `trending=${trending ?? "undefined"}`],
  };
}

function buildRisks(params: {
  founderIntelligence: FounderIntelligence;
  decision: FounderDecision;
  painTemporaryOrRecurring: "temporary" | "recurring" | "unknown";
  trending: boolean | undefined;
}): AiFounderRisk[] {
  const { founderIntelligence, decision, painTemporaryOrRecurring, trending } = params;
  const risks = founderIntelligence.risks;

  return [
    reuseFounderIntelligenceRisk("Market Risk", "Market Risk", risks),
    reuseFounderIntelligenceRisk("Competition Risk", "Competition Risk", risks),
    reuseFounderIntelligenceRisk("Execution Risk", "Execution Risk", risks),
    reuseFounderIntelligenceRisk("Technical Risk", "Technical Risk", risks),
    distributionRiskFor(decision.evidence.uniqueSources),
    monetizationRiskFor(founderIntelligence.competitorIntelligence.pricingEvidence),
    timingRiskFor(painTemporaryOrRecurring, trending),
    reuseFounderIntelligenceRisk("Platform Risk", "Platform Risk", risks),
  ];
}

/* ======================================================================= */
/* Module 5 — Founder Opportunity Engine                                   */
/* ======================================================================= */

/** Cap on `topMvpFeatures` — marketGaps is already sorted by evidenceCount desc (founder-intelligence.ts's detectMarketGaps). */
const TOP_MVP_FEATURE_CAP = 3;

function whoShouldNotBeTargetedFor(enterpriseVsSmb: EnterpriseVsSmb, bestCustomer: string): string {
  if (enterpriseVsSmb !== "enterprise") {
    return `Enterprise buyers requiring SSO/compliance/procurement — no evidence this segment was represented (competitorIntelligence.enterpriseVsSmb="${enterpriseVsSmb}"); targeting them risks a much longer sales cycle than the evidenced ICP ("${bestCustomer}").`;
  }
  return `Individual/hobbyist users seeking a free, low-commitment tool — evidence points to an enterprise-oriented segment (competitorIntelligence.enterpriseVsSmb="enterprise"), so a self-serve, price-sensitive audience is a mismatch for this opportunity's evidenced ICP ("${bestCustomer}").`;
}

function earlyAdopterProfileFor(dominantSourceId: string, dominantCount: number, evidenceCount: number): string {
  const share = evidenceCount === 0 ? 0 : dominantCount / evidenceCount;
  const source = dominantSourceId.toLowerCase();
  let profile: string;
  if (source.includes("github") || source.includes("stack")) {
    profile = "technical early adopters already filing issues/discussing this on developer-centric platforms";
  } else if (source.includes("reddit") || source.includes("hn") || source.includes("hackernews")) {
    profile = "community-engaged early adopters actively discussing this in public forums";
  } else if (dominantCount === 0) {
    profile = "no dominant evidence source was identified — the early-adopter profile cannot be narrowed beyond general early adopters";
  } else {
    profile = `early adopters concentrated on "${dominantSourceId}"`;
  }
  return `${profile} (dominant source "${dominantSourceId}" accounts for ${(share * 100).toFixed(0)}% of evidence).`;
}

/**
 * suggestedLaunchStrategy rule table (documented, first match wins):
 *   1. marketMaturity in {emerging, growing} AND soloFounderSuitability === "high"
 *        -> "Direct launch, early-adopter community-first"
 *   2. marketMaturity in {saturated, declining} AND soloFounderSuitability !== "high"
 *        -> "Requires a differentiated wedge before launch"
 *   3. else (any other combination) -> "Cautious phased launch" (validate with a
 *        small cohort first — the signal doesn't clearly support either extreme)
 */
function suggestedLaunchStrategyFor(
  soloFounderSuitability: FounderIntelligence["founderOpportunity"]["soloFounderSuitability"],
  marketMaturity: FounderIntelligence["marketMaturity"]["maturity"],
): string {
  const openMarket = marketMaturity === "emerging" || marketMaturity === "growing";
  const closedMarket = marketMaturity === "saturated" || marketMaturity === "declining";

  if (openMarket && soloFounderSuitability === "high") {
    return `Direct launch, early-adopter community-first — marketMaturity="${marketMaturity}" (not yet crowded) and soloFounderSuitability="high" (well-suited to a solo founder).`;
  }
  if (closedMarket && soloFounderSuitability !== "high") {
    return `Requires a differentiated wedge before launch — see counter-evidence (marketMaturity="${marketMaturity}" and soloFounderSuitability="${soloFounderSuitability}" make a head-on launch risky).`;
  }
  return `Cautious phased launch — marketMaturity="${marketMaturity}" and soloFounderSuitability="${soloFounderSuitability}" don't clearly support either a direct launch or a mandatory differentiation-first approach; validate with a small early-adopter cohort before a wider launch.`;
}

function buildFounderOpportunityProfile(params: {
  cluster: ProblemCluster;
  founderIntelligence: FounderIntelligence;
  buildDifficulty: BuildDifficultyResult;
}): AiFounderOpportunityProfile {
  const { cluster, founderIntelligence, buildDifficulty } = params;
  const { founderOpportunity, competitorIntelligence, marketGaps, marketMaturity } = founderIntelligence;

  const idealCustomerProfile = `${founderOpportunity.bestCustomer} — ${founderOpportunity.whyThisCustomer}`;
  const whoShouldNotBeTargeted = whoShouldNotBeTargetedFor(competitorIntelligence.enterpriseVsSmb, founderOpportunity.bestCustomer);

  const dominant = dominantSourceOf(cluster.evidence.sourceBreakdown);
  const earlyAdopterProfile = earlyAdopterProfileFor(dominant.sourceId, dominant.count, cluster.evidence.evidenceCount);

  const corePain = cluster.normalizedStatement;

  const topMvpFeatures = marketGaps
    .slice(0, TOP_MVP_FEATURE_CAP)
    .map((gap) => `${gap.gap} (${gap.evidenceCount} evidence item(s), confidence=${gap.confidence})`);

  // No dedicated "scope creep" signal exists in this codebase; the closest
  // real, already-computed signal for "features to avoid in an MVP" is
  // buildDifficulty's matched high-complexity keyword signals — reused
  // as-is, never invented. Empty when none matched (documented here, per
  // Module 10's "never invent" quality gate, rather than guessing a feature
  // to avoid).
  const featuresToAvoid = buildDifficulty.matchedSignals.length > 0 ? [...buildDifficulty.matchedSignals] : [];

  const suggestedLaunchStrategy = suggestedLaunchStrategyFor(founderOpportunity.soloFounderSuitability, marketMaturity.maturity);

  return { idealCustomerProfile, whoShouldNotBeTargeted, earlyAdopterProfile, corePain, topMvpFeatures, featuresToAvoid, suggestedLaunchStrategy };
}

/* ======================================================================= */
/* Module 6 — Monetization Reasoning                                       */
/* ======================================================================= */

/** Mirrors founder-intelligence.ts's private FREEMIUM_INTENT_THRESHOLD — the same reasoned default for "meaningful buying intent". founder-intelligence.ts is READ-ONLY here, so this is a deliberate, documented duplicate (same reasoning as calibration.ts's threshold mirrors). */
const SUBSCRIPTION_VIABILITY_INTENT_THRESHOLD = 0.5;

function possiblePricingFor(bestPricingModel: FounderPricingModel, pricingEvidence: PricingSignal | null): string {
  if (pricingEvidence && pricingEvidence.extractedPrices.length > 0) {
    return `Suggested model: "${bestPricingModel}". Comparable evidence-extracted price point(s): ${pricingEvidence.extractedPrices
      .map((p) => `$${p}`)
      .join(", ")} (${pricingEvidence.suggestedPriceText}).`;
  }
  return `Suggested model: "${bestPricingModel}". NOT VERIFIED — no comparable pricing evidence collected (no price point was found in evidence); no dollar figure is asserted for this opportunity.`;
}

function pricingConfidenceFor(
  pricingEvidence: PricingSignal | null,
  competitorConfidence: FounderIntelligence["competitorIntelligence"]["competitorConfidence"],
): PricingConfidence {
  if (!pricingEvidence || pricingEvidence.extractedPrices.length === 0) return "not-verified";
  if (competitorConfidence === "unknown") return "low";
  return competitorConfidence;
}

function pricingAssumptionsFor(pricingEvidence: PricingSignal | null, bestPricingModel: FounderPricingModel): string[] {
  const assumptions = [
    `Assumes the "${bestPricingModel}" model generalizes across the evidenced ICP; no A/B-tested willingness-to-pay data exists in this codebase.`,
  ];
  if (!pricingEvidence || pricingEvidence.extractedPrices.length === 0) {
    assumptions.push("No direct price point was mentioned in evidence — pricing must be validated independently before committing.");
  } else {
    assumptions.push(
      `Assumes the evidence-extracted price point(s) (${pricingEvidence.extractedPrices.map((p) => `$${p}`).join(", ")}) reflect market willingness-to-pay, not merely what a competitor currently charges.`,
    );
  }
  return assumptions;
}

function subscriptionViabilityFor(buyingIntent: BuyingIntentResult, pricingEvidence: PricingSignal | null): MonetizationSupportLabel {
  const hasSignal = buyingIntent.score > 0 || (pricingEvidence !== null && pricingEvidence.extractedPrices.length > 0);
  if (!hasSignal) return "not-verified";
  return buyingIntent.score >= SUBSCRIPTION_VIABILITY_INTENT_THRESHOLD ? "supported" : "unsupported";
}

function enterprisePotentialFor(enterpriseVsSmb: EnterpriseVsSmb): MonetizationSupportLabel {
  if (enterpriseVsSmb === "enterprise" || enterpriseVsSmb === "mixed") return "supported";
  if (enterpriseVsSmb === "smb") return "unsupported";
  return "not-verified"; // "unknown" — no real signal either way, never guessed
}

function buildMonetizationReasoning(params: {
  founderIntelligence: FounderIntelligence;
  buyingIntent: BuyingIntentResult;
}): AiMonetizationReasoning {
  const { founderIntelligence, buyingIntent } = params;
  const { founderOpportunity, competitorIntelligence } = founderIntelligence;
  const pricingEvidence = competitorIntelligence.pricingEvidence;

  return {
    possiblePricing: possiblePricingFor(founderOpportunity.bestPricingModel, pricingEvidence),
    pricingConfidence: pricingConfidenceFor(pricingEvidence, competitorIntelligence.competitorConfidence),
    pricingAssumptions: pricingAssumptionsFor(pricingEvidence, founderOpportunity.bestPricingModel),
    subscriptionViability: subscriptionViabilityFor(buyingIntent, pricingEvidence),
    enterprisePotential: enterprisePotentialFor(competitorIntelligence.enterpriseVsSmb),
  };
}

/* ======================================================================= */
/* Module 7 — AI Confidence Review                                         */
/* ======================================================================= */

function buildConfidenceReview(params: { decision: FounderDecision; confidenceAdjustment: number; firedClaims: AiCounterEvidenceClaim[] }): AiConfidenceReview {
  const { decision, confidenceAdjustment, firedClaims } = params;
  const originalScore = decision.confidence.score; // 0-100, copied read-only — never mutated

  const normalizedOriginal = clamp01(originalScore / 100);
  const adjustedScore = clamp01(normalizedOriginal + confidenceAdjustment);
  const adjustment = adjustedScore - normalizedOriginal;
  const verdict: AiConfidenceReview["verdict"] = confidenceAdjustment < 0 ? "reduced" : "justified";

  const reason =
    verdict === "reduced"
      ? `${firedClaims.length}/5 counter-evidence claim(s) fired (${firedClaims.map((c) => `"${c.claim}"`).join(", ")}); confidence reduced by ${Math.abs(adjustment).toFixed(2)} (from ${normalizedOriginal.toFixed(2)} to ${adjustedScore.toFixed(2)}).`
      : `0/5 counter-evidence claims fired, decision.confidence.score=${originalScore}/100 (band="${decision.confidence.band}") — confidence is not inflated, no reduction applied.`;

  return { originalScore, adjustedScore, adjustment, verdict, reason };
}

/* ======================================================================= */
/* Module 8 — Decision Explainability                                      */
/* ======================================================================= */

function buildExplainability(params: {
  decision: FounderDecision;
  fois: FoisBreakdown;
  counterEvidence: AiCounterEvidenceClaim[];
  validation: AiValidationResult;
}): AiDecisionExplainability {
  const { decision, fois, counterEvidence, validation } = params;
  const verdict = decision.recommendation.verdict;

  const whyBuild =
    verdict === "BUILD"
      ? `decision.recommendation.verdict="BUILD": ${decision.recommendation.justification}`
      : `decision.recommendation.verdict is "${verdict}", not BUILD. Primary opportunity if pursued: ${decision.recommendation.primaryOpportunity}`;

  const whyWait =
    verdict === "WATCH"
      ? `decision.recommendation.verdict="WATCH": ${decision.recommendation.justification}`
      : `decision.recommendation.verdict is "${verdict}", not WATCH.`;

  const whyIgnore =
    verdict === "IGNORE"
      ? `decision.recommendation.verdict="IGNORE": ${decision.recommendation.justification}`
      : `decision.recommendation.verdict is "${verdict}", not IGNORE.`;

  const evidenceThatMattersMost = fois.reasons[0] ?? decision.reasoning.whyThisMatters;
  const evidenceMissing = fois.weaknesses[0] ?? "No specific FOIS weakness was identified for this opportunity.";

  const firedClaims = counterEvidence.filter((c) => c.fired);
  const whatCouldChangeThis =
    firedClaims.length > 0
      ? `Resolving/disproving ${firedClaims.map((c) => `"${c.claim}"`).join(", ")} could move validatedRecommendation ("${validation.validatedRecommendation}") back toward decision.recommendation.verdict ("${verdict}").`
      : `No counter-evidence claim fired against this verdict; validatedRecommendation already mirrors decision.recommendation.verdict="${verdict}" with no override in effect.`;

  return { whyBuild, whyWait, whyIgnore, evidenceThatMattersMost, evidenceMissing, whatCouldChangeThis };
}

/* ======================================================================= */
/* Module 9 — Final Founder Recommendation                                 */
/* ======================================================================= */

function collectUnknowns(params: {
  decisionReasoning: AiDecisionReasoning;
  monetization: AiMonetizationReasoning;
  decision: FounderDecision;
  founderIntelligence: FounderIntelligence;
}): string[] {
  const { decisionReasoning, monetization, decision, founderIntelligence } = params;
  const unknowns: string[] = [];

  if (decisionReasoning.painTemporaryOrRecurring === "unknown") {
    unknowns.push('painTemporaryOrRecurring="unknown" — insufficient growth data (cluster.frequency.growth.label="insufficient-data").');
  }
  if (monetization.pricingConfidence === "not-verified") {
    unknowns.push(`pricingConfidence="not-verified": ${monetization.possiblePricing}`);
  }
  if (monetization.subscriptionViability === "not-verified") {
    unknowns.push('subscriptionViability="not-verified" — no buying-intent or pricing signal exists to confirm recurring willingness-to-pay.');
  }
  if (monetization.enterprisePotential === "not-verified") {
    unknowns.push(
      `enterprisePotential="not-verified" — founderIntelligence.competitorIntelligence.enterpriseVsSmb="${founderIntelligence.competitorIntelligence.enterpriseVsSmb}", no enterprise/SMB signal was found in evidence.`,
    );
  }
  if (decision.evidence.freshness === "unknown") {
    unknowns.push('Evidence freshness="unknown" — no item carries a publishedAt date.');
  }
  if (founderIntelligence.competitorIntelligence.competitorConfidence === "unknown") {
    unknowns.push('competitorConfidence="unknown" — no competitor was named in evidence.');
  }

  return unknowns;
}

function buildNextValidationSteps(params: {
  monetization: AiMonetizationReasoning;
  decision: FounderDecision;
  founderIntelligence: FounderIntelligence;
  validation: AiValidationResult;
}): string[] {
  const { monetization, decision, founderIntelligence, validation } = params;
  const steps: string[] = [];

  if (monetization.pricingConfidence === "not-verified") {
    steps.push("Run pricing survey / competitor price research — no comparable pricing evidence was collected.");
  }
  if (decision.evidence.evidenceCount < COUNTER_EVIDENCE_LOW_EVIDENCE_FLOOR) {
    steps.push(`Collect more evidence before committing — evidenceCount=${decision.evidence.evidenceCount} is below the low-evidence floor (${COUNTER_EVIDENCE_LOW_EVIDENCE_FLOOR}).`);
  }
  if (decision.evidence.echoChamber) {
    steps.push("Validate demand outside the dominant source — evidence is currently concentrated in a single source (echo-chamber risk).");
  }
  if (
    founderIntelligence.competitorIntelligence.competitorConfidence === "unknown" ||
    founderIntelligence.competitorIntelligence.competitorConfidence === "low"
  ) {
    steps.push(`Run deeper competitor research — competitorConfidence="${founderIntelligence.competitorIntelligence.competitorConfidence}".`);
  }
  if (validation.confidenceAdjustment < 0) {
    steps.push("Re-run this validation once more evidence resolves the fired counter-evidence claim(s) before committing further.");
  }
  if (steps.length === 0) {
    steps.push("No specific validation gap was identified by this engine's fixed rule set; proceed per decision.recommendation.justification.");
  }

  return steps;
}

function buildFinalRecommendation(params: {
  cluster: ProblemCluster;
  fois: FoisBreakdown;
  decision: FounderDecision;
  founderIntelligence: FounderIntelligence;
  decisionReasoning: AiDecisionReasoning;
  counterEvidence: AiCounterEvidenceClaim[];
  validation: AiValidationResult;
  risks: AiFounderRisk[];
  founderOpportunityProfile: AiFounderOpportunityProfile;
  monetization: AiMonetizationReasoning;
}): FinalFounderRecommendation {
  const { cluster, fois, decision, founderIntelligence, decisionReasoning, counterEvidence, validation, risks, founderOpportunityProfile, monetization } =
    params;

  const firedClaim = counterEvidence.find((c) => c.fired);
  const executiveSummary = `Category "${cluster.category}": fois.overall=${fois.overall}/100. validatedRecommendation="${validation.validatedRecommendation}" (${decision.evidence.evidenceCount} evidence item(s))${
    firedClaim ? `; top counter-evidence concern: "${firedClaim.claim}" (${firedClaim.reason})` : "; no counter-evidence claim fired"
  }.`;

  const evidenceSummary = `${decision.evidence.evidenceCount} evidence item(s) across ${decision.evidence.uniqueSources} unique source(s) and ${decision.evidence.uniqueAuthors} unique author(s); freshness="${decision.evidence.freshness}".`;

  const businessOpportunity = decisionReasoning.actualBusinessProblem;

  const unknowns = collectUnknowns({ decisionReasoning, monetization, decision, founderIntelligence });
  const nextValidationSteps = buildNextValidationSteps({ monetization, decision, founderIntelligence, validation });

  return {
    executiveSummary,
    recommendedAction: validation.validatedRecommendation,
    evidenceSummary,
    businessOpportunity,
    risks,
    recommendedMvp: founderOpportunityProfile.topMvpFeatures,
    suggestedPricingDirection: monetization.possiblePricing,
    goToMarketDirection: founderOpportunityProfile.suggestedLaunchStrategy,
    unknowns,
    nextValidationSteps,
  };
}

/* ======================================================================= */
/* Module 11 — Self Review (self-consistency / internal-contradiction check) */
/* ======================================================================= */

/**
 * Any risk score >= this counts as "high" for the self-review's
 * contradiction checks — mirrors `RISK_SEVERITY_SCORE.high` (85) exactly,
 * the same fixed severity->score table Module 4 already uses. Not a new
 * threshold, a documented reuse of an existing one.
 */
const SELF_REVIEW_HIGH_RISK_SCORE_FLOOR = RISK_SEVERITY_SCORE.high;
/** Named, documented threshold: >= this many high-scoring risks alongside a BUILD verdict is flagged as a contradiction. */
const SELF_REVIEW_HIGH_RISK_COUNT_THRESHOLD = 2;

/**
 * Module 11 — a fixed, documented set of self-consistency checks over
 * fields Modules 1-9 have ALREADY computed (no new data, no re-derivation).
 * Every check's `detail` cites the exact field values compared. This is a
 * READ-ONLY diagnostic: firing a check never mutates `validation`, `risks`,
 * `monetization`, `reviewedConfidence`, or `finalRecommendation` — it only
 * reports on them, mirroring calibration.ts's diagnostics/decision.ts's
 * quality-gates philosophy of always-present, fired-or-not transparency.
 */
function buildSelfReview(params: {
  validation: AiValidationResult;
  risks: AiFounderRisk[];
  monetization: AiMonetizationReasoning;
  finalRecommendation: FinalFounderRecommendation;
  reviewedConfidence: AiConfidenceReview;
}): AiSelfReview {
  const { validation, risks, monetization, finalRecommendation, reviewedConfidence } = params;
  const checks: AiSelfReviewCheck[] = [];

  // Check 1: validatedRecommendation="BUILD" while >= 2 risks score high.
  const highRisks = risks.filter((r) => r.score >= SELF_REVIEW_HIGH_RISK_SCORE_FLOOR);
  const buildWithHighRisks = validation.validatedRecommendation === "BUILD" && highRisks.length >= SELF_REVIEW_HIGH_RISK_COUNT_THRESHOLD;
  checks.push({
    check: "BUILD verdict vs high-scoring risks",
    consistent: !buildWithHighRisks,
    detail: `validation.validatedRecommendation="${validation.validatedRecommendation}" vs ${highRisks.length} risk(s) scoring >= ${SELF_REVIEW_HIGH_RISK_SCORE_FLOOR}/100 (${
      highRisks.map((r) => `${r.risk}=${r.score}`).join(", ") || "none"
    }) -> ${
      buildWithHighRisks
        ? `contradiction: a BUILD verdict alongside >= ${SELF_REVIEW_HIGH_RISK_COUNT_THRESHOLD} high-scoring risk(s) warrants a second look before committing.`
        : "no contradiction."
    }`,
  });

  // Check 2: monetization.subscriptionViability="supported" while monetization.pricingConfidence="not-verified".
  const subscriptionPricingContradiction = monetization.subscriptionViability === "supported" && monetization.pricingConfidence === "not-verified";
  checks.push({
    check: "monetization.subscriptionViability vs monetization.pricingConfidence",
    consistent: !subscriptionPricingContradiction,
    detail: `monetization.subscriptionViability="${monetization.subscriptionViability}" vs monetization.pricingConfidence="${monetization.pricingConfidence}" -> ${
      subscriptionPricingContradiction
        ? 'contradiction: subscription viability is "supported" but no pricing evidence exists to back a confidence rating.'
        : "no contradiction."
    }`,
  });

  // Check 3: validation was downgraded (confidenceAdjustment < 0) while finalRecommendation.recommendedAction is still the fully optimistic BUILD verdict.
  const reducedButStillBuild = validation.confidenceAdjustment < 0 && finalRecommendation.recommendedAction === "BUILD";
  checks.push({
    check: "validation.confidenceAdjustment vs finalRecommendation.recommendedAction",
    consistent: !reducedButStillBuild,
    detail: `validation.confidenceAdjustment=${validation.confidenceAdjustment.toFixed(2)} vs finalRecommendation.recommendedAction="${finalRecommendation.recommendedAction}" -> ${
      reducedButStillBuild
        ? "contradiction: confidence was reduced by fired counter-evidence, yet the recommended action remains the fully optimistic BUILD verdict."
        : "no contradiction."
    }`,
  });

  // Check 4: finalRecommendation.unknowns is non-empty while reviewedConfidence.verdict="justified" (no reduction applied).
  const unknownsButJustified = finalRecommendation.unknowns.length > 0 && reviewedConfidence.verdict === "justified";
  checks.push({
    check: "finalRecommendation.unknowns vs reviewedConfidence.verdict",
    consistent: !unknownsButJustified,
    detail: `finalRecommendation.unknowns has ${finalRecommendation.unknowns.length} item(s) vs reviewedConfidence.verdict="${reviewedConfidence.verdict}" -> ${
      unknownsButJustified
        ? "contradiction: real unverified/unknown signal(s) were surfaced, yet confidence was judged justified with no reduction."
        : "no contradiction."
    }`,
  });

  const internallyConsistent = checks.every((c) => c.consistent);
  return { checks, internallyConsistent };
}

/* ======================================================================= */
/* Entry point                                                             */
/* ======================================================================= */

export interface ComputeAiDecisionValidationInput {
  cluster: ProblemCluster;
  competition: CompetitionResult;
  buyingIntent: BuyingIntentResult;
  pricing: PricingSignal;
  buildDifficulty: BuildDifficultyResult;
  fois: FoisBreakdown;
  decision: FounderDecision;
  calibration: OpportunityCalibration;
  founderIntelligence: FounderIntelligence;
}

/**
 * Composes every AI Decision Validation part (Modules 1-9) from
 * already-computed inputs. Pure function — no side effects, no LLM call, no
 * re-derivation of clustering/FOIS/decision/calibration/founderIntelligence.
 * Called once per shipped opportunity from engine.ts's
 * `attachAiDecisionValidation`, AFTER `founderIntelligence` is already
 * computed and attached.
 */
export function computeAiDecisionValidation(input: ComputeAiDecisionValidationInput): AiDecisionValidation {
  const { cluster, buyingIntent, buildDifficulty, fois, decision, calibration, founderIntelligence } = input;

  const decisionReasoning = buildDecisionReasoning({ cluster, decision, fois, calibration, founderIntelligence });
  const counterEvidence = buildCounterEvidence({
    cluster,
    decision,
    calibration,
    founderIntelligence,
    painTemporaryOrRecurring: decisionReasoning.painTemporaryOrRecurring,
  });
  const validation = computeValidation(decision.recommendation.verdict, counterEvidence);
  const risks = buildRisks({
    founderIntelligence,
    decision,
    painTemporaryOrRecurring: decisionReasoning.painTemporaryOrRecurring,
    trending: cluster.trending,
  });
  const founderOpportunityProfile = buildFounderOpportunityProfile({ cluster, founderIntelligence, buildDifficulty });
  const monetization = buildMonetizationReasoning({ founderIntelligence, buyingIntent });
  const firedClaims = counterEvidence.filter((c) => c.fired);
  const reviewedConfidence = buildConfidenceReview({ decision, confidenceAdjustment: validation.confidenceAdjustment, firedClaims });
  const explainability = buildExplainability({ decision, fois, counterEvidence, validation });
  const finalRecommendation = buildFinalRecommendation({
    cluster,
    fois,
    decision,
    founderIntelligence,
    decisionReasoning,
    counterEvidence,
    validation,
    risks,
    founderOpportunityProfile,
    monetization,
  });
  const selfReview = buildSelfReview({ validation, risks, monetization, finalRecommendation, reviewedConfidence });

  return {
    decisionReasoning,
    counterEvidence,
    validation,
    risks,
    founderOpportunity: founderOpportunityProfile,
    monetization,
    reviewedConfidence,
    explainability,
    finalRecommendation,
    selfReview,
  };
}

/**
 * Trivial, type-valid placeholder mirroring calibration.ts's
 * `defaultCalibration()` / founder-intelligence.ts's
 * `defaultFounderIntelligence()` — set at report-construction time in
 * engine.ts's `buildOpportunityReport`, always overwritten by
 * `attachAiDecisionValidation` for every surviving report.
 */
export function defaultAiDecisionValidation(): AiDecisionValidation {
  return {
    decisionReasoning: {
      actualBusinessProblem: "Placeholder — overwritten by attachAiDecisionValidation.",
      whyExists: "Placeholder — overwritten by attachAiDecisionValidation.",
      whyCurrentSolutionsFailing: "Placeholder — overwritten by attachAiDecisionValidation.",
      evidenceSupporting: [],
      evidenceWeakening: [],
      painTemporaryOrRecurring: "unknown",
    },
    counterEvidence: [],
    validation: {
      validatedRecommendation: "IGNORE",
      validationReason: "Placeholder — overwritten by attachAiDecisionValidation.",
      confidenceAdjustment: 0,
    },
    risks: [],
    founderOpportunity: {
      idealCustomerProfile: "Placeholder — overwritten by attachAiDecisionValidation.",
      whoShouldNotBeTargeted: "Placeholder — overwritten by attachAiDecisionValidation.",
      earlyAdopterProfile: "Placeholder — overwritten by attachAiDecisionValidation.",
      corePain: "Placeholder — overwritten by attachAiDecisionValidation.",
      topMvpFeatures: [],
      featuresToAvoid: [],
      suggestedLaunchStrategy: "Placeholder — overwritten by attachAiDecisionValidation.",
    },
    monetization: {
      possiblePricing: "Placeholder — overwritten by attachAiDecisionValidation.",
      pricingConfidence: "not-verified",
      pricingAssumptions: [],
      subscriptionViability: "not-verified",
      enterprisePotential: "not-verified",
    },
    reviewedConfidence: {
      originalScore: 0,
      adjustedScore: 0,
      adjustment: 0,
      verdict: "justified",
      reason: "Placeholder — overwritten by attachAiDecisionValidation.",
    },
    explainability: {
      whyBuild: "Placeholder — overwritten by attachAiDecisionValidation.",
      whyWait: "Placeholder — overwritten by attachAiDecisionValidation.",
      whyIgnore: "Placeholder — overwritten by attachAiDecisionValidation.",
      evidenceThatMattersMost: "Placeholder — overwritten by attachAiDecisionValidation.",
      evidenceMissing: "Placeholder — overwritten by attachAiDecisionValidation.",
      whatCouldChangeThis: "Placeholder — overwritten by attachAiDecisionValidation.",
    },
    finalRecommendation: {
      executiveSummary: "Placeholder — overwritten by attachAiDecisionValidation.",
      recommendedAction: "IGNORE",
      evidenceSummary: "Placeholder — overwritten by attachAiDecisionValidation.",
      businessOpportunity: "Placeholder — overwritten by attachAiDecisionValidation.",
      risks: [],
      recommendedMvp: [],
      suggestedPricingDirection: "Placeholder — overwritten by attachAiDecisionValidation.",
      goToMarketDirection: "Placeholder — overwritten by attachAiDecisionValidation.",
      unknowns: [],
      nextValidationSteps: [],
    },
    selfReview: {
      checks: [],
      internallyConsistent: true,
    },
  };
}

/**
 * Attaches a real `aiDecisionValidation` bundle to every report in the
 * shipped list — mirrors founder-intelligence.ts's `attachFounderIntelligence`
 * pattern exactly (map, preserve order, never re-sort/re-score, O(1) cluster
 * lookup via a map built once). Called from engine.ts's `analyze` AFTER
 * `attachFounderIntelligence`, so every input this function reads
 * (`report.decision`, `report.founderIntelligence`, `report.fois`,
 * `report.calibration`, etc.) is the REAL, final value, never a placeholder.
 */
export function attachAiDecisionValidation(
  opportunities: FounderOpportunityReport[],
  clusters: ProblemCluster[],
): FounderOpportunityReport[] {
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster] as const));

  return opportunities.map((report) => {
    const cluster = clusterById.get(report.clusterId);
    if (!cluster) {
      // Should not happen (every shipped report's clusterId traces back to a
      // cluster in the same problemReport.clusters this run started from) —
      // fail safe with the existing placeholder rather than throwing, so a
      // future upstream change can't crash the whole pipeline over a
      // diagnostics-only layer (mirrors attachFounderIntelligence's guard).
      return report;
    }

    const aiDecisionValidation = computeAiDecisionValidation({
      cluster,
      competition: report.competition,
      buyingIntent: report.buyingIntent,
      pricing: report.suggestedPricing,
      buildDifficulty: report.buildDifficulty,
      fois: report.fois,
      decision: report.decision,
      calibration: report.calibration,
      founderIntelligence: report.founderIntelligence,
    });

    return { ...report, aiDecisionValidation };
  });
}
