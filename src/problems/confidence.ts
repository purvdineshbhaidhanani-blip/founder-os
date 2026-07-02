import type { ClusterConfidence, ClusterEvidence, FrequencyStats } from "./types.js";

/**
 * Deterministic confidence scoring. Mirrors the codebase's existing
 * RealityGuard philosophy (src/intelligence/reality-guard.ts) of requiring
 * multiple primary sources before allowing high confidence: single-source
 * evidence is inherently weak (one loud voice != a validated problem), so
 * the band is force-capped at "low" regardless of the numeric score when
 * uniqueSources < 2.
 */
export function computeClusterConfidence(evidence: ClusterEvidence, frequency: FrequencyStats): ClusterConfidence {
  const baseScore = Math.min(1, evidence.evidenceCount / 10);
  const sourceDiversityBonus = Math.min(0.3, frequency.uniqueSources * 0.1);
  const authorDiversityBonus = Math.min(0.2, frequency.uniqueAuthors * 0.05);
  const score = Math.min(1, baseScore * 0.5 + sourceDiversityBonus + authorDiversityBonus);

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

  return { band, score, explanation };
}
