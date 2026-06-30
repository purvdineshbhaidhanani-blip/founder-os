import type { ExistingSolutionScore, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// Existing Solution Intelligence Engine
// Score: 1 = no adequate solution (maximum opportunity gap)
//        0 = already perfectly solved
// High score → existing tools fail → opportunity exists.
// ---------------------------------------------------------------------------

// Language patterns indicating existing solutions are failing
const SOLUTION_FAILURE_PATTERNS: Array<{ label: string; re: RegExp; weight: number }> = [
  { label: "workaround-required", re: /\b(workaround|work around|had to use|using .* instead|switched to|manually)\b/i, weight: 0.8 },
  { label: "tool-failure", re: /\b(doesn't (work|support|do)|can't (do|handle|support|integrate)|broken|bug|missing)\b/i, weight: 0.7 },
  { label: "no-alternative", re: /\b(no (good |)(alternative|option|solution|tool)|nothing (exists?|works?|available)|couldn't find)\b/i, weight: 0.9 },
  { label: "switching-from", re: /\b(switching (away )?from|replacing|migrating (away )?from|dropped|abandoned)\b/i, weight: 0.8 },
  { label: "paid-but-dissatisfied", re: /\b(paying .* but|subscrib(ed|ing) .* but|using .* but (it|they) (doesn't|can't|won't|fails?))\b/i, weight: 0.85 },
  { label: "partial-solution", re: /\b(almost|close but|nearly there|90% of what|not quite|kind of|sort of)\b/i, weight: 0.5 },
  { label: "custom-build", re: /\b(built (our own|my own|in.house)|developed internally|custom (built|built|solution))\b/i, weight: 0.85 },
];

// Language indicating solution IS adequate (lower opportunity score)
const SOLUTION_ADEQUATE_PATTERNS: Array<RegExp> = [
  /\b(already solved|fully automated|works perfectly|great solution|love (this |the )?product|recommended|best in class)\b/i,
  /\b(no complaints|very happy|solved this problem|finally (works?|fixed))\b/i,
];

export function scoreExistingSolution(ctx: ScoringContext): ExistingSolutionScore {
  const { opportunity, allText } = ctx;
  const solutionFailureSignals: string[] = [];
  let failureScore = 0;

  // Workaround presence = direct evidence solutions fail
  const workaroundBonus = Math.min(0.4, opportunity.workaroundsDetected.length * 0.1);

  // Scan evidence quotes for failure language
  for (const { label, re, weight } of SOLUTION_FAILURE_PATTERNS) {
    if (re.test(allText)) {
      solutionFailureSignals.push(label);
      failureScore += weight;
    }
  }

  // Check for adequacy signals (reduce score)
  let adequacyPenalty = 0;
  for (const re of SOLUTION_ADEQUATE_PATTERNS) {
    if (re.test(allText)) adequacyPenalty += 0.3;
  }

  // Signal types that indicate solutions are failing
  const FAILURE_SIGNAL_TYPES = new Set(["workaround", "integration-pain", "missing-feature", "api-gap"]);
  const failingSignalFraction =
    opportunity.evidence.filter((e) => FAILURE_SIGNAL_TYPES.has(e.signalType)).length /
    Math.max(1, opportunity.evidence.length);

  // Combine
  let score = workaroundBonus +
    Math.min(0.5, failureScore / SOLUTION_FAILURE_PATTERNS.length) +
    failingSignalFraction * 0.3 -
    adequacyPenalty;

  score = Math.max(0, Math.min(1, score));

  return {
    score,
    workaroundCount: opportunity.workaroundsDetected.length,
    solutionFailureSignals,
  };
}
