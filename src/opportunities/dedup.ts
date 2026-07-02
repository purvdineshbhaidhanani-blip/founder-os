import type { FounderOpportunityReport } from "./types.js";

/**
 * Final, defense-in-depth dedup pass for FounderOpportunityReports.
 *
 * Loop 2's problem clustering (src/problems/) and Loop 3's opportunity
 * engine (src/opportunities/engine.ts) both do their own independent
 * grouping, so even after the Loop 4 Phase 3 trend-duplication fix
 * (ProblemCluster.trending, see src/problems/engine.ts), near-duplicate
 * opportunities can still slip through — e.g. two clusters whose evidence
 * heavily overlaps (same underlying discussion threads classified into two
 * categories), or two clusters that both surface the same named competitor.
 * This module is the safety net called by OpportunityEngine AFTER ranking
 * (computeOpportunityScore) and BEFORE the Top-10 cut, per the Loop 4 final
 * validation report's finding that duplicate-opportunity prevention needed
 * one more pass.
 *
 * Two opportunities are judged duplicates when EITHER:
 *   (a) their supportingEvidence.urls sets overlap by more than 50%
 *       (Jaccard-style intersection-over-smaller-set-size ratio — the same
 *       technique already used by src/research/dedup.ts's overlapRatio and
 *       src/research/engine.ts's aggregateOpportunities, reused here rather
 *       than inventing a new algorithm), OR
 *   (b) they share an identical (case-insensitive) top-mentioned competitor
 *       name from competition.ts's output.
 *
 * When two opportunities are judged duplicates, the one with the higher
 * `scoreBreakdown.weightedTotal` is kept and the other is DROPPED (not
 * merged) — dropping is simpler and more auditable than merging two
 * independently-computed score breakdowns into one, and matches this
 * codebase's "never invent a number" philosophy.
 *
 * NOTE: the 50% URL-overlap threshold and the exact-competitor-name-match
 * criterion are reasonable, defensible defaults, not empirically tuned
 * against real duplicate-opportunity data (no live pipeline run was
 * possible in this sandboxed environment this loop).
 */

/** See module doc: overlap ratio above which two opportunities' evidence URLs are considered near-duplicate. */
const URL_OVERLAP_DEDUP_THRESHOLD = 0.5;

/** Mirrors src/research/dedup.ts's overlapRatio (intersection over smaller-set size), applied to evidence URLs instead of title keywords. */
function urlOverlapRatio(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const url of setA) if (setB.has(url)) overlap += 1;
  const minSize = Math.min(setA.size, setB.size) || 1;
  return overlap / minSize;
}

/** The single highest-mentionCount competitor name for an opportunity, or null if none was extracted. competition.competitors is already sorted mentionCount descending (see competition.ts). */
function topCompetitorNameOf(report: FounderOpportunityReport): string | null {
  const top = report.competition.competitors[0];
  return top ? top.name.toLowerCase() : null;
}

function isDuplicate(a: FounderOpportunityReport, b: FounderOpportunityReport): boolean {
  const urlOverlap = urlOverlapRatio(a.supportingEvidence.urls, b.supportingEvidence.urls);
  if (urlOverlap > URL_OVERLAP_DEDUP_THRESHOLD) return true;

  const nameA = topCompetitorNameOf(a);
  const nameB = topCompetitorNameOf(b);
  if (nameA !== null && nameB !== null && nameA === nameB) return true;

  return false;
}

/**
 * Drops near-duplicate opportunities, keeping the higher-`weightedTotal`
 * survivor of each duplicate group. Sorts by `weightedTotal` descending
 * internally (independent of input order) so the kept survivor is always
 * deterministic and always the strongest-scored member of its group.
 * Pure function — no side effects, safe to unit test directly.
 */
export function dedupeOpportunities(
  reports: FounderOpportunityReport[],
): FounderOpportunityReport[] {
  const sorted = [...reports].sort(
    (a, b) => b.scoreBreakdown.weightedTotal - a.scoreBreakdown.weightedTotal,
  );

  const kept: FounderOpportunityReport[] = [];
  for (const candidate of sorted) {
    const alreadyKept = kept.some((existing) => isDuplicate(existing, candidate));
    if (!alreadyKept) {
      kept.push(candidate);
    }
    // else: a higher-or-equal-scored duplicate is already in `kept` (input
    // was sorted descending above), so this weaker duplicate is dropped.
  }

  return kept;
}
