import type { FreshnessScore, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// Freshness Engine
// Recent problems are more actionable. Older problems with high engagement
// still indicate persistent pain (slight bonus).
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

function ageToDays(timestamp: string, nowMs: number): number {
  return Math.max(0, (nowMs - Date.parse(timestamp)) / MS_PER_DAY);
}

function ageScore(days: number): number {
  if (days <= 30) return 1.0;
  if (days <= 90) return 0.85;
  if (days <= 180) return 0.65;
  if (days <= 365) return 0.45;
  if (days <= 730) return 0.25;
  return 0.10;
}

export function scoreFreshness(ctx: ScoringContext): FreshnessScore {
  const { opportunity, nowMs } = ctx;
  const evidenceItems = opportunity.evidence;

  if (evidenceItems.length === 0) {
    // Fall back to opportunity creation time
    const days = ageToDays(opportunity.createdAt, nowMs);
    return { score: ageScore(days), oldestEvidenceDays: days, newestEvidenceDays: days };
  }

  // Collect ages from evidence; use source item timestamps where possible
  // Evidence has no direct timestamp — use opportunity updatedAt as proxy for latest
  // and createdAt for oldest. Real timestamps come from CollectedItem but are not
  // carried through to OpportunityEvidence in Phase 1, so we use opportunity dates.
  const oldestDays = ageToDays(opportunity.createdAt, nowMs);
  const newestDays = ageToDays(opportunity.updatedAt, nowMs);

  // Score each evidence item: weight newer items more
  // Without individual timestamps, use a blend of newest/oldest
  const avgDays = (oldestDays + newestDays) / 2;
  let baseScore = ageScore(avgDays);

  // High engagement on older evidence → persistent pain → slight bonus
  const avgEngagement =
    evidenceItems.reduce((s, e) => s + (e.engagement.votes ?? 0) + (e.engagement.replies ?? 0), 0) /
    evidenceItems.length;
  if (avgDays > 90 && avgEngagement > 20) {
    baseScore = Math.min(1, baseScore + 0.1);
  }

  return { score: baseScore, oldestEvidenceDays: oldestDays, newestEvidenceDays: newestDays };
}
