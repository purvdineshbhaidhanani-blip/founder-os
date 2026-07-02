import type { RawResearchItem } from "./types.js";

/** Jaccard-style keyword overlap threshold above which two items are considered near-duplicate titles. */
const TITLE_OVERLAP_THRESHOLD = 0.7;

/** Mirrors engine.ts's aggregateOpportunities keyword extraction so both stay consistent. */
function keywordsOf(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

/** Mirrors engine.ts's aggregateOpportunities overlap ratio (intersection over smaller set size). */
function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const word of a) if (b.has(word)) overlap += 1;
  const minSize = Math.min(a.size, b.size) || 1;
  return overlap / minSize;
}

/**
 * Deduplicates raw research items in two passes:
 *  1. Exact URL match — keep the first occurrence, drop exact URL duplicates.
 *  2. Near-identical title merge — items whose titles share >=70% keyword
 *     overlap (Jaccard over words longer than 3 chars) are merged, keeping
 *     the one with higher `engagement` (or the first-seen item when
 *     engagement is tied or absent).
 *
 * Pure function — no side effects, safe to unit test directly.
 */
export function dedupeItems(items: RawResearchItem[]): RawResearchItem[] {
  // Pass 1: exact URL dedup, keep first occurrence.
  const seenUrls = new Set<string>();
  const urlDeduped: RawResearchItem[] = [];
  for (const item of items) {
    if (seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    urlDeduped.push(item);
  }

  // Pass 2: near-identical title merge, keep higher-engagement item.
  const kept: Array<{ item: RawResearchItem; keywords: Set<string> }> = [];

  for (const item of urlDeduped) {
    const itemKeywords = keywordsOf(item.title);
    let matchIndex = -1;

    for (let i = 0; i < kept.length; i += 1) {
      const candidate = kept[i];
      if (!candidate) continue;
      if (overlapRatio(itemKeywords, candidate.keywords) >= TITLE_OVERLAP_THRESHOLD) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1) {
      kept.push({ item, keywords: itemKeywords });
      continue;
    }

    const existing = kept[matchIndex];
    if (!existing) continue;
    const existingEngagement = existing.item.engagement ?? 0;
    const newEngagement = item.engagement ?? 0;
    if (newEngagement > existingEngagement) {
      kept[matchIndex] = { item, keywords: itemKeywords };
    }
    // Otherwise keep the existing (first-seen) item on tie or lower engagement.
  }

  return kept.map((entry) => entry.item);
}
