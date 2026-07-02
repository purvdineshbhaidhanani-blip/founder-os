import type { RawResearchItem } from "../research/types.js";
import type { ClusterEvidence } from "./types.js";

export function buildClusterEvidence(items: RawResearchItem[]): ClusterEvidence {
  const sourceBreakdown: Record<string, number> = {};
  for (const item of items) {
    sourceBreakdown[item.sourceId] = (sourceBreakdown[item.sourceId] ?? 0) + 1;
  }

  const originalUrls = [...new Set(items.map((item) => item.url))];

  const engagementTotal = items.reduce((sum, item) => sum + (item.engagement ?? 0), 0);

  // Prefer engagement-ranked examples; if no item carries engagement data at
  // all, fall back to array order (first 3) rather than fabricating a ranking.
  const hasEngagementData = items.some((item) => item.engagement !== undefined && item.engagement !== null);
  const representativeExamples = hasEngagementData
    ? [...items].sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0)).slice(0, 3)
    : items.slice(0, 3);

  const datedItems = items.filter((item) => Boolean(item.publishedAt));
  let dateRange: ClusterEvidence["dateRange"] = null;
  if (datedItems.length > 0) {
    let earliest = datedItems[0]!.publishedAt!;
    let latest = datedItems[0]!.publishedAt!;
    for (const item of datedItems) {
      const publishedAt = item.publishedAt!;
      if (Date.parse(publishedAt) < Date.parse(earliest)) earliest = publishedAt;
      if (Date.parse(publishedAt) > Date.parse(latest)) latest = publishedAt;
    }
    dateRange = { earliest, latest };
  }

  return {
    evidenceCount: items.length,
    sourceBreakdown,
    originalUrls,
    representativeExamples,
    engagementTotal,
    dateRange,
  };
}
