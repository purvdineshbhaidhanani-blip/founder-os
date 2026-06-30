import type { CollectedItem } from "../types.js";

// ---------------------------------------------------------------------------
// Deduplicator — removes duplicate CollectedItems by URL, then by content hash
// ---------------------------------------------------------------------------

function contentKey(item: CollectedItem): string {
  // Normalize URL: strip trailing slash and query params that are just tracking
  const url = item.url.replace(/[?&](utm_[^&]+)/g, "").replace(/\/$/, "").toLowerCase();
  return url;
}

export interface DeduplicationResult {
  items: CollectedItem[];
  duplicatesRemoved: number;
}

export function deduplicate(items: CollectedItem[]): DeduplicationResult {
  const seen = new Set<string>();
  const unique: CollectedItem[] = [];

  for (const item of items) {
    const key = contentKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return {
    items: unique,
    duplicatesRemoved: items.length - unique.length,
  };
}

export function deduplicateAcrossSources(
  itemsBySource: Array<{ source: string; items: CollectedItem[] }>,
): CollectedItem[] {
  const all = itemsBySource.flatMap((s) => s.items);
  return deduplicate(all).items;
}
