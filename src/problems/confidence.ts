import type { ClusterConfidence, ClusterEvidence, FrequencyStats } from "./types.js";

/**
 * Deterministic confidence scoring. Mirrors the codebase's existing
 * RealityGuard philosophy (src/intelligence/reality-guard.ts) of requiring
 * multiple primary sources before allowing high confidence: single-source
 * evidence is inherently weak (one loud voice != a validated problem), so
 * the band is force-capped at "low" regardless of the numeric score when
 * uniqueSources < 2.
 *
 * Loop 5 additive extension: two OPTIONAL parameters, `evidenceQuality` and
 * `duplicateRatio`, let callers (currently only `problems/engine.ts`) feed
 * in the Part 3 (evidence-quality.ts) and Part 4 (near-duplicate.ts) signals
 * without changing the function's meaning for any existing 2-arg caller.
 * Both default to a value that makes the additive terms a no-op:
 *   - evidenceQuality defaults to 0.5 (the exact midpoint of its own [0,1]
 *     range), so its adjustment term evaluates to 0 when omitted.
 *   - duplicateRatio defaults to 0 (no known duplicates), so its penalty
 *     term evaluates to 0 when omitted.
 * Net effect: `computeClusterConfidence(evidence, frequency)` called with no
 * 3rd/4th arg produces EXACTLY the same score as before this change.
 */

/** Neutral default for `evidenceQuality` when the caller doesn't supply one — the adjustment term is 0 at this value. */
const EVIDENCE_QUALITY_DEFAULT = 0.5;
/** Neutral default for `duplicateRatio` when the caller doesn't supply one — the penalty term is 0 at this value. */
const DUPLICATE_RATIO_DEFAULT = 0;

/**
 * Maximum score adjustment (+/-) contributed by evidenceQuality, reached at
 * evidenceQuality=1 (full bonus) or evidenceQuality=0 (full penalty). The
 * adjustment scales linearly around the EVIDENCE_QUALITY_DEFAULT midpoint:
 *   adjustment = (evidenceQuality - 0.5) * 2 * EVIDENCE_QUALITY_MAX_ADJUSTMENT
 */
const EVIDENCE_QUALITY_MAX_ADJUSTMENT = 0.15;

/**
 * Maximum score PENALTY contributed by duplicateRatio, reached at
 * duplicateRatio=1 (evidence is entirely near-duplicate content):
 *   penalty = duplicateRatio * DUPLICATE_RATIO_MAX_PENALTY
 * More duplicates in the raw evidence count means less trust that the raw
 * count reflects independent corroboration.
 */
const DUPLICATE_RATIO_MAX_PENALTY = 0.3;

export function computeClusterConfidence(
  evidence: ClusterEvidence,
  frequency: FrequencyStats,
  evidenceQuality?: number,
  duplicateRatio?: number,
): ClusterConfidence {
  const hasEvidenceQuality = evidenceQuality !== undefined;
  const hasDuplicateRatio = duplicateRatio !== undefined;
  const resolvedEvidenceQuality = evidenceQuality ?? EVIDENCE_QUALITY_DEFAULT;
  const resolvedDuplicateRatio = duplicateRatio ?? DUPLICATE_RATIO_DEFAULT;

  const baseScore = Math.min(1, evidence.evidenceCount / 10);
  const sourceDiversityBonus = Math.min(0.3, frequency.uniqueSources * 0.1);
  const authorDiversityBonus = Math.min(0.2, frequency.uniqueAuthors * 0.05);
  const rawScore = Math.min(1, baseScore * 0.5 + sourceDiversityBonus + authorDiversityBonus);

  const evidenceQualityAdjustment = (resolvedEvidenceQuality - EVIDENCE_QUALITY_DEFAULT) * 2 * EVIDENCE_QUALITY_MAX_ADJUSTMENT;
  const duplicatePenalty = resolvedDuplicateRatio * DUPLICATE_RATIO_MAX_PENALTY;
  const score = Math.max(0, Math.min(1, rawScore + evidenceQualityAdjustment - duplicatePenalty));

  const singleSourceForced = frequency.uniqueSources < 2;
  let band: ClusterConfidence["band"];
  if (singleSourceForced) {
    band = "low";
  } else if (score >= 0.7) {
    band = "high";
  } else if (score >= 0.4) {
    band = "medium";
  } else {
    band = "low";
  }

  let explanation =
    `${evidence.evidenceCount} mentions across ${frequency.uniqueSources} source(s) by ` +
    `${frequency.uniqueAuthors} unique author(s) -> ${band} confidence (score ${score.toFixed(2)}).`;
  if (singleSourceForced) {
    explanation += " Single-source evidence capped at low confidence.";
  }

  // Richer explanation (Part 6): only appended when a caller actually
  // supplied evidenceQuality and/or duplicateRatio (i.e. engine.ts's Part 8
  // wiring), so every pre-existing 2-arg call site's explanation string is
  // byte-for-byte unchanged.
  if (hasEvidenceQuality || hasDuplicateRatio) {
    const sourceNames = Object.keys(evidence.sourceBreakdown).sort().join(", ") || "none";
    // Reconstructed (not separately passed) approximate duplicate count —
    // the authoritative raw count lives on
    // ProblemCluster.duplicateAdjustedEvidenceCount (engine.ts), computed
    // directly from near-duplicate.ts; this is a real, deterministic
    // derivation from the actual duplicateRatio/evidenceCount inputs, not a
    // fabricated number.
    const approxDuplicateCount = Math.round(resolvedDuplicateRatio * evidence.evidenceCount);
    explanation +=
      ` Sources: ${sourceNames}. Evidence quality ${resolvedEvidenceQuality.toFixed(2)}` +
      (approxDuplicateCount > 0
        ? `, ~${approxDuplicateCount} near-duplicate(s) discounted (duplicateRatio ${resolvedDuplicateRatio.toFixed(2)}).`
        : ", no near-duplicates discounted.");
  }

  return { band, score, explanation };
}
