export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/** Clamps an arbitrary number into a valid confidence score in [0, 1]. */
export function clampConfidence(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.min(1, Math.max(0, score));
}

/**
 * Maps a numeric confidence score (0-1) to a coarse level. Shared by the
 * Recommendation Engine and the Decision Engine so "confidence" means the
 * same thing everywhere in the platform intelligence layer.
 */
export function classifyConfidence(score: number): ConfidenceLevel {
  const clamped = clampConfidence(score);
  if (clamped >= 0.75) return "high";
  if (clamped >= 0.4) return "medium";
  return "low";
}

export interface ConfidenceSignal {
  /** 0-1 weight of how much this signal should count toward the overall score. */
  weight: number;
  /** 0-1 how strongly this signal supports the conclusion. */
  strength: number;
}

/** Combines multiple weighted signals into a single 0-1 confidence score via a weighted average. */
export function combineConfidence(signals: ConfidenceSignal[]): number {
  if (signals.length === 0) return 0;
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = signals.reduce((sum, s) => sum + s.weight * clampConfidence(s.strength), 0);
  return clampConfidence(weightedSum / totalWeight);
}
