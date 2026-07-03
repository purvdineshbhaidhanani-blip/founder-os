import type { ProblemCategory, ProblemCluster } from "../problems/types.js";
import type {
  BuildDifficultyResult,
  BuildDifficultyTier,
  BuyingIntentResult,
  CompetitionPressureLabel,
  CompetitionPressureResult,
  CompetitionResult,
  CompetitorConfidence,
  CompetitorIntelligence,
  CompetitorMention,
  DifferentiationStrategy,
  EnterpriseVsSmb,
  FoisBreakdown,
  FounderDecision,
  FounderIntelligence,
  FounderIntelligenceRisk,
  FounderMvpComplexity,
  FounderOpportunityReport,
  FounderOpportunitySynthesis,
  FounderPricingModel,
  MarketGap,
  MarketMaturityLabel,
  MarketMaturityResult,
  OpenSourceVsSaas,
  OpportunityCalibration,
  PricingSignal,
  SoloFounderSuitability,
} from "./types.js";

/**
 * Loop 7 — Founder Intelligence layer.
 *
 * A pure COMPOSITION/inference layer over signals already computed
 * elsewhere in this codebase (src/problems/**, competition.ts, pricing.ts,
 * difficulty.ts, fois.ts, decision.ts, calibration.ts — all read-only from
 * here). No LLM call, no re-scan of raw evidence items beyond a single,
 * bounded pass over `cluster.evidence.representativeExamples` (already
 * selected upstream, max 3 items per cluster — see `evidenceTextBlobOf`),
 * no re-derivation of clustering/FOIS/decision/calibration. Every
 * threshold below is a fixed, documented, reasoned constant (no labeled
 * founder-outcome dataset exists to empirically tune against, matching
 * every other threshold in this codebase). Every returned object carries a
 * `reason`/`explanation`/`reasons` field citing real, already-computed
 * numbers — never a fabricated fact or generic platitude.
 */

/* ========================================================================= */
/* Shared helpers                                                            */
/* ========================================================================= */

/**
 * Built ONCE per opportunity and threaded through Parts A/F/G below — the
 * only "evidence text" available at this layer without re-scanning the
 * cluster's full raw-item set (which Part I of the mission forbids).
 * `cluster.evidence.representativeExamples` is already a bounded (top-3),
 * previously-computed subset (see src/problems/evidence.ts), so this is a
 * single pass over at most 3 items, not a new full scan.
 */
function evidenceTextBlobOf(cluster: ProblemCluster): string {
  return cluster.evidence.representativeExamples
    .map((item) => `${item.title} ${item.body ?? item.snippet ?? ""}`)
    .join(" ")
    .toLowerCase();
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

/* ========================================================================= */
/* Part C — Market Maturity (computed first: reused by Parts A and E)        */
/* ========================================================================= */

/** competitors.length <= this -> "growing" (paired with 0 competitors -> "emerging" below). */
const MATURITY_GROWING_MAX_COMPETITORS = 2;
/** competitors.length <= this (and > MATURITY_GROWING_MAX_COMPETITORS) -> "crowded". */
const MATURITY_CROWDED_MAX_COMPETITORS = 5;
/** competitors.length above MATURITY_CROWDED_MAX_COMPETITORS -> "saturated". */

/**
 * Deterministic rule table from competitor count + evidence volume +
 * `cluster.frequency.growth.label` (see types.ts's `MarketMaturityResult`).
 *
 * Rule table (first match wins):
 *   1. growth === "declining"          -> "declining" (OVERRIDES every count-based tier below —
 *                                          a shrinking conversation means a shrinking opportunity
 *                                          regardless of how many competitors are already present).
 *   2. competitors.length === 0        -> "emerging"
 *   3. competitors.length <= 2         -> "growing"
 *   4. competitors.length <= 5         -> "crowded"
 *   5. competitors.length >= 6         -> "saturated"
 * `growthLabel` values other than "declining" (rising/stable/insufficient-data)
 * do not further split a given competitor-count tier — the mission's own
 * examples ("0 + rising = emerging", "1-2 + rising/stable = growing") are
 * covered by rules 2/3 without needing growth to gate them, since growth
 * only ever removes a cluster from every count-based tier (via the
 * "declining" override), never adds a distinction within one. `growthLabel`
 * is still cited in `reasons` for transparency.
 */
export function estimateMarketMaturity(
  competition: CompetitionResult,
  evidenceCount: number,
  uniqueSources: number,
  growthLabel: string,
): MarketMaturityResult {
  const count = competition.competitors.length;
  const reasons: string[] = [
    `${count} named competitor(s) found in evidence.`,
    `evidenceCount=${evidenceCount} across uniqueSources=${uniqueSources}.`,
    `growth label: "${growthLabel}".`,
  ];

  if (growthLabel === "declining") {
    reasons.push(
      `growth="declining" overrides the competitor-count-based tier -> "declining" (a shrinking conversation means a shrinking market opportunity, regardless of competitor count).`,
    );
    return { maturity: "declining", reasons };
  }

  let maturity: MarketMaturityLabel;
  if (count === 0) {
    maturity = "emerging";
    reasons.push(`0 competitors (and growth != "declining") -> "emerging" (early, undercontested market).`);
  } else if (count <= MATURITY_GROWING_MAX_COMPETITORS) {
    maturity = "growing";
    reasons.push(`${count} competitor(s) (1-${MATURITY_GROWING_MAX_COMPETITORS}) -> "growing".`);
  } else if (count <= MATURITY_CROWDED_MAX_COMPETITORS) {
    maturity = "crowded";
    reasons.push(
      `${count} competitor(s) (${MATURITY_GROWING_MAX_COMPETITORS + 1}-${MATURITY_CROWDED_MAX_COMPETITORS}) -> "crowded".`,
    );
  } else {
    maturity = "saturated";
    reasons.push(`${count} competitor(s) (>= ${MATURITY_CROWDED_MAX_COMPETITORS + 1}) -> "saturated".`);
  }

  return { maturity, reasons };
}

/* ========================================================================= */
/* Part A — Competitor Intelligence                                          */
/* ========================================================================= */

/** Cap on `primaryCompetitors` — top-N by mentionCount (competitors[] already sorted desc). */
const PRIMARY_COMPETITOR_CAP = 3;
/** category-count threshold above which a category is "established" regardless of looking-for-alternative/migration status. */
const ESTABLISHED_CATEGORY_MIN_COMPETITORS = 3;

const OPEN_SOURCE_SIGNAL_PHRASES = ["open source", "open-source", "self-hosted", "selfhosted", "github.com/"];
const SAAS_SIGNAL_PHRASES = ["pricing page", "subscription", "free trial", "saas"];
const ENTERPRISE_SIGNAL_PHRASES = ["enterprise"];
const SMB_SIGNAL_PHRASES = ["smb", "small business"];
const SOLO_FOUNDER_SIGNAL_PHRASES = ["built by one person", "indie hacker", "side project"];
/** A single extracted price at/above this (USD) implies enterprise-tier pricing. */
const ENTERPRISE_PRICE_THRESHOLD = 500;

/** competitorConfidence tiers are driven by evidence VOLUME (total mentionCount across competitors), not `competitionScore` directly — `competitionScore = 1/(1+n)` is, by construction, INVERSELY related to competitor count, so a high score means FEW named competitors, not strong evidence about them. `competitionScore` is still cited in every branch's explanation for transparency, per the mission's explicit "count + competitionScore" instruction, but total mention volume is the actual driver. */
const CONFIDENCE_HIGH_MIN_COMPETITORS = 3;
const CONFIDENCE_HIGH_MIN_TOTAL_MENTIONS = 5;
const CONFIDENCE_MEDIUM_MIN_TOTAL_MENTIONS = 2;

function competitorCategoryFor(category: ProblemCategory, competitorCount: number): string {
  if (competitorCount === 0) return "no established competitors identified in evidence";
  if ((category === "looking-for-alternative" || category === "migration") && competitorCount >= 1) {
    return "established category with switching activity";
  }
  if (competitorCount >= ESTABLISHED_CATEGORY_MIN_COMPETITORS) return "established competitive category";
  return "emerging competitive category";
}

function classifyOpenSourceVsSaas(combinedBlob: string): OpenSourceVsSaas {
  const hasOpenSource = OPEN_SOURCE_SIGNAL_PHRASES.some((phrase) => combinedBlob.includes(phrase));
  const hasSaas = SAAS_SIGNAL_PHRASES.some((phrase) => combinedBlob.includes(phrase));
  if (hasOpenSource && hasSaas) return "mixed";
  if (hasOpenSource) return "open-source";
  if (hasSaas) return "saas";
  return "unknown";
}

function classifyEnterpriseVsSmb(combinedBlob: string, pricing: PricingSignal): EnterpriseVsSmb {
  const hasEnterprisePhrase = ENTERPRISE_SIGNAL_PHRASES.some((phrase) => combinedBlob.includes(phrase));
  const hasSmbPhrase = SMB_SIGNAL_PHRASES.some((phrase) => combinedBlob.includes(phrase));
  const hasEnterprisePrice = pricing.extractedPrices.some((price) => price >= ENTERPRISE_PRICE_THRESHOLD);
  const enterpriseSignal = hasEnterprisePhrase || hasEnterprisePrice;
  if (enterpriseSignal && hasSmbPhrase) return "mixed";
  if (enterpriseSignal) return "enterprise";
  if (hasSmbPhrase) return "smb";
  return "unknown";
}

function soloFounderFriendlyCompetitorsOf(competitors: CompetitorMention[]): string[] {
  const friendly: string[] = [];
  for (const competitor of competitors) {
    const text = `${competitor.name} ${competitor.evidenceUrls.join(" ")}`.toLowerCase();
    if (SOLO_FOUNDER_SIGNAL_PHRASES.some((phrase) => text.includes(phrase))) {
      friendly.push(competitor.name);
    }
  }
  return friendly;
}

function primaryCompetitorsOf(competitors: CompetitorMention[]): string[] {
  return competitors.slice(0, PRIMARY_COMPETITOR_CAP).map((competitor) => competitor.name);
}

function competitorEvidenceUrlsOf(competitors: CompetitorMention[]): string[] {
  const urls = new Set<string>();
  for (const competitor of competitors) {
    for (const url of competitor.evidenceUrls) urls.add(url);
  }
  return [...urls];
}

function pricingEvidenceFor(pricing: PricingSignal): PricingSignal | null {
  return pricing.extractedPrices.length > 0 ? pricing : null;
}

function competitorConfidenceFor(
  competitors: CompetitorMention[],
  competitionScore: number,
): { level: CompetitorConfidence; reason: string } {
  const totalMentions = competitors.reduce((sum, competitor) => sum + competitor.mentionCount, 0);
  if (competitors.length >= CONFIDENCE_HIGH_MIN_COMPETITORS && totalMentions >= CONFIDENCE_HIGH_MIN_TOTAL_MENTIONS) {
    return {
      level: "high",
      reason: `${competitors.length} distinct competitor(s) with ${totalMentions} total mention(s) (>= ${CONFIDENCE_HIGH_MIN_COMPETITORS} competitors and >= ${CONFIDENCE_HIGH_MIN_TOTAL_MENTIONS} mentions; competitionScore=${competitionScore.toFixed(2)}) -> high confidence in the extracted competitive landscape.`,
    };
  }
  if (totalMentions >= CONFIDENCE_MEDIUM_MIN_TOTAL_MENTIONS) {
    return {
      level: "medium",
      reason: `${competitors.length} competitor(s) with ${totalMentions} total mention(s) (competitionScore=${competitionScore.toFixed(2)}) -> medium confidence.`,
    };
  }
  return {
    level: "low",
    reason: `${competitors.length} competitor(s) with only ${totalMentions} total mention(s) (thin evidence; competitionScore=${competitionScore.toFixed(2)}) -> low confidence.`,
  };
}

function buildCompetitorIntelligence(params: {
  cluster: ProblemCluster;
  competition: CompetitionResult;
  pricing: PricingSignal;
  evidenceTextBlob: string;
  marketMaturity: MarketMaturityLabel;
}): CompetitorIntelligence {
  const { cluster, competition, pricing, evidenceTextBlob, marketMaturity } = params;
  const competitors = competition.competitors;

  if (competitors.length === 0) {
    return {
      primaryCompetitors: [],
      competitorCategory: competitorCategoryFor(cluster.category, 0),
      marketMaturity,
      openSourceVsSaas: "unknown",
      enterpriseVsSmb: "unknown",
      soloFounderFriendlyCompetitors: [],
      pricingEvidence: pricingEvidenceFor(pricing),
      competitorConfidence: "unknown",
      competitorEvidence: [],
      explanation:
        "No competitors were extracted from evidence (competition.competitors is empty) — this does not mean no competition exists, only that none was named in the collected discussions. No competitor name is invented here.",
    };
  }

  const competitorBlob = competitors
    .map((competitor) => `${competitor.name} ${competitor.evidenceUrls.join(" ")}`)
    .join(" ")
    .toLowerCase();
  const combinedBlob = `${competitorBlob} ${evidenceTextBlob}`;
  const { level: competitorConfidence, reason: confidenceReason } = competitorConfidenceFor(
    competitors,
    competition.competitionScore,
  );

  return {
    primaryCompetitors: primaryCompetitorsOf(competitors),
    competitorCategory: competitorCategoryFor(cluster.category, competitors.length),
    marketMaturity,
    openSourceVsSaas: classifyOpenSourceVsSaas(combinedBlob),
    enterpriseVsSmb: classifyEnterpriseVsSmb(combinedBlob, pricing),
    soloFounderFriendlyCompetitors: soloFounderFriendlyCompetitorsOf(competitors),
    pricingEvidence: pricingEvidenceFor(pricing),
    competitorConfidence,
    competitorEvidence: competitorEvidenceUrlsOf(competitors),
    explanation: `${competitors.length} competitor(s) found (top: ${competitors[0]!.name}, ${competitors[0]!.mentionCount} mention(s)). ${confidenceReason}`,
  };
}

/* ========================================================================= */
/* Part B — Market Gap Engine                                                */
/* ========================================================================= */

/**
 * Fixed concept-id -> gap lookup table (src/problems/concept.ts's
 * CONCEPT_GROUPS ids on the left). Simple, one-to-one lookup — not a new
 * text scan. Concept ids not listed here don't map cleanly to a founder-
 * actionable "gap a competitor could differentiate on" (e.g. pure
 * migration/switching-activity concepts like "seeking-alternative") and so
 * are intentionally left unmapped rather than force-fit.
 *
 * "Weak Documentation" has no dedicated concept id today — the closest
 * candidate, "api-undocumented-and-limited", bundles documentation, rate
 * limits, and breaking-API-changes complaints; its DOMINANT theme (API
 * adequacy broadly) was judged closer to "Missing API", so it is mapped
 * there instead. Documented limitation: "Weak Documentation" can currently
 * only ever appear via the category-level fallback below, never via a
 * concept-level match.
 */
const CONCEPT_ID_TO_GAP: Record<string, string> = {
  // -- Missing Features --
  "no-way-to-accomplish-task": "Missing Features",
  "product-lacks-capability": "Missing Features",
  "why-doesnt-this-exist": "Missing Features",
  "enterprise-readiness-gaps": "Missing Features",
  "customization-too-rigid": "Missing Features",
  "collaboration-and-sharing-gaps": "Missing Features",
  "analytics-and-reporting-gaps": "Missing Features",
  "scheduling-and-calendar-issues": "Missing Features",

  // -- Expensive Pricing --
  "automation-too-expensive": "Expensive Pricing",
  "price-increase-backlash": "Expensive Pricing",
  "hidden-fees-and-surprise-costs": "Expensive Pricing",

  // -- Complex UX --
  "clunky-many-steps": "Complex UX",
  "general-frustration": "Complex UX",
  "cluttered-inconsistent-ui": "Complex UX",
  "confusing-pricing-tiers": "Complex UX",
  "notifications-broken-or-overwhelming": "Complex UX",
  "search-doesnt-work": "Complex UX",

  // -- Missing AI --
  "ai-features-inaccurate": "Missing AI",

  // -- Poor Automation --
  "automation-feature-request": "Poor Automation",
  "recurring-manual-task-automation-request": "Poor Automation",

  // -- Poor Mobile Experience --
  "mobile-experience-gaps": "Poor Mobile Experience",

  // -- Slow Support --
  "support-slow-and-unresponsive": "Slow Support",
  "cant-cancel-or-unresponsive-billing-support": "Slow Support",

  // -- Weak Integrations --
  "missing-integration": "Weak Integrations",
  "cross-tool-context-switching": "Weak Integrations",
  "integration-broken": "Weak Integrations",
  "permissions-and-access-control-gaps": "Weak Integrations",

  // -- Missing API --
  "api-undocumented-and-limited": "Missing API",

  // -- Poor Onboarding --
  "poor-ux-hard-to-learn": "Poor Onboarding",

  // -- Manual Workflow --
  "time-consuming-manual-work": "Manual Workflow",
  "manual-workaround-built": "Manual Workflow",
};

/**
 * Category-level fallback, used ONLY when `cluster.conceptBreakdown` is
 * absent/empty (no concept-level match was possible for this cluster) — a
 * lower-confidence, coarser signal so a cluster with real category-level
 * evidence still surfaces at least one gap instead of none.
 */
const CATEGORY_GAP_FALLBACK: Partial<Record<ProblemCategory, string>> = {
  "pricing-complaint": "Expensive Pricing",
  "workflow-friction": "Manual Workflow",
  "missing-capability": "Missing Features",
};

const GAP_CONFIDENCE_HIGH_THRESHOLD = 5;
const GAP_CONFIDENCE_MEDIUM_THRESHOLD = 2;

function gapConfidenceFor(evidenceCount: number): "high" | "medium" | "low" {
  if (evidenceCount >= GAP_CONFIDENCE_HIGH_THRESHOLD) return "high";
  if (evidenceCount >= GAP_CONFIDENCE_MEDIUM_THRESHOLD) return "medium";
  return "low";
}

export function detectMarketGaps(cluster: ProblemCluster): MarketGap[] {
  const byGap = new Map<string, { evidenceCount: number; exampleConceptIds: Set<string> }>();
  const conceptBreakdown = cluster.conceptBreakdown ?? [];

  for (const entry of conceptBreakdown) {
    const gap = CONCEPT_ID_TO_GAP[entry.conceptId];
    if (!gap) continue;
    const existing = byGap.get(gap) ?? { evidenceCount: 0, exampleConceptIds: new Set<string>() };
    existing.evidenceCount += entry.count;
    existing.exampleConceptIds.add(entry.conceptId);
    byGap.set(gap, existing);
  }

  if (byGap.size === 0) {
    const fallbackGap = CATEGORY_GAP_FALLBACK[cluster.category];
    if (fallbackGap && cluster.evidence.evidenceCount > 0) {
      byGap.set(fallbackGap, { evidenceCount: cluster.evidence.evidenceCount, exampleConceptIds: new Set() });
    }
  }

  const gaps = [...byGap.entries()].map(([gap, data]) => ({
    gap: gap as MarketGap["gap"],
    evidenceCount: data.evidenceCount,
    exampleConceptIds: [...data.exampleConceptIds].sort(),
    confidence: gapConfidenceFor(data.evidenceCount),
  }));

  return gaps.sort((a, b) => b.evidenceCount - a.evidenceCount || a.gap.localeCompare(b.gap));
}

/* ========================================================================= */
/* Part E — Competition Pressure                                             */
/* ========================================================================= */

const PRESSURE_LEVELS: CompetitionPressureLabel[] = ["very-low", "low", "medium", "high", "very-high"];

/**
 * `competitionScore = 1/(1+n)` is INVERSELY related to competitor count, so
 * these boundaries run high-score-first: score>=0.8 roughly means 0
 * competitors, score in [0.5,0.8) means ~1 competitor, etc.
 */
const PRESSURE_VERY_LOW_MIN_SCORE = 0.8;
const PRESSURE_LOW_MIN_SCORE = 0.5;
const PRESSURE_MEDIUM_MIN_SCORE = 0.33;
const PRESSURE_HIGH_MIN_SCORE = 0.2;

function pressureTierFromScore(score: number): CompetitionPressureLabel {
  if (score >= PRESSURE_VERY_LOW_MIN_SCORE) return "very-low";
  if (score >= PRESSURE_LOW_MIN_SCORE) return "low";
  if (score >= PRESSURE_MEDIUM_MIN_SCORE) return "medium";
  if (score >= PRESSURE_HIGH_MIN_SCORE) return "high";
  return "very-high";
}

/**
 * Deterministic from competitor count (via `competitionScore`, see the
 * boundary constants above) + `marketMaturity` tier. `marketMaturity ===
 * "saturated"` floors the tier at "high" minimum (never lowers an already
 * "very-high" tier).
 */
export function estimateCompetitionPressure(
  competition: CompetitionResult,
  marketMaturity: MarketMaturityLabel,
): CompetitionPressureResult {
  const count = competition.competitors.length;
  let tier = pressureTierFromScore(competition.competitionScore);
  const notes: string[] = [
    `competitionScore=${competition.competitionScore.toFixed(2)} -> base tier "${tier}" (competitionScore = 1/(1+competitorCount), so it is inversely related to competitor count).`,
  ];

  if (marketMaturity === "saturated") {
    const currentIdx = PRESSURE_LEVELS.indexOf(tier);
    const floorIdx = PRESSURE_LEVELS.indexOf("high");
    if (currentIdx < floorIdx) {
      notes.push(`marketMaturity="saturated" floors pressure at "high" minimum (was "${tier}").`);
      tier = "high";
    } else {
      notes.push(`marketMaturity="saturated" floor of "high" already satisfied by base tier "${tier}".`);
    }
  }

  return {
    pressure: tier,
    explanation: `${count} competitor(s), competitionScore=${competition.competitionScore.toFixed(2)}, marketMaturity="${marketMaturity}". ${notes.join(" ")}`,
  };
}

/* ========================================================================= */
/* Part D — Founder Opportunity synthesis                                    */
/* ========================================================================= */

/** No pricing evidence + buyingIntent.score at/above this -> "freemium" (acquisition-friendly default). */
const FREEMIUM_INTENT_THRESHOLD = 0.5;
/** marketGaps.length at/above this bumps expectedMvpComplexity up one tier (more gaps to address = a bigger MVP). */
const MANY_GAPS_THRESHOLD = 4;

function buildWhy(decision: FounderDecision, fois: FoisBreakdown): string[] {
  return [decision.reasoning.whyThisMatters, decision.reasoning.whyNow, decision.reasoning.whyFoundersPay, ...fois.reasons];
}

function buildWhyNot(decision: FounderDecision, fois: FoisBreakdown, calibration: OpportunityCalibration): string[] {
  const firedGateReasons = decision.qualityGates
    .filter((gate) => gate.fired)
    .map((gate) => `Quality gate "${gate.name}" fired: ${gate.reason}`);
  const firedDiagnosticReasons = calibration.diagnostics
    .filter((diagnostic) => diagnostic.fired)
    .map((diagnostic) => `Diagnostic "${diagnostic.flag}" fired: ${diagnostic.reason}`);
  return [...firedGateReasons, ...fois.weaknesses, ...firedDiagnosticReasons];
}

/**
 * Best-customer mapping table (first match wins):
 *   1. dominant source contains "github"/"stack" AND category in {bug, missing-capability} -> "developers/technical users"
 *   2. dominant source contains "reddit" AND category === "pricing-complaint"               -> "cost-conscious SMB users"
 *   3. category === "workflow-friction"                                                     -> "operations/process-heavy teams"
 *   4. category in {buying-intent, existing-spending}                                       -> "already-paying professional users"
 *   5. category in {looking-for-alternative, migration}                                     -> "switchers from an existing paid tool"
 *   6. else                                                                                  -> "general early adopters"
 */
function bestCustomerFor(category: ProblemCategory, dominantSourceId: string): string {
  const source = dominantSourceId.toLowerCase();
  if ((source.includes("github") || source.includes("stack")) && (category === "bug" || category === "missing-capability")) {
    return "developers/technical users";
  }
  if (source.includes("reddit") && category === "pricing-complaint") {
    return "cost-conscious SMB users";
  }
  if (category === "workflow-friction") return "operations/process-heavy teams";
  if (category === "buying-intent" || category === "existing-spending") return "already-paying professional users";
  if (category === "looking-for-alternative" || category === "migration") return "switchers from an existing paid tool";
  return "general early adopters";
}

function whyThisCustomerFor(
  category: ProblemCategory,
  dominantSourceId: string,
  dominantCount: number,
  bestCustomer: string,
): string {
  return `Dominant evidence source is "${dominantSourceId}" (${dominantCount} item(s)) in category "${category}" -> "${bestCustomer}" (see bestCustomerFor's mapping table in founder-intelligence.ts).`;
}

/**
 * bestPricingModel rule table (first match wins):
 *   1. enterpriseVsSmb === "enterprise"                                              -> "enterprise"
 *   2. pricingEvidence != null AND category in {pricing-complaint, existing-spending} -> "subscription" (recurring-spend language proxy — this codebase does not re-scan raw text for "recurring" phrasing at this layer, so category is used as the closest available proxy for "recurring complaint/spend language")
 *   3. pricingEvidence != null (any other category)                                  -> "one-time" (a price was mentioned, but no recurring-spend signal)
 *   4. pricingEvidence == null AND buyingIntent.score >= FREEMIUM_INTENT_THRESHOLD   -> "freemium" (acquisition-friendly default, per spec)
 *   5. else (no pricing evidence, low buying intent)                                 -> "usage" (lets an unproven, low-intent audience try before committing)
 */
function bestPricingModelFor(params: {
  enterpriseVsSmb: EnterpriseVsSmb;
  pricingEvidence: PricingSignal | null;
  category: ProblemCategory;
  buyingIntent: BuyingIntentResult;
}): FounderPricingModel {
  const { enterpriseVsSmb, pricingEvidence, category, buyingIntent } = params;
  if (enterpriseVsSmb === "enterprise") return "enterprise";
  if (pricingEvidence !== null) {
    if (category === "pricing-complaint" || category === "existing-spending") return "subscription";
    return "one-time";
  }
  if (buyingIntent.score >= FREEMIUM_INTENT_THRESHOLD) return "freemium";
  return "usage";
}

const MVP_COMPLEXITY_TIER_INDEX: Record<BuildDifficultyTier, number> = { low: 0, medium: 1, high: 2 };
const MVP_COMPLEXITY_BY_INDEX: FounderMvpComplexity[] = ["low", "medium", "high"];

/** expectedMvpComplexity = min(2, tierIndex(buildDifficulty.tier) + (marketGaps.length >= MANY_GAPS_THRESHOLD ? 1 : 0)), mapped back to low/medium/high. */
function expectedMvpComplexityFor(tier: BuildDifficultyTier, gapCount: number): FounderMvpComplexity {
  const bumped = MVP_COMPLEXITY_TIER_INDEX[tier] + (gapCount >= MANY_GAPS_THRESHOLD ? 1 : 0);
  return MVP_COMPLEXITY_BY_INDEX[Math.min(2, bumped)]!;
}

/**
 * soloFounderSuitability rule: start from buildDifficulty.tier (low=2,
 * medium=1, high=0 on a 0-2 index), +1 (capped at 2) if at least one
 * competitor shows an indie/bootstrapped signal (a positive market proof
 * point — solo founders have succeeded here before), -1 (floored at 0) if
 * enterpriseVsSmb === "enterprise" (enterprise sales cycles are harder for
 * a solo founder to run). 2 -> "high", 1 -> "medium", 0 -> "low".
 */
function soloFounderSuitabilityFor(
  tier: BuildDifficultyTier,
  soloFriendlyCompetitorCount: number,
  enterpriseVsSmb: EnterpriseVsSmb,
): SoloFounderSuitability {
  let score = tier === "low" ? 2 : tier === "medium" ? 1 : 0;
  if (soloFriendlyCompetitorCount > 0) score = Math.min(2, score + 1);
  if (enterpriseVsSmb === "enterprise") score = Math.max(0, score - 1);
  return score === 2 ? "high" : score === 1 ? "medium" : "low";
}

/* ========================================================================= */
/* Part F — Differentiation Engine                                           */
/* ========================================================================= */

/** Share of evidence concentrated in one source at/above which "Vertical SaaS" is supported — a proxy for a specific community/niche (this codebase has no direct vertical/niche label; documented limitation). */
const VERTICAL_SAAS_CONCENTRATION_THRESHOLD = 0.7;

const PRIVACY_SIGNAL_PHRASES = ["privacy concern", "data privacy", "don't want my data", "dont want my data", "privacy-first"];
const OFFLINE_SIGNAL_PHRASES = ["works offline", "no internet", "offline mode", "offline access"];

function differentiationStrategiesFor(params: {
  marketGaps: MarketGap[];
  dominantSourceId: string;
  dominantCount: number;
  evidenceCount: number;
  buildDifficulty: BuildDifficultyResult;
  category: ProblemCategory;
  evidenceTextBlob: string;
}): DifferentiationStrategy[] {
  const { marketGaps, dominantSourceId, dominantCount, evidenceCount, buildDifficulty, category, evidenceTextBlob } = params;
  const gapNames = new Set(marketGaps.map((gap) => gap.gap));
  const strategies: DifferentiationStrategy[] = [];

  if (gapNames.has("Expensive Pricing")) {
    strategies.push({
      strategy: "Lower Pricing",
      evidenceReason: `"Expensive Pricing" market gap detected with real evidence (see marketGaps) -> a lower-priced entrant directly addresses the documented pain.`,
    });
  }
  if (gapNames.has("Missing AI")) {
    strategies.push({
      strategy: "AI-first",
      evidenceReason: `"Missing AI" market gap detected -> an AI-first approach directly fills the documented gap.`,
    });
  }
  const sourceLower = dominantSourceId.toLowerCase();
  if (sourceLower.includes("github") || sourceLower.includes("stack")) {
    strategies.push({
      strategy: "Developer-first",
      evidenceReason: `Dominant evidence source is "${dominantSourceId}" (a developer-centric platform) -> a developer-first product meets the audience where they already are.`,
    });
  }
  const dominantShare = evidenceCount === 0 ? 0 : dominantCount / evidenceCount;
  if (dominantShare >= VERTICAL_SAAS_CONCENTRATION_THRESHOLD) {
    strategies.push({
      strategy: "Vertical SaaS",
      evidenceReason: `${(dominantShare * 100).toFixed(0)}% of evidence is concentrated in one source ("${dominantSourceId}", >= ${(VERTICAL_SAAS_CONCENTRATION_THRESHOLD * 100).toFixed(0)}% threshold) — used as a proxy for a specific community/niche (this codebase has no direct vertical/niche label).`,
    });
  }
  if (gapNames.has("Poor Automation") || gapNames.has("Manual Workflow")) {
    strategies.push({
      strategy: "Automation-first",
      evidenceReason: `"Poor Automation"/"Manual Workflow" market gap detected -> automating the manual step is a direct differentiator.`,
    });
  }
  if (gapNames.has("Complex UX")) {
    strategies.push({
      strategy: "Faster UX",
      evidenceReason: `"Complex UX" market gap detected -> a faster, simpler UX directly addresses the documented friction.`,
    });
  }
  const hasWorkflowFrictionSignal = gapNames.has("Manual Workflow") || category === "workflow-friction" || category === "workaround";
  if (buildDifficulty.tier !== "high" && hasWorkflowFrictionSignal) {
    strategies.push({
      strategy: "No-code",
      evidenceReason: `buildDifficulty.tier="${buildDifficulty.tier}" (not "high") AND a workflow-friction/manual-workaround signal is present (category="${category}"${gapNames.has("Manual Workflow") ? `, "Manual Workflow" gap` : ""}) -> accessible enough to build without-code.`,
    });
  }
  const privacyMatch = PRIVACY_SIGNAL_PHRASES.find((phrase) => evidenceTextBlob.includes(phrase));
  if (privacyMatch) {
    strategies.push({
      strategy: "Privacy-first",
      evidenceReason: `Evidence text contains a real privacy-complaint phrase ("${privacyMatch}") -> privacy-first is a differentiator directly responsive to that complaint.`,
    });
  }
  const offlineMatch = OFFLINE_SIGNAL_PHRASES.find((phrase) => evidenceTextBlob.includes(phrase));
  if (offlineMatch) {
    strategies.push({
      strategy: "Offline-first",
      evidenceReason: `Evidence text contains a real offline-complaint phrase ("${offlineMatch}") -> offline-first is a differentiator directly responsive to that complaint.`,
    });
  }

  return strategies;
}

/* ========================================================================= */
/* Part G — Risk Engine (always all 8 present)                               */
/* ========================================================================= */

function marketRiskFor(marketMaturity: MarketMaturityLabel): FounderIntelligenceRisk {
  const severity: FounderIntelligenceRisk["severity"] =
    marketMaturity === "saturated" || marketMaturity === "declining" ? "high" : marketMaturity === "crowded" ? "medium" : "low";
  return {
    risk: "Market Risk",
    severity,
    explanation: `marketMaturity="${marketMaturity}" -> ${severity} market risk (saturated/declining=high, crowded=medium, growing/emerging=low).`,
  };
}

function executionRiskFor(tier: BuildDifficultyTier): FounderIntelligenceRisk {
  const severity: FounderIntelligenceRisk["severity"] = tier === "high" ? "high" : tier === "medium" ? "medium" : "low";
  return { risk: "Execution Risk", severity, explanation: `buildDifficulty.tier="${tier}" -> ${severity} execution risk.` };
}

const TECHNICAL_RISK_HIGH_MATCHED_SIGNALS = 3;

function technicalRiskFor(matchedSignals: string[]): FounderIntelligenceRisk {
  const count = matchedSignals.length;
  const severity: FounderIntelligenceRisk["severity"] =
    count >= TECHNICAL_RISK_HIGH_MATCHED_SIGNALS ? "high" : count >= 1 ? "medium" : "low";
  return {
    risk: "Technical Risk",
    severity,
    explanation: `${count} build-difficulty signal(s) matched (${matchedSignals.join(", ") || "none"}) -> ${severity} technical risk.`,
  };
}

/** Below this buyingIntent.score, missing/unsupported pricing evidence is treated as "high" (not just "medium") pricing risk. */
const PRICING_RISK_INTENT_THRESHOLD = 0.3;

function pricingRiskFor(
  pricingEvidence: PricingSignal | null,
  expensivePricingGapPresent: boolean,
  buyingIntent: BuyingIntentResult,
): FounderIntelligenceRisk {
  if (pricingEvidence === null) {
    const severity: FounderIntelligenceRisk["severity"] = buyingIntent.score < PRICING_RISK_INTENT_THRESHOLD ? "high" : "medium";
    return {
      risk: "Pricing Risk",
      severity,
      explanation: `No price data in evidence (pricingEvidence=null) -> you're guessing on price; buyingIntent.score=${buyingIntent.score.toFixed(2)} -> ${severity} pricing risk.`,
    };
  }
  if (expensivePricingGapPresent && buyingIntent.score < PRICING_RISK_INTENT_THRESHOLD) {
    return {
      risk: "Pricing Risk",
      severity: "high",
      explanation: `"Expensive Pricing" gap present but buyingIntent.score=${buyingIntent.score.toFixed(2)} < ${PRICING_RISK_INTENT_THRESHOLD} (no clear willingness-to-pay signal) -> high pricing risk.`,
    };
  }
  return {
    risk: "Pricing Risk",
    severity: "low",
    explanation: `Price data present (${pricingEvidence.extractedPrices.length} price point(s)) and no unmitigated "Expensive Pricing" gap -> low pricing risk.`,
  };
}

function competitionRiskFor(pressure: CompetitionPressureLabel): FounderIntelligenceRisk {
  const severity: FounderIntelligenceRisk["severity"] =
    pressure === "very-high" || pressure === "high" ? "high" : pressure === "medium" ? "medium" : "low";
  return { risk: "Competition Risk", severity, explanation: `competitionPressure="${pressure}" -> ${severity} competition risk.` };
}

function customerRiskFor(echoChamber: boolean, weakBuyingIntentFired: boolean, decisionEvidenceExplanation: string): FounderIntelligenceRisk {
  if (echoChamber) {
    return {
      risk: "Customer Risk",
      severity: "high",
      explanation: `decision.evidence.echoChamber=true (single-source-dominated evidence) -> you don't know if this generalizes beyond one community. ${decisionEvidenceExplanation}`,
    };
  }
  if (weakBuyingIntentFired) {
    return {
      risk: "Customer Risk",
      severity: "medium",
      explanation: `calibration diagnostic "Weak Buying Intent" fired -> some doubt customers will actually pay.`,
    };
  }
  return {
    risk: "Customer Risk",
    severity: "low",
    explanation: `No echo-chamber risk and the "Weak Buying Intent" diagnostic did not fire -> low customer risk.`,
  };
}

const PLATFORM_RISK_HIGH_CONCENTRATION = 1.0;
const PLATFORM_RISK_MEDIUM_CONCENTRATION = 0.7;

function platformRiskFor(
  evidenceCount: number,
  dominantSourceId: string,
  dominantCount: number,
): FounderIntelligenceRisk {
  const share = evidenceCount === 0 ? 0 : dominantCount / evidenceCount;
  const severity: FounderIntelligenceRisk["severity"] =
    share >= PLATFORM_RISK_HIGH_CONCENTRATION ? "high" : share >= PLATFORM_RISK_MEDIUM_CONCENTRATION ? "medium" : "low";
  return {
    risk: "Platform Risk",
    severity,
    explanation: `${(share * 100).toFixed(0)}% of evidence is sourced from a single platform ("${dominantSourceId}") -> ${severity} platform-dependent discovery risk.`,
  };
}

/** Small, fixed regulated-industry phrase list — "low" (no evidence) is the honest default absent a match, never inflated. */
const REGULATED_INDUSTRY_PHRASES = ["healthcare", "finance", "hipaa", "gdpr", "fintech", "medical"];

function regulationRiskFor(evidenceTextBlob: string): FounderIntelligenceRisk {
  const matches = REGULATED_INDUSTRY_PHRASES.filter((phrase) => evidenceTextBlob.includes(phrase));
  const severity: FounderIntelligenceRisk["severity"] = matches.length >= 2 ? "high" : matches.length === 1 ? "medium" : "low";
  return {
    risk: "Regulation Risk",
    severity,
    explanation:
      matches.length > 0
        ? `Evidence text contains ${matches.length} regulated-industry phrase(s): ${matches.join(", ")} -> ${severity} regulation risk.`
        : `No regulated-industry phrase (${REGULATED_INDUSTRY_PHRASES.join(", ")}) found in evidence text -> low regulation risk by default (absence of evidence is not proof of absence of regulation, but this risk is never inflated without a real signal).`,
  };
}

/* ========================================================================= */
/* Entry point                                                               */
/* ========================================================================= */

export interface ComputeFounderIntelligenceInput {
  cluster: ProblemCluster;
  competition: CompetitionResult;
  buyingIntent: BuyingIntentResult;
  pricing: PricingSignal;
  buildDifficulty: BuildDifficultyResult;
  fois: FoisBreakdown;
  decision: FounderDecision;
  calibration: OpportunityCalibration;
}

/**
 * Composes every Founder Intelligence part (A-G) from already-computed
 * inputs. Pure function — no side effects, no LLM call, no re-derivation of
 * clustering/FOIS/decision/calibration. Called once per shipped opportunity
 * from engine.ts's `attachFounderIntelligence`, AFTER `decision` and
 * `calibration` are already computed and attached.
 */
export function computeFounderIntelligence(input: ComputeFounderIntelligenceInput): FounderIntelligence {
  const { cluster, competition, buyingIntent, pricing, buildDifficulty, fois, decision, calibration } = input;

  // Built ONCE, reused across Parts A/F/G — see evidenceTextBlobOf's doc.
  const evidenceTextBlob = evidenceTextBlobOf(cluster);

  const growthLabel = cluster.frequency.growth.label;
  const marketMaturityResult = estimateMarketMaturity(
    competition,
    cluster.evidence.evidenceCount,
    cluster.frequency.uniqueSources,
    growthLabel,
  );

  const competitorIntelligence = buildCompetitorIntelligence({
    cluster,
    competition,
    pricing,
    evidenceTextBlob,
    marketMaturity: marketMaturityResult.maturity,
  });

  const marketGaps = detectMarketGaps(cluster);
  const competitionPressure = estimateCompetitionPressure(competition, marketMaturityResult.maturity);

  const dominant = dominantSourceOf(cluster.evidence.sourceBreakdown);
  const bestCustomer = bestCustomerFor(cluster.category, dominant.sourceId);

  const founderOpportunity: FounderOpportunitySynthesis = {
    shouldBuild: decision.recommendation.verdict === "BUILD",
    why: buildWhy(decision, fois),
    whyNot: buildWhyNot(decision, fois, calibration),
    bestCustomer,
    whyThisCustomer: whyThisCustomerFor(cluster.category, dominant.sourceId, dominant.count, bestCustomer),
    bestPricingModel: bestPricingModelFor({
      enterpriseVsSmb: competitorIntelligence.enterpriseVsSmb,
      pricingEvidence: competitorIntelligence.pricingEvidence,
      category: cluster.category,
      buyingIntent,
    }),
    expectedBuildDifficulty: buildDifficulty.tier,
    expectedMvpComplexity: expectedMvpComplexityFor(buildDifficulty.tier, marketGaps.length),
    soloFounderSuitability: soloFounderSuitabilityFor(
      buildDifficulty.tier,
      competitorIntelligence.soloFounderFriendlyCompetitors.length,
      competitorIntelligence.enterpriseVsSmb,
    ),
  };

  const differentiationStrategies = differentiationStrategiesFor({
    marketGaps,
    dominantSourceId: dominant.sourceId,
    dominantCount: dominant.count,
    evidenceCount: cluster.evidence.evidenceCount,
    buildDifficulty,
    category: cluster.category,
    evidenceTextBlob,
  });

  const weakBuyingIntentFired = calibration.diagnostics.find((diagnostic) => diagnostic.flag === "Weak Buying Intent")?.fired ?? false;
  const expensivePricingGapPresent = marketGaps.some((gap) => gap.gap === "Expensive Pricing");

  const risks: FounderIntelligenceRisk[] = [
    marketRiskFor(marketMaturityResult.maturity),
    executionRiskFor(buildDifficulty.tier),
    technicalRiskFor(buildDifficulty.matchedSignals),
    pricingRiskFor(competitorIntelligence.pricingEvidence, expensivePricingGapPresent, buyingIntent),
    competitionRiskFor(competitionPressure.pressure),
    customerRiskFor(decision.evidence.echoChamber, weakBuyingIntentFired, decision.evidence.explanation),
    platformRiskFor(cluster.evidence.evidenceCount, dominant.sourceId, dominant.count),
    regulationRiskFor(evidenceTextBlob),
  ];

  return {
    competitorIntelligence,
    marketGaps,
    marketMaturity: marketMaturityResult,
    founderOpportunity,
    competitionPressure,
    differentiationStrategies,
    risks,
  };
}

/**
 * Trivial, type-valid placeholder mirroring calibration.ts's
 * `defaultCalibration()` — set at report-construction time in engine.ts's
 * `buildOpportunityReport` (before the source ProblemCluster's `id` can be
 * looked back up post-Top-N-slice), always overwritten by
 * `attachFounderIntelligence` for every surviving report.
 */
export function defaultFounderIntelligence(): FounderIntelligence {
  return {
    competitorIntelligence: {
      primaryCompetitors: [],
      competitorCategory: "unknown",
      marketMaturity: "emerging",
      openSourceVsSaas: "unknown",
      enterpriseVsSmb: "unknown",
      soloFounderFriendlyCompetitors: [],
      pricingEvidence: null,
      competitorConfidence: "unknown",
      competitorEvidence: [],
      explanation: "Placeholder set at construction time; overwritten by attachFounderIntelligence once the shipped Top-N order is known (see engine.ts).",
    },
    marketGaps: [],
    marketMaturity: { maturity: "emerging", reasons: ["Placeholder — overwritten by attachFounderIntelligence."] },
    founderOpportunity: {
      shouldBuild: false,
      why: [],
      whyNot: [],
      bestCustomer: "unknown",
      whyThisCustomer: "Placeholder — overwritten by attachFounderIntelligence.",
      bestPricingModel: "freemium",
      expectedBuildDifficulty: "low",
      expectedMvpComplexity: "low",
      soloFounderSuitability: "medium",
    },
    competitionPressure: { pressure: "low", explanation: "Placeholder — overwritten by attachFounderIntelligence." },
    differentiationStrategies: [],
    risks: [],
  };
}

/**
 * Attaches a real `founderIntelligence` bundle to every report in the
 * shipped list — mirrors calibration.ts's `attachCalibration` pattern
 * exactly (map, preserve order, never re-sort/re-score). Called from
 * engine.ts's `analyze` AFTER `attachCalibration`, so every input this
 * function reads (`report.decision`, `report.calibration`, `report.fois`,
 * etc.) is the REAL, final value, never a placeholder.
 *
 * `clusters` is the full `problemReport.clusters` list this run started
 * from; each report's `clusterId` is looked up in an O(1) map (built once,
 * O(n) over `clusters`) rather than re-scanning `clusters` per report —
 * no O(n^2) anywhere here, and `opportunities` itself is already bounded to
 * the shipped Top-N.
 */
export function attachFounderIntelligence(
  opportunities: FounderOpportunityReport[],
  clusters: ProblemCluster[],
): FounderOpportunityReport[] {
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster] as const));

  return opportunities.map((report) => {
    const cluster = clusterById.get(report.clusterId);
    if (!cluster) {
      // Should not happen (every shipped report's clusterId traces back to
      // a cluster in the same problemReport.clusters this run started
      // from) — fail safe with the existing placeholder rather than
      // throwing, so a future upstream change can't crash the whole
      // pipeline over a diagnostics-only layer.
      return report;
    }

    const founderIntelligence = computeFounderIntelligence({
      cluster,
      competition: report.competition,
      buyingIntent: report.buyingIntent,
      pricing: report.suggestedPricing,
      buildDifficulty: report.buildDifficulty,
      fois: report.fois,
      decision: report.decision,
      calibration: report.calibration,
    });

    return { ...report, founderIntelligence };
  });
}
