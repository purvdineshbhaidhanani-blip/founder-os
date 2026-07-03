import type { ClassifiedItem, ProblemCategory, ProblemCluster } from "../problems/types.js";
import type { RawResearchItem } from "../research/types.js";
import type {
  BuyingIntentResult,
  CompetitionResult,
  FoisBreakdown,
  FoisDimension,
  FoisPenalty,
  PricingSignal,
} from "./types.js";

/**
 * Founder Opportunity Intelligence Score (FOIS) — a transparent,
 * evidence-based, multi-dimensional 0-100 score that replaces
 * scoreBreakdown.weightedTotal as the ranking driver for Top Opportunities
 * (see engine.ts). No LLM call: every dimension is a fixed, documented
 * formula composed from signals already computed elsewhere in this
 * directory (buying-intent.ts, competition.ts, pricing.ts) plus the
 * ProblemCluster's own evidence/frequency/confidence fields. This module
 * never re-derives clustering or confidence — it only reads
 * cluster.evidence / cluster.frequency / cluster.confidence as inputs.
 *
 * Each dimension produces a `raw` 0-100 score, is multiplied by a fixed
 * `weight` (all weights sum to exactly 1.0, asserted in fois.test.ts) to
 * produce `weighted`, and the dimensions are summed to a 0-100 overall
 * score. A small set of named, subtractive penalties (see PENALTY
 * constants below) is then applied for evidence-quality red flags that no
 * single dimension fully captures on its own ("never score from one
 * sentence").
 */

export interface ComputeFoisInput {
  cluster: ProblemCluster;
  clusterItems: ClassifiedItem[];
  rawItems: RawResearchItem[];
  buyingIntent: BuyingIntentResult;
  competition: CompetitionResult;
  pricing: PricingSignal;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function blobOf(item: RawResearchItem): string {
  return `${item.title} ${item.body ?? ""}`.toLowerCase();
}

/* -------------------------------------------------------------------- */
/* Dimension weights                                                    */
/* -------------------------------------------------------------------- */

/**
 * Fixed dimension weights — sum to exactly 1.0 (asserted in
 * fois.test.ts). Each weight is a reasoned default reflecting how directly
 * the dimension predicts "a founder should build this", not an empirically
 * tuned value (no labeled founder-outcome dataset was available).
 */
const WEIGHTS = {
  // Pain is the root justification for building anything — weighted
  // highest alongside buying intent.
  businessPain: 0.15,
  // Willingness to pay is the strongest direct signal of a viable
  // business, not just a real problem — tied for highest weight.
  buyingIntent: 0.15,
  // Commercial potential (pricing evidence + category + intent) is a
  // second, partially-overlapping-but-distinct lens on monetizability, so
  // it also gets a high weight.
  commercialPotential: 0.15,
  // Urgency correlates with willingness to adopt/switch quickly, a real
  // but secondary signal relative to pain/intent/commercial viability.
  urgency: 0.1,
  // Frequency (volume + growth) shows the problem recurs and is not a
  // one-off complaint.
  frequency: 0.1,
  // Source diversity guards against a single echo chamber driving the
  // whole score — same rationale as scoring.ts's sourceDiversity factor.
  sourceDiversity: 0.1,
  // Automation potential is a build-shape signal (this problem is
  // solvable with software), moderate weight since it's necessary but not
  // sufficient on its own.
  automationPotential: 0.1,
  // Evidence strength is a cross-cutting quality gate on how much to
  // trust every other dimension; also reinforced by the penalties below.
  evidenceStrength: 0.1,
  // Competition pressure is informative (validates or invalidates the
  // market) but the least directly predictive of "should a founder build
  // this specific opportunity", so it gets the smallest weight.
  competitionPressure: 0.05,
} as const;

const WEIGHT_SUM = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  // Fail loudly at import time rather than silently producing a
  // mis-scaled score — mirrors the "never invent certainty" philosophy.
  throw new Error(`FOIS dimension weights must sum to 1.0, got ${WEIGHT_SUM}`);
}

/* -------------------------------------------------------------------- */
/* Category groupings (documented, fixed — no LLM)                      */
/* -------------------------------------------------------------------- */

/** Categories that represent a directly-stated pain point, per the Loop 2 mission spec. */
const HIGH_PAIN_CATEGORIES: ProblemCategory[] = [
  "complaint",
  "bug",
  "workflow-friction",
  "pricing-complaint",
];

/** Categories carrying real or implicit commercial signal (budget exists or is being actively sought). Mirrors buying-intent.ts's IMPLICIT_BUYING_INTENT_CATEGORIES plus explicit "buying-intent". */
const COMMERCIAL_CATEGORIES: ProblemCategory[] = [
  "pricing-complaint",
  "existing-spending",
  "migration",
  "buying-intent",
  "looking-for-alternative",
];

/**
 * Fixed phrase list for "manual, repeated, time-consuming work" signals —
 * a new, small list scoped to this module, using the same substring
 * technique as src/problems/detector.ts. Distinct from detector.ts's
 * "workflow-friction" list: this one is about automatable manual labor
 * specifically, not friction/frustration in general.
 */
const AUTOMATION_SIGNAL_PHRASES: string[] = [
  "manually",
  "by hand",
  "every time i",
  "each time i",
  "copy and paste",
  "copy-paste",
  "spreadsheet",
  "i do this manually",
  "time-consuming",
  "takes forever",
  "so many steps",
  "so many manual steps",
  "waste hours",
  "i waste hours",
  "tedious",
  "repetitive",
  "every single day",
  "i built a spreadsheet",
  "i made my own script",
  "i hacked together",
];

/* -------------------------------------------------------------------- */
/* Dimension computations                                               */
/* -------------------------------------------------------------------- */

/** Evidence-count magnitude credit shared by a couple of dimensions: +4 points per evidence item, capped at +40. */
function evidenceMagnitudeBonus(evidenceCount: number): number {
  return Math.min(40, evidenceCount * 4);
}

function computeBusinessPainDimension(cluster: ProblemCluster): FoisDimension {
  const isHighPain = HIGH_PAIN_CATEGORIES.includes(cluster.category);
  const isPraise = cluster.category === "praise";
  const base = isPraise ? 5 : isHighPain ? 60 : 30;
  const bonus = evidenceMagnitudeBonus(cluster.evidence.evidenceCount);
  const raw = clamp(base + bonus, 0, 100);

  return {
    name: "businessPain",
    raw,
    weight: WEIGHTS.businessPain,
    weighted: raw * WEIGHTS.businessPain,
    reason: `Category "${cluster.category}" is ${isHighPain ? "a directly-stated pain category" : isPraise ? "a satisfaction (non-pain) category" : "not a direct pain category"} (base=${base}), plus +${bonus} for ${cluster.evidence.evidenceCount} evidence item(s) -> ${raw}/100.`,
    evidence: [`category=${cluster.category}`, `evidenceCount=${cluster.evidence.evidenceCount}`],
  };
}

function computeBuyingIntentDimension(buyingIntent: BuyingIntentResult): FoisDimension {
  const raw = clamp(buyingIntent.score * 100, 0, 100);
  return {
    name: "buyingIntent",
    raw,
    weight: WEIGHTS.buyingIntent,
    weighted: raw * WEIGHTS.buyingIntent,
    reason: `Buying-intent score is ${buyingIntent.score.toFixed(2)} (${buyingIntent.matchingItemCount}/${buyingIntent.totalItemCount} items) scaled to ${raw.toFixed(0)}/100.`,
    evidence: [`buyingIntent.score=${buyingIntent.score.toFixed(2)}`, `matchingItemCount=${buyingIntent.matchingItemCount}/${buyingIntent.totalItemCount}`],
  };
}

/**
 * Urgency combines the per-item `urgency` flag (set by
 * src/problems/detector.ts's detectUrgency on every ClassifiedItem) with a
 * documented fallback boost from category + growth, since a cluster can be
 * genuinely urgent (rising, high-pain category) even if no single item
 * happened to use one of the fixed urgency phrases.
 */
function computeUrgencyDimension(cluster: ProblemCluster, clusterItems: ClassifiedItem[]): FoisDimension {
  const total = clusterItems.length;
  const urgentCount = clusterItems.filter((classified) => classified.urgency === true).length;
  const fraction = total === 0 ? 0 : urgentCount / total;

  const isRising = cluster.frequency.growth.label === "rising";
  const growthBoost = isRising ? 15 : 0;
  const categoryBoost = HIGH_PAIN_CATEGORIES.includes(cluster.category) ? 10 : 0;

  const raw = clamp(fraction * 100 + growthBoost + categoryBoost, 0, 100);

  return {
    name: "urgency",
    raw,
    weight: WEIGHTS.urgency,
    weighted: raw * WEIGHTS.urgency,
    reason: `${urgentCount}/${total} item(s) carry an explicit urgency phrase (${(fraction * 100).toFixed(0)}%), +${growthBoost} for ${isRising ? "rising" : "non-rising"} growth, +${categoryBoost} for ${HIGH_PAIN_CATEGORIES.includes(cluster.category) ? "" : "non-"}high-pain category -> ${raw.toFixed(0)}/100.`,
    evidence: [`urgentItems=${urgentCount}/${total}`, `growth=${cluster.frequency.growth.label}`, `category=${cluster.category}`],
  };
}

function computeFrequencyDimension(cluster: ProblemCluster): FoisDimension {
  const { mentions, growth } = cluster.frequency;
  const mentionScore = Math.min(80, mentions * 8);
  const growthBoost = growth.label === "rising" ? 20 : growth.label === "stable" ? 10 : 0;
  const raw = clamp(mentionScore + growthBoost, 0, 100);

  return {
    name: "frequency",
    raw,
    weight: WEIGHTS.frequency,
    weighted: raw * WEIGHTS.frequency,
    reason: `${mentions} mention(s) -> ${mentionScore.toFixed(0)}/80, +${growthBoost} for ${growth.label} growth -> ${raw.toFixed(0)}/100.`,
    evidence: [`mentions=${mentions}`, `growth=${growth.label}`],
  };
}

/** Mirrors scoring.ts's sourceDiversity = min(1, uniqueSources/4) formula, scaled to 0-100, for consistency with the existing score. */
function computeSourceDiversityDimension(cluster: ProblemCluster): FoisDimension {
  const uniqueSources = cluster.frequency.uniqueSources;
  const raw = clamp((uniqueSources / 4) * 100, 0, 100);

  return {
    name: "sourceDiversity",
    raw,
    weight: WEIGHTS.sourceDiversity,
    weighted: raw * WEIGHTS.sourceDiversity,
    reason: `${uniqueSources} unique source(s) -> min(1, ${uniqueSources}/4) scaled to ${raw.toFixed(0)}/100.`,
    evidence: [`uniqueSources=${uniqueSources}`],
  };
}

function computeCommercialPotentialDimension(
  cluster: ProblemCluster,
  buyingIntent: BuyingIntentResult,
  pricing: PricingSignal,
): FoisDimension {
  const isCommercialCategory = COMMERCIAL_CATEGORIES.includes(cluster.category);
  const base = isCommercialCategory ? 40 : 10;
  const pricingBonus = pricing.extractedPrices.length > 0 ? 30 : 0;
  const buyingIntentBonus = buyingIntent.score * 30;
  const raw = clamp(base + pricingBonus + buyingIntentBonus, 0, 100);

  return {
    name: "commercialPotential",
    raw,
    weight: WEIGHTS.commercialPotential,
    weighted: raw * WEIGHTS.commercialPotential,
    reason: `Category "${cluster.category}" ${isCommercialCategory ? "is" : "is not"} a commercial category (base=${base}), +${pricingBonus} for ${pricing.extractedPrices.length} price mention(s), +${buyingIntentBonus.toFixed(0)} from buying-intent score -> ${raw.toFixed(0)}/100.`,
    evidence: [`category=${cluster.category}`, `pricesMentioned=${pricing.extractedPrices.length}`, `buyingIntent.score=${buyingIntent.score.toFixed(2)}`],
  };
}

function computeAutomationPotentialDimension(rawItems: RawResearchItem[]): FoisDimension {
  const combinedBlob = rawItems.map(blobOf).join(" ");
  const matched = AUTOMATION_SIGNAL_PHRASES.filter((phrase) => combinedBlob.includes(phrase));
  const raw = clamp(matched.length * 20, 0, 100);

  return {
    name: "automationPotential",
    raw,
    weight: WEIGHTS.automationPotential,
    weighted: raw * WEIGHTS.automationPotential,
    reason: `${matched.length} distinct manual-work/time-waste phrase(s) matched (${matched.join(", ") || "none"}) -> ${raw}/100.`,
    evidence: matched.length > 0 ? matched.map((phrase) => `phrase="${phrase}"`) : ["no automation-signal phrases matched"],
  };
}

/**
 * "More named competitors = validated market but more pressure": we score
 * a small number of named competitors (1-2) HIGHEST, since it proves real
 * paying demand exists while the market is not yet saturated. Zero named
 * competitors is scored low-moderate (no found evidence of market
 * validation — NOT the same as "no competition exists", see
 * competition.ts's own explanation string for that caveat). Heavily
 * crowded fields (6+) are scored lowest, reflecting real go-to-market
 * pressure for a founder.
 */
function computeCompetitionPressureDimension(competition: CompetitionResult): FoisDimension {
  const count = competition.competitors.length;
  let raw: number;
  let band: string;
  if (count === 0) {
    raw = 30;
    band = "no competitors found in evidence (unproven, not necessarily uncontested)";
  } else if (count <= 2) {
    raw = 90;
    band = "1-2 named competitors (validated demand, not yet saturated)";
  } else if (count <= 5) {
    raw = 50;
    band = "3-5 named competitors (crowded but still viable)";
  } else {
    raw = 15;
    band = "6+ named competitors (saturated market)";
  }

  return {
    name: "competitionPressure",
    raw,
    weight: WEIGHTS.competitionPressure,
    weighted: raw * WEIGHTS.competitionPressure,
    reason: `${count} distinct named competitor(s) -> ${band} -> ${raw}/100.`,
    evidence: [`competitorCount=${count}`],
  };
}

/**
 * "Never score from one sentence": evidenceCount and cross-source presence
 * both contribute, but the raw score is heavily discounted (x0.3) when
 * evidenceCount < 2 OR uniqueSources < 2, regardless of the other inputs.
 */
function computeEvidenceStrengthDimension(cluster: ProblemCluster): FoisDimension {
  const { evidenceCount } = cluster.evidence;
  const uniqueAuthors = cluster.frequency.uniqueAuthors;
  const uniqueSources = cluster.frequency.uniqueSources;

  const evidenceBase = Math.min(60, evidenceCount * 10);
  const authorBonus = Math.min(20, uniqueAuthors * 2);
  const crossSourceBonus = uniqueSources >= 2 ? 20 : 0;
  let raw = clamp(evidenceBase + authorBonus + crossSourceBonus, 0, 100);

  const isThin = evidenceCount < 2 || uniqueSources < 2;
  if (isThin) {
    raw = raw * 0.3;
  }

  return {
    name: "evidenceStrength",
    raw,
    weight: WEIGHTS.evidenceStrength,
    weighted: raw * WEIGHTS.evidenceStrength,
    reason: `evidenceCount=${evidenceCount} -> ${evidenceBase}/60, uniqueAuthors=${uniqueAuthors} -> +${authorBonus}, uniqueSources=${uniqueSources} -> +${crossSourceBonus}${isThin ? ", heavily discounted (x0.3) for thin evidence (evidenceCount<2 or uniqueSources<2)" : ""} -> ${raw.toFixed(0)}/100.`,
    evidence: [`evidenceCount=${evidenceCount}`, `uniqueAuthors=${uniqueAuthors}`, `uniqueSources=${uniqueSources}`],
  };
}

/* -------------------------------------------------------------------- */
/* Penalties (Step 4) — explicit, subtractive, documented               */
/* -------------------------------------------------------------------- */

/** Fires when the cluster's evidence comes from a single source — an echo-chamber risk. */
const SINGLE_SOURCE_PENALTY_POINTS = 8;
/** Fires when the cluster has fewer than 3 evidence items total — thin evidence beyond the evidenceStrength dimension's own discount. */
const LOW_EVIDENCE_PENALTY_POINTS = 6;
/** Fires when there is neither a pain signal nor any buying-intent signal at all — i.e. this looks like passive news/trend chatter, not a founder opportunity. */
const NO_SIGNAL_PENALTY_POINTS = 10;

/** Below this businessPain raw score, a cluster is treated as carrying no meaningful pain signal for the no-signal penalty check. */
const NO_PAIN_THRESHOLD = 30;

function computePenalties(
  cluster: ProblemCluster,
  buyingIntent: BuyingIntentResult,
  businessPainRaw: number,
): FoisPenalty[] {
  const penalties: FoisPenalty[] = [];
  const uniqueSources = cluster.frequency.uniqueSources;

  if (uniqueSources < 2) {
    penalties.push({
      reason: `Single-source evidence (uniqueSources=${uniqueSources}) — echo-chamber risk.`,
      points: SINGLE_SOURCE_PENALTY_POINTS,
    });
  }

  if (cluster.evidence.evidenceCount < 3) {
    penalties.push({
      reason: `Low evidence volume (evidenceCount=${cluster.evidence.evidenceCount}) — too thin to be conclusive.`,
      points: LOW_EVIDENCE_PENALTY_POINTS,
    });
  }

  if (buyingIntent.score === 0 && businessPainRaw < NO_PAIN_THRESHOLD) {
    penalties.push({
      reason: "No buying-intent signal and no meaningful pain signal found — likely passive/news-only chatter, not a founder opportunity.",
      points: NO_SIGNAL_PENALTY_POINTS,
    });
  }

  return penalties;
}

/* -------------------------------------------------------------------- */
/* Entry point                                                          */
/* -------------------------------------------------------------------- */

/** Number of top-contributing dimension reasons surfaced in `reasons[]`. */
const TOP_REASON_COUNT = 3;
/** Below this raw score, a dimension's reason is also surfaced in `weaknesses[]`. */
const WEAKNESS_RAW_THRESHOLD = 30;

/**
 * Composes every FOIS dimension into a single 0-100 overall score. Pure
 * function of already-computed signals (buyingIntent, competition, pricing)
 * plus the ProblemCluster's own evidence/frequency/confidence — no LLM
 * call, no re-derivation of clustering or confidence.
 */
export function computeFois(input: ComputeFoisInput): FoisBreakdown {
  const { cluster, clusterItems, rawItems, buyingIntent, competition, pricing } = input;

  const businessPain = computeBusinessPainDimension(cluster);
  const dimensions: FoisDimension[] = [
    businessPain,
    computeBuyingIntentDimension(buyingIntent),
    computeUrgencyDimension(cluster, clusterItems),
    computeFrequencyDimension(cluster),
    computeSourceDiversityDimension(cluster),
    computeCommercialPotentialDimension(cluster, buyingIntent, pricing),
    computeAutomationPotentialDimension(rawItems),
    computeCompetitionPressureDimension(competition),
    computeEvidenceStrengthDimension(cluster),
  ];

  const dimensionSum = dimensions.reduce((sum, dim) => sum + dim.weighted, 0);

  const penalties = computePenalties(cluster, buyingIntent, businessPain.raw);
  const penaltyPoints = penalties.reduce((sum, p) => sum + p.points, 0);

  const overall = clamp(Math.round(dimensionSum - penaltyPoints), 0, 100);

  const reasons = [...dimensions]
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, TOP_REASON_COUNT)
    .map((dim) => dim.reason);

  const weaknesses = [
    ...dimensions.filter((dim) => dim.raw < WEAKNESS_RAW_THRESHOLD).map((dim) => dim.reason),
    ...penalties.map((p) => `Penalty (-${p.points}): ${p.reason}`),
  ];

  return {
    overall,
    dimensions,
    reasons,
    weaknesses,
    penalties,
  };
}
