import { classifyItem } from "./detector.js";
import type { RawResearchItem, ResearchSession } from "../research/types.js";
import type { ClassifiedItem, ProblemCategory } from "./types.js";

/**
 * Flattens every `opportunities[].supportingItems` in a ResearchSession into
 * one deduped list. Dedupe is by URL — the same item could theoretically
 * appear under multiple opportunity groups upstream (aggregation is a
 * simple keyword-overlap heuristic, not guaranteed disjoint), so we never
 * assume it can't.
 */
export function flattenSessionItems(session: ResearchSession): RawResearchItem[] {
  const seen = new Set<string>();
  const result: RawResearchItem[] = [];
  for (const opportunity of session.opportunities) {
    for (const item of opportunity.supportingItems) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      result.push(item);
    }
  }
  return result;
}

/**
 * Classifies every item and buckets it under every category it matched
 * (an item may appear under multiple category keys). Categories with zero
 * matching items are omitted entirely — no empty clusters.
 */
export function groupByCategory(items: RawResearchItem[]): Map<ProblemCategory, ClassifiedItem[]> {
  const groups = new Map<ProblemCategory, ClassifiedItem[]>();

  for (const item of items) {
    const classified = classifyItem(item);
    for (const match of classified.categories) {
      const existing = groups.get(match.category);
      if (existing) {
        existing.push(classified);
      } else {
        groups.set(match.category, [classified]);
      }
    }
  }

  return groups;
}
