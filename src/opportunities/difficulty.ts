import type { RawResearchItem } from "../research/types.js";
import type { BuildDifficultyResult, BuildDifficultyTier } from "./types.js";

/**
 * Fixed keyword list for build-difficulty heuristics. Substring matching
 * against the combined evidence blob — a heuristic estimate, not an
 * engineering estimate; no LLM call.
 */
const DIFFICULTY_SIGNALS: string[] = [
  "api integration",
  "real-time",
  "machine learning",
  "ai-powered",
  "compliance",
  "enterprise",
  "payment processing",
  "multi-tenant",
  "third-party integration",
  "mobile app",
  "native app",
  "encryption",
  "scalab",
];

function blobOf(item: RawResearchItem): string {
  return `${item.title} ${item.body ?? ""}`.toLowerCase();
}

export function estimateBuildDifficulty(items: RawResearchItem[]): BuildDifficultyResult {
  const combinedBlob = items.map(blobOf).join(" ");
  const matchedSignals = DIFFICULTY_SIGNALS.filter((signal) => combinedBlob.includes(signal));
  const matchCount = matchedSignals.length;

  let tier: BuildDifficultyTier;
  if (matchCount >= 3) tier = "high";
  else if (matchCount >= 1) tier = "medium";
  else tier = "low";

  return {
    tier,
    matchedSignals,
    explanation: `Build difficulty is a heuristic estimate, not an engineering estimate, based on keyword signals found in evidence: ${
      matchedSignals.join(", ") || "none"
    }. Tier: ${tier}.`,
  };
}
