import type { RootCause } from "./concept.js";
import type { ClassifiedItem, ClusterSeverity, FrequencyStats, ProblemCategory } from "./types.js";

/**
 * Deterministic, rule-based severity scoring (Loop 6, Part C). Every input
 * this module reads was ALREADY COMPUTED earlier in `ProblemIntelligenceEngine.
 * analyze`'s single pass over a category's items (Part G perf constraint):
 *   - `frequency`          -> `cluster.frequency` (frequency.ts, already computed)
 *   - `classifiedItems`    -> the SAME per-category `ClassifiedItem[]` engine.ts
 *                             already holds in its loop (from `groupByCategory`,
 *                             Loop 1) — its `.urgency`/`.emotionalIntensityScore`
 *                             fields were set by `detector.ts`'s `classifyItem`
 *                             the first time each item was classified, never
 *                             recomputed here.
 *   - `category`/`rootCause` -> already resolved by `extractProblemWithConcepts`
 *                             (extractor.ts) earlier in the SAME loop iteration.
 * `computeSeverity` itself does exactly ONE pass over `classifiedItems` (to
 * aggregate urgency/emotional-intensity), which is the SAME array engine.ts
 * was already iterating to build `categoryItems`/evidence/frequency — no
 * additional pass over the full, un-grouped item list.
 */

export interface SeverityInput {
  category: ProblemCategory;
  /** The dominant concept's root cause (concept.ts), when one was found. */
  rootCause?: RootCause;
  /** Already computed by frequency.ts for this cluster. */
  frequency: FrequencyStats;
  /** This category's classified items (already computed by `groupByCategory`, Loop 1) — read-only, not reclassified. */
  classifiedItems: ClassifiedItem[];
}

/** `frequency` sub-score caps out (scaled to 100) at this many mentions — a round, moderate ceiling matching confidence.ts's own evidenceCount/10 style normalization. */
const FREQUENCY_MENTIONS_CAP = 20;
/** Flat bonus/penalty (in 0-100 points) applied to the frequency sub-score for rising/declining growth, on top of the raw mentions-based score. */
const FREQUENCY_RISING_BONUS = 15;
const FREQUENCY_DECLINING_PENALTY = 15;

/** Category+rootCause -> businessImpact composite (Part C spec: "pricing-complaint/existing-spending/migration = high"). */
const BUSINESS_IMPACT_BASE = 40;
const BUSINESS_IMPACT_CATEGORY_BONUS = 30;
const BUSINESS_IMPACT_ROOT_CAUSE_BONUS = 30;
const BUSINESS_IMPACT_HIGH_CATEGORIES: ReadonlySet<ProblemCategory> = new Set<ProblemCategory>([
  "pricing-complaint",
  "existing-spending",
  "migration",
]);
/** Root causes that independently signal high business impact regardless of category — churn/compliance risk, not just a UX nuisance. */
const BUSINESS_IMPACT_HIGH_ROOT_CAUSES: ReadonlySet<RootCause> = new Set<RootCause>([
  "Pricing Friction",
  "Vendor Lock-in",
  "Security/Compliance",
]);

/**
 * timeCost per root cause — one row per RootCause value, documented inline.
 * "Manual Process"/"Lack of Automation" are "high" per the mission's own
 * example (manual, repetitive work directly costs the user's TIME).
 */
const TIME_COST_BY_ROOT_CAUSE: Record<RootCause, "low" | "medium" | "high"> = {
  "Manual Process": "high", // literally manual labor time
  "Lack of Automation": "high", // recurring manual re-entry time
  "Onboarding Friction": "medium", // one-time ramp-up time
  "Poor UX": "medium", // extra clicks/navigation time
  Performance: "medium", // time lost waiting on slow loads/responses
  "Reliability/Bugs": "medium", // time lost to workarounds/retries after a failure
  "Missing Integration": "medium", // manual data-transfer time between disconnected tools
  "Support Gap": "low", // cost is more emotional/business than raw hours spent
  "Pricing Friction": "low", // a money problem, not primarily a time problem
  "Vendor Lock-in": "low",
  "Security/Compliance": "low",
};

/**
 * moneyCost per root cause — one row per RootCause value, documented inline.
 * "Pricing Friction" is "high" per the mission's own example (it IS a direct
 * price complaint).
 */
const MONEY_COST_BY_ROOT_CAUSE: Record<RootCause, "low" | "medium" | "high"> = {
  "Pricing Friction": "high", // direct price complaint
  "Vendor Lock-in": "high", // locked into paying, or switching costs money
  "Security/Compliance": "high", // compliance failures risk fines or lost enterprise deals
  "Support Gap": "medium", // churn cost from unresolved billing/support issues
  "Reliability/Bugs": "medium", // cost of downtime/lost work
  "Missing Integration": "medium", // cost of duct-tape tooling to bridge the gap
  "Manual Process": "low", // mostly a time cost, not a direct money cost
  "Lack of Automation": "low",
  "Poor UX": "low",
  Performance: "low",
  "Onboarding Friction": "low",
};

const DEFAULT_TIME_COST: "low" | "medium" | "high" = "low";
const DEFAULT_MONEY_COST: "low" | "medium" | "high" = "low";

/**
 * developerFriction/customerFriction split rule: a fixed per-category weight
 * (0-1) for how much of the cluster's total "friction pool" (see
 * `frictionBase` below) is attributed to developers vs customers.
 * "bug"/"missing-capability" skew developer-facing (weight > 0.5): these are
 * things an engineer has to go fix. "pricing-complaint"/"existing-spending"/
 * "buying-intent" skew customer-facing (weight < 0.5): these are commercial/
 * support concerns, not code defects. Everything else defaults to an even
 * 0.5/0.5 split (`DEFAULT_DEVELOPER_FRICTION_WEIGHT`) — a defensible neutral
 * default, not a fabricated skew.
 */
const DEVELOPER_FRICTION_WEIGHT_BY_CATEGORY: Partial<Record<ProblemCategory, number>> = {
  bug: 0.7,
  "missing-capability": 0.6,
  "workflow-friction": 0.5,
  "feature-request": 0.5,
  complaint: 0.4,
  "market-gap": 0.4,
  workaround: 0.5,
  migration: 0.3,
  "looking-for-alternative": 0.3,
  "pricing-complaint": 0.2,
  "existing-spending": 0.2,
  "buying-intent": 0.2,
  praise: 0.3,
  trend: 0.3,
  other: 0.3,
};
const DEFAULT_DEVELOPER_FRICTION_WEIGHT = 0.5;

/**
 * Fixed weights for the top-level `severity` composite — the 4 numeric 0-100
 * sub-scores (frequency/urgency/businessImpact/emotionalFriction). Sums to
 * exactly 1.0 (asserted in tests/problems/severity.test.ts).
 * `developerFriction`/`customerFriction`/`timeCost`/`moneyCost` are derived,
 * explanatory attributes and are intentionally NOT part of this weighted sum
 * (they're a re-partitioning/categorical restatement of the same friction,
 * not independent signal — folding them in too would double-count).
 */
export const SEVERITY_WEIGHTS = {
  frequency: 0.3,
  urgency: 0.25,
  businessImpact: 0.3,
  emotionalFriction: 0.15,
} as const;

function clamp0to100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Computes the full severity composite for one cluster. Called ONCE per
 * cluster from engine.ts, fed values already computed earlier in the same
 * loop iteration (see module doc above) — this function performs exactly one
 * new O(n) aggregation pass over `classifiedItems` (n = this category's item
 * count, already being iterated by the caller anyway), not the full raw item
 * list.
 */
export function computeSeverity(input: SeverityInput): ClusterSeverity {
  const { category, rootCause, frequency, classifiedItems } = input;
  const reasons: string[] = [];

  // -- frequency ----------------------------------------------------------
  const mentionsScore = Math.min(1, frequency.mentions / FREQUENCY_MENTIONS_CAP);
  let frequencyScore = mentionsScore * 100;
  if (frequency.growth.label === "rising") frequencyScore += FREQUENCY_RISING_BONUS;
  else if (frequency.growth.label === "declining") frequencyScore -= FREQUENCY_DECLINING_PENALTY;
  frequencyScore = clamp0to100(frequencyScore);
  reasons.push(
    `frequency: ${frequency.mentions} mention(s) -> min(1, ${frequency.mentions}/${FREQUENCY_MENTIONS_CAP})*100` +
      `${frequency.growth.label === "rising" ? ` +${FREQUENCY_RISING_BONUS} (rising growth)` : frequency.growth.label === "declining" ? ` -${FREQUENCY_DECLINING_PENALTY} (declining growth)` : " (stable/insufficient-data growth, no adjustment)"} = ${frequencyScore}.`,
  );

  // -- urgency (single O(n) aggregation over ALREADY-computed ClassifiedItem.urgency, no reclassification) --
  const urgentCount = classifiedItems.filter((c) => c.urgency === true).length;
  const urgencyFraction = classifiedItems.length > 0 ? urgentCount / classifiedItems.length : 0;
  const urgencyScore = clamp0to100(urgencyFraction * 100);
  reasons.push(
    `urgency: ${urgentCount}/${classifiedItems.length} item(s) carry an explicit urgency phrase (from detector.ts, already computed) -> ${urgencyScore}.`,
  );

  // -- businessImpact -------------------------------------------------------
  let businessImpactScore = BUSINESS_IMPACT_BASE;
  const categoryIsHighImpact = BUSINESS_IMPACT_HIGH_CATEGORIES.has(category);
  const rootCauseIsHighImpact = rootCause !== undefined && BUSINESS_IMPACT_HIGH_ROOT_CAUSES.has(rootCause);
  if (categoryIsHighImpact) businessImpactScore += BUSINESS_IMPACT_CATEGORY_BONUS;
  if (rootCauseIsHighImpact) businessImpactScore += BUSINESS_IMPACT_ROOT_CAUSE_BONUS;
  businessImpactScore = clamp0to100(businessImpactScore);
  reasons.push(
    `businessImpact: base ${BUSINESS_IMPACT_BASE}` +
      `${categoryIsHighImpact ? ` +${BUSINESS_IMPACT_CATEGORY_BONUS} (category "${category}" is high-impact: pricing-complaint/existing-spending/migration)` : ""}` +
      `${rootCauseIsHighImpact ? ` +${BUSINESS_IMPACT_ROOT_CAUSE_BONUS} (rootCause "${rootCause}" is high-impact: Pricing Friction/Vendor Lock-in/Security-Compliance)` : ""} = ${businessImpactScore}.`,
  );

  // -- timeCost / moneyCost -------------------------------------------------
  const timeCost = rootCause ? TIME_COST_BY_ROOT_CAUSE[rootCause] : DEFAULT_TIME_COST;
  const moneyCost = rootCause ? MONEY_COST_BY_ROOT_CAUSE[rootCause] : DEFAULT_MONEY_COST;
  reasons.push(
    rootCause
      ? `timeCost="${timeCost}", moneyCost="${moneyCost}" (fixed lookup keyed by rootCause "${rootCause}").`
      : `timeCost="${timeCost}", moneyCost="${moneyCost}" (no dominant rootCause was found; defaulted to "low"/"low" rather than guessing).`,
  );

  // -- emotionalFriction (single O(n) aggregation over ALREADY-computed ClassifiedItem.emotionalIntensityScore) --
  const emotionalScores = classifiedItems.map((c) => c.emotionalIntensityScore ?? 0);
  const avgEmotional = emotionalScores.length > 0 ? emotionalScores.reduce((sum, s) => sum + s, 0) / emotionalScores.length : 0;
  const emotionalFrictionScore = clamp0to100(avgEmotional * 100);
  reasons.push(
    `emotionalFriction: average emotionalIntensityScore across ${classifiedItems.length} item(s) (from detector.ts, already computed) = ${avgEmotional.toFixed(2)} -> ${emotionalFrictionScore}.`,
  );

  // -- developerFriction / customerFriction --------------------------------
  const developerWeight = DEVELOPER_FRICTION_WEIGHT_BY_CATEGORY[category] ?? DEFAULT_DEVELOPER_FRICTION_WEIGHT;
  const customerWeight = 1 - developerWeight;
  const frictionBase = clamp0to100((emotionalFrictionScore + businessImpactScore) / 2);
  const developerFrictionScore = clamp0to100(frictionBase * developerWeight);
  const customerFrictionScore = clamp0to100(frictionBase * customerWeight);
  reasons.push(
    `developerFriction/customerFriction: frictionBase=(emotionalFriction ${emotionalFrictionScore} + businessImpact ${businessImpactScore})/2=${frictionBase}, ` +
      `split ${developerWeight.toFixed(2)}/${customerWeight.toFixed(2)} for category "${category}" -> developerFriction=${developerFrictionScore}, customerFriction=${customerFrictionScore}.`,
  );

  // -- severity composite ---------------------------------------------------
  const severity = clamp0to100(
    frequencyScore * SEVERITY_WEIGHTS.frequency +
      urgencyScore * SEVERITY_WEIGHTS.urgency +
      businessImpactScore * SEVERITY_WEIGHTS.businessImpact +
      emotionalFrictionScore * SEVERITY_WEIGHTS.emotionalFriction,
  );
  reasons.push(
    `severity = round(${frequencyScore}*${SEVERITY_WEIGHTS.frequency} + ${urgencyScore}*${SEVERITY_WEIGHTS.urgency} + ` +
      `${businessImpactScore}*${SEVERITY_WEIGHTS.businessImpact} + ${emotionalFrictionScore}*${SEVERITY_WEIGHTS.emotionalFriction}) = ${severity}.`,
  );

  return {
    severity,
    frequency: frequencyScore,
    urgency: urgencyScore,
    businessImpact: businessImpactScore,
    timeCost,
    moneyCost,
    emotionalFriction: emotionalFrictionScore,
    developerFriction: developerFrictionScore,
    customerFriction: customerFrictionScore,
    reasons,
  };
}
