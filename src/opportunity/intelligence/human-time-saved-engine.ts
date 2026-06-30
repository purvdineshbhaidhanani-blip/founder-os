import type { HumanTimeSavedScore, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// Human Time Saved Engine
// Estimates hours/week saved per user if the opportunity were solved.
// Knowledge worker rate: $75/hr for annualised value.
// ---------------------------------------------------------------------------

const KNOWLEDGE_WORKER_HOURLY_RATE = 75;
const WEEKS_PER_YEAR = 50;

// Each workaround kind implies minimum hours per week
const WORKAROUND_HOURS: Record<string, number> = {
  "excel": 3,
  "google-sheets": 3,
  "zapier": 1.5,
  "manual-copy-paste": 4,
  "multiple-apps": 2,
  "repeated-exports": 2,
  "custom-scripts": 5,
  "temporary-hacks": 3,
  "human-processes": 8,
};

// Signal types that imply significant time cost
const TIME_SIGNAL_HOURS: Record<string, number> = {
  "manual-process": 5,
  "repeated-task": 3,
  "time-loss": 4,
  "workflow": 2,
  "automation-request": 4,
};

export function scoreHumanTimeSaved(ctx: ScoringContext): HumanTimeSavedScore {
  const { opportunity } = ctx;

  // Start with explicit time loss from pain score
  let hoursPerWeek = opportunity.painScore.timeLost ?? 0;

  // Add workaround-implied hours (take highest single workaround to avoid double-counting)
  const workaroundHours = opportunity.workaroundsDetected
    .map((w) => WORKAROUND_HOURS[w] ?? 1)
    .sort((a, b) => b - a);

  if (workaroundHours.length > 0) {
    // Primary workaround + 50% of secondary ones (they likely overlap)
    const primary = workaroundHours[0] ?? 0;
    const secondary = workaroundHours.slice(1).reduce((s, h) => s + h * 0.5, 0);
    hoursPerWeek = Math.max(hoursPerWeek, primary + secondary);
  }

  // Add signal-type implied hours
  const signalTypes = new Set(opportunity.evidence.map((e) => e.signalType));
  let signalHours = 0;
  for (const [type, hours] of Object.entries(TIME_SIGNAL_HOURS)) {
    if (signalTypes.has(type as never)) signalHours = Math.max(signalHours, hours);
  }
  hoursPerWeek = Math.max(hoursPerWeek, signalHours * 0.5); // conservative blend

  // Cap at 40h/week (full-time equivalent)
  hoursPerWeek = Math.min(40, Math.max(0, hoursPerWeek));

  // 0–1 score: 40+ hrs = 1.0
  const score = Math.min(1, hoursPerWeek / 20); // 20h/week = 1.0 (half FTE)

  // Annualised value per user
  const annualisedValueUSD = Math.round(hoursPerWeek * KNOWLEDGE_WORKER_HOURLY_RATE * WEEKS_PER_YEAR);

  return { score, estimatedHoursPerWeekPerUser: Math.round(hoursPerWeek * 10) / 10, annualisedValueUSD };
}
