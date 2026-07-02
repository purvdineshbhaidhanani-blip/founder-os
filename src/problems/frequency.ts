import type { RawResearchItem } from "../research/types.js";
import type { FrequencyStats } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeFrequency(items: RawResearchItem[], windowDays: number): FrequencyStats {
  const mentions = items.length;

  const uniqueAuthors = new Set(
    items.map((item) => item.author).filter((author): author is string => Boolean(author && author.length > 0)),
  ).size;

  const uniqueSources = new Set(items.map((item) => item.sourceId)).size;

  const engagementTotal = items.reduce((sum, item) => sum + (item.engagement ?? 0), 0);

  const datedItems = items.filter((item) => Boolean(item.publishedAt));

  if (datedItems.length < 4) {
    return {
      mentions,
      uniqueAuthors,
      uniqueSources,
      engagementTotal,
      growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null },
    };
  }

  const midpoint = Date.now() - (windowDays / 2) * DAY_MS;
  let recentHalfCount = 0;
  let earlierHalfCount = 0;
  for (const item of datedItems) {
    const publishedMs = Date.parse(item.publishedAt!);
    if (publishedMs >= midpoint) recentHalfCount += 1;
    else earlierHalfCount += 1;
  }

  const ratio = recentHalfCount / (earlierHalfCount || 1);
  const label = ratio > 1.5 ? "rising" : ratio < 0.67 ? "declining" : "stable";

  return {
    mentions,
    uniqueAuthors,
    uniqueSources,
    engagementTotal,
    growth: { label, recentHalfCount, earlierHalfCount, ratio },
  };
}
