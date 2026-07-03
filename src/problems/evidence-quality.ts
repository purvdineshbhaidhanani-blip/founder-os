import { classifyItem } from "./detector.js";
import { NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE } from "./noise-filter.js";
import type { RawResearchItem } from "../research/types.js";

/**
 * Evidence quality — a cheap, deterministic 0-1 composite score per item
 * built ONLY from the item's own real fields (never fabricated). Used to
 * make cluster confidence (confidence.ts) sensitive to WHETHER the evidence
 * is substantive, not just how many items exist.
 *
 * Four heuristics, each independently 0-1, combined with fixed named
 * weights that sum to exactly 1.0 (asserted in tests/problems/evidence-
 * quality.test.ts):
 *   - specificity        (does the item have substantive body/snippet text?)
 *   - engagement         (does the item carry real engagement signal?)
 *   - source credibility (a small fixed per-sourceId weight table)
 *   - problem clarity    (does the item match a real, confident category?)
 */

/**
 * An item's body+snippet text at or above this many words is treated as
 * "fully specific" (component = 1); shorter text is scaled linearly
 * (wordCount / threshold), never penalized below 0. A one-line title-only
 * post ("this is broken") carries far less diagnostic detail than a
 * multi-sentence description of what broke and how.
 */
const SPECIFICITY_WORD_COUNT_THRESHOLD = 15;

/**
 * Engagement (upvotes/reactions/etc, from `item.engagement`) is normalized
 * by dividing by this cap and clamping to [0, 1]. Chosen as a round,
 * moderate number: an item with 50+ engagement is already clearly
 * resonating with an audience, so additional engagement above this doesn't
 * need to keep increasing the score. Items with no engagement data get 0 —
 * never a fabricated "average" value.
 */
const ENGAGEMENT_NORMALIZATION_CAP = 50;

/**
 * Small, fixed per-source credibility weight table. Reasoned defaults (not
 * empirically tuned against labeled outcome data):
 *   - github-issue / stackexchange: first-person, technical, verifiable
 *     problem reports written by the person experiencing the issue -> high.
 *   - hackernews: threaded discussion among a technical audience adds
 *     context/corroboration -> above average.
 *   - reddit: first-person but highly variable quality/moderation -> average.
 *   - producthunt: mixed marketing-launch and genuine feedback -> below average.
 *   - rss: often a syndicated third-party summary, not first-person -> low.
 * Any sourceId not in this table gets `DEFAULT_SOURCE_CREDIBILITY_WEIGHT`
 * (a neutral default — an unknown source is neither trusted nor distrusted
 * without evidence either way).
 */
const SOURCE_CREDIBILITY_WEIGHTS: Record<string, number> = {
  "github-issue": 0.9,
  stackexchange: 0.8,
  hackernews: 0.75,
  reddit: 0.65,
  producthunt: 0.6,
  rss: 0.4,
};
const DEFAULT_SOURCE_CREDIBILITY_WEIGHT = 0.5;

/**
 * Problem-clarity component: 1 if the item independently matches a real
 * (non-"other") category at confidence >= this threshold, else 0. Reuses
 * `NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE` from noise-filter.ts (both
 * express the exact same underlying idea — "this item carries a clear,
 * confident problem signal" — so the codebase has one named constant for
 * it, not two independently-tuned magic numbers).
 */
const PROBLEM_CLARITY_MIN_CONFIDENCE = NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE;

/** Named weights, summing to exactly 1.0 (asserted in the test file). */
export const EVIDENCE_QUALITY_WEIGHTS = {
  specificity: 0.25,
  engagement: 0.25,
  sourceCredibility: 0.25,
  problemClarity: 0.25,
} as const;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

export interface EvidenceQualityResult {
  score: number;
  reasons: string[];
}

/**
 * Computes the 0-1 evidence-quality composite for a single raw item. Every
 * number cited in `reasons` comes from the item's own real fields — never
 * invented.
 */
export function computeEvidenceQuality(item: RawResearchItem): EvidenceQualityResult {
  const reasons: string[] = [];

  const bodyText = item.body ?? item.snippet ?? "";
  const words = wordCount(bodyText);
  const specificity = Math.min(1, words / SPECIFICITY_WORD_COUNT_THRESHOLD);
  reasons.push(
    `specificity: ${words} word(s) of body/snippet text -> min(1, ${words}/${SPECIFICITY_WORD_COUNT_THRESHOLD}) = ${specificity.toFixed(2)}.`,
  );

  const engagementRaw = item.engagement ?? 0;
  const engagement = Math.max(0, Math.min(1, engagementRaw / ENGAGEMENT_NORMALIZATION_CAP));
  reasons.push(
    `engagement: ${engagementRaw} -> min(1, ${engagementRaw}/${ENGAGEMENT_NORMALIZATION_CAP}) = ${engagement.toFixed(2)}.`,
  );

  const sourceCredibility = SOURCE_CREDIBILITY_WEIGHTS[item.sourceId] ?? DEFAULT_SOURCE_CREDIBILITY_WEIGHT;
  reasons.push(
    `sourceCredibility: sourceId "${item.sourceId}" -> ${sourceCredibility.toFixed(2)}${
      SOURCE_CREDIBILITY_WEIGHTS[item.sourceId] === undefined ? " (default, unknown source)" : ""
    }.`,
  );

  const classified = classifyItem(item);
  const hasClearProblem = classified.categories.some(
    (match) => match.category !== "other" && match.confidence >= PROBLEM_CLARITY_MIN_CONFIDENCE,
  );
  const problemClarity = hasClearProblem ? 1 : 0;
  reasons.push(
    `problemClarity: ${
      hasClearProblem
        ? `matches a real category at confidence >= ${PROBLEM_CLARITY_MIN_CONFIDENCE}`
        : `no real category matched at confidence >= ${PROBLEM_CLARITY_MIN_CONFIDENCE}`
    } -> ${problemClarity}.`,
  );

  const score =
    specificity * EVIDENCE_QUALITY_WEIGHTS.specificity +
    engagement * EVIDENCE_QUALITY_WEIGHTS.engagement +
    sourceCredibility * EVIDENCE_QUALITY_WEIGHTS.sourceCredibility +
    problemClarity * EVIDENCE_QUALITY_WEIGHTS.problemClarity;

  reasons.push(`composite score = ${score.toFixed(3)} (weights: ${JSON.stringify(EVIDENCE_QUALITY_WEIGHTS)}).`);

  return { score, reasons };
}

/**
 * Cluster-level aggregation: the unweighted mean of `computeEvidenceQuality`
 * across `items`. Returns 0 for an empty list — an honest "no evidence
 * measured" rather than a fabricated neutral midpoint.
 */
export function computeAverageEvidenceQuality(items: RawResearchItem[]): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + computeEvidenceQuality(item).score, 0);
  return total / items.length;
}
