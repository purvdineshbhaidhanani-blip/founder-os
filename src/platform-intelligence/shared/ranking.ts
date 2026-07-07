export interface Rankable {
  priority: number;
}

/**
 * Stable descending sort by `priority`. Shared by the Recommendation Engine
 * and the Optimization Engine so "what order do we show these in" is
 * computed the same way everywhere, instead of each module writing its own
 * comparator.
 */
export function rankByPriority<T extends Rankable>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.priority - a.item.priority || a.index - b.index)
    .map(({ item }) => item);
}
