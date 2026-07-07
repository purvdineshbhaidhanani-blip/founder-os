import type { ThresholdBand } from "./types.js";

export const DEFAULT_THRESHOLD_BANDS: ThresholdBand[] = [
  { label: "go", min: 0.7 },
  { label: "watch", min: 0.4 },
  { label: "no-go", min: 0 },
];

/** Maps a 0-1 score to the highest band whose `min` it clears. Bands are configuration, not hardcoded business logic. */
export function classifyByThreshold(score: number, bands: ThresholdBand[] = DEFAULT_THRESHOLD_BANDS): string {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  for (const band of sorted) {
    if (score >= band.min) return band.label;
  }
  return sorted[sorted.length - 1]?.label ?? "unclassified";
}
