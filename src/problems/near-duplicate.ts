import { extractConcept } from "./concept.js";
import type { RawResearchItem } from "../research/types.js";
import type { ProblemCategory } from "./types.js";

/**
 * Near-duplicate detection at the BODY-TEXT level, operating on classified
 * items within a single ProblemCategory. Complementary to
 * `src/research/dedup.ts`, which runs once, upstream, on ALL raw items
 * before relevance filtering/aggregation, and only catches exact-URL and
 * near-identical-TITLE duplicates. That gap: a GitHub issue and a Reddit
 * thread reporting the identical underlying complaint, with completely
 * different titles, would sail straight through `dedup.ts` and inflate a
 * cluster's evidence count as if it were two independent signals.
 *
 * `src/problems/` is deliberately self-contained (per this loop's file-
 * scope boundary) — this module does NOT import from `src/research/dedup.ts`
 * — but reimplements the SAME token-overlap ("Jaccard-style") technique
 * locally for consistency:
 *   - lowercase, strip non-alphanumerics, split on whitespace
 *   - keep tokens longer than a fixed minimum length
 *   - similarity = |intersection| / min(|A|, |B|) (an overlap-coefficient,
 *     labeled "Jaccard-style" here exactly as `research/dedup.ts` labels its
 *     own, structurally identical, title-overlap formula)
 */

/**
 * Overlap ratio at/above which two items' BODY text is considered a near-
 * duplicate. Set slightly higher than `research/dedup.ts`'s 0.7 title
 * threshold (0.75) because body text is longer and noisier than a title, so
 * a stronger overlap is required to be confident it's the same underlying
 * report and not just two posts sharing common domain vocabulary.
 */
const BODY_OVERLAP_DUPLICATE_THRESHOLD = 0.75;

/** Tokens this short are treated as stopword-like noise and excluded, mirroring research/dedup.ts's title tokenizer. */
const MIN_TOKEN_LENGTH = 3;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > MIN_TOKEN_LENGTH),
  );
}

/**
 * Intersection-over-min-size overlap ratio — same formula as
 * research/dedup.ts's `overlapRatio` (also there labeled "Jaccard-style"
 * despite technically being an overlap coefficient, not a true Jaccard
 * index; this module intentionally mirrors that exact behavior/naming for
 * consistency across the codebase's two duplicate detectors). Items with NO
 * tokens (e.g. no body/snippet text at all) never match anything, including
 * each other — an absence of text is not evidence of similarity.
 */
function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  const minSize = Math.min(a.size, b.size) || 1;
  return overlap / minSize;
}

function bodyTextOf(item: RawResearchItem): string {
  return item.body ?? item.snippet ?? "";
}

export interface NearDuplicateResult {
  /** Every item's group. A group of length 1 means that item is unique (no near-duplicate found). */
  groups: RawResearchItem[][];
  /** Sum of (group.length - 1) across all groups — the number of "extra", non-representative duplicate items. */
  duplicateCount: number;
}

/**
 * Groups items whose BODY-TEXT token overlap exceeds
 * `BODY_OVERLAP_DUPLICATE_THRESHOLD`. Single-pass, greedy: each item is
 * compared against the first token-set representative of each existing
 * group (in group-creation order) and joins the first group it matches, or
 * starts a new one — same greedy-clustering shape as
 * research/dedup.ts's near-title-merge pass.
 */
export function findNearDuplicates(items: RawResearchItem[]): NearDuplicateResult {
  const groups: Array<{ items: RawResearchItem[]; tokens: Set<string> }> = [];

  for (const item of items) {
    const tokens = tokenize(bodyTextOf(item));
    let matchIndex = -1;

    if (tokens.size > 0) {
      for (let i = 0; i < groups.length; i += 1) {
        const candidate = groups[i];
        if (!candidate) continue;
        if (overlapRatio(tokens, candidate.tokens) >= BODY_OVERLAP_DUPLICATE_THRESHOLD) {
          matchIndex = i;
          break;
        }
      }
    }

    if (matchIndex === -1) {
      groups.push({ items: [item], tokens });
    } else {
      groups[matchIndex]!.items.push(item);
    }
  }

  const groupArrays = groups.map((g) => g.items);
  const duplicateCount = groupArrays.reduce((sum, g) => sum + Math.max(0, g.length - 1), 0);

  return { groups: groupArrays, duplicateCount };
}

/**
 * Keeps exactly one representative item per near-duplicate GROUP (already
 * computed): the earliest-`publishedAt` item if any group member carries a
 * publish date, else the first-encountered item. Extracted from
 * `dedupeForEvidence` (Loop 6) so a caller that already has `groups` in hand
 * (e.g. engine.ts, which also needs them for Part E's semantic/cross-source
 * duplicate metrics) can reuse them here too, instead of calling
 * `findNearDuplicates` a second time. `dedupeForEvidence` below is now a
 * thin, behavior-identical wrapper over this function.
 */
export function dedupeGroups(groups: RawResearchItem[][]): RawResearchItem[] {
  return groups.map((group) => {
    if (group.length === 1) return group[0]!;
    const dated = group.filter((item) => Boolean(item.publishedAt));
    if (dated.length === 0) return group[0]!;
    let earliest = dated[0]!;
    for (const item of dated) {
      if (Date.parse(item.publishedAt!) < Date.parse(earliest.publishedAt!)) earliest = item;
    }
    return earliest;
  });
}

/**
 * Keeps exactly one representative item per near-duplicate group. Used to
 * compute a duplicate-adjusted evidence count for confidence purposes — this
 * does NOT mutate or replace `ClusterEvidence.evidenceCount` (which keeps
 * its existing "raw count" meaning for backward compatibility); the adjusted
 * count is exposed separately on `ProblemCluster.duplicateAdjustedEvidenceCount`.
 */
export function dedupeForEvidence(items: RawResearchItem[]): RawResearchItem[] {
  const { groups } = findNearDuplicates(items);
  return dedupeGroups(groups);
}

/**
 * Loop 6, Part E — duplicate intelligence, built ENTIRELY as post-processing
 * over `findNearDuplicates`'s existing output. No new O(n²) pass: a near-
 * duplicate group already establishes "high body-text overlap" for its
 * members by construction (that's what put them in the same group), so the
 * only new work here is a cheap O(n) scan of the (already small) `groups`
 * array itself.
 */

export interface SemanticDuplicateGroup {
  /** The concept id (concept.ts) every item in this group maps to. */
  conceptId: string;
  items: RawResearchItem[];
}

/**
 * A near-duplicate GROUP (body-text overlap already established by group
 * membership) is additionally flagged "semantic" when EVERY member maps to
 * the SAME concept.ts concept id for `category` — a doubly-confirmed
 * duplicate signal (same wording AND same underlying concept), distinct from
 * (and stronger than) a plain near-identical-text group whose members might
 * coincidentally not share a concept match. Groups of size 1 (no near-
 * duplicate at all) and groups where members match no concept, or map to
 * DIFFERENT concepts, are never flagged.
 *
 * Takes the ALREADY-COMPUTED `groups` from `findNearDuplicates` (not raw
 * items) so callers that already called `findNearDuplicates` once (e.g.
 * engine.ts) never pay for a second O(n²) near-duplicate pass — see
 * `findSemanticDuplicates` below for a raw-items convenience wrapper used by
 * direct unit tests.
 */
export function findSemanticDuplicateGroups(groups: RawResearchItem[][], category: ProblemCategory): SemanticDuplicateGroup[] {
  const semanticGroups: SemanticDuplicateGroup[] = [];
  for (const group of groups) {
    if (group.length < 2) continue;
    const conceptIds = group.map((item) => extractConcept(item, category)?.conceptId ?? null);
    const first = conceptIds[0]!;
    if (first !== null && conceptIds.every((id) => id === first)) {
      semanticGroups.push({ conceptId: first, items: group });
    }
  }
  return semanticGroups;
}

/**
 * Convenience wrapper for callers (e.g. direct unit tests) that have not
 * already computed near-duplicate groups — internally calls
 * `findNearDuplicates` once. Engine.ts does NOT use this wrapper (it already
 * has `groups` in hand from its own `findNearDuplicates` call and passes
 * them directly to `findSemanticDuplicateGroups` to avoid a redundant O(n²)
 * pass).
 */
export function findSemanticDuplicates(items: RawResearchItem[], category: ProblemCategory): SemanticDuplicateGroup[] {
  const { groups } = findNearDuplicates(items);
  return findSemanticDuplicateGroups(groups, category);
}

/**
 * Cross-source duplicate signal: counts near-duplicate GROUPS (from the
 * ALREADY-COMPUTED `groups`) that span 2+ DISTINCT `sourceId`s — the same
 * underlying complaint independently surfacing on more than one platform,
 * which is stronger corroboration than the same person/source reposting the
 * identical text once. Takes `groups` directly (not raw items) for the same
 * no-redundant-O(n²)-pass reason as `findSemanticDuplicateGroups` above.
 */
export function countCrossSourceDuplicateGroups(groups: RawResearchItem[][]): number {
  return groups.filter((group) => group.length >= 2 && new Set(group.map((item) => item.sourceId)).size >= 2).length;
}

/** Convenience wrapper mirroring `findSemanticDuplicates` — internally calls `findNearDuplicates` once. Not used by engine.ts (see above). */
export function countCrossSourceDuplicates(items: RawResearchItem[]): number {
  const { groups } = findNearDuplicates(items);
  return countCrossSourceDuplicateGroups(groups);
}
