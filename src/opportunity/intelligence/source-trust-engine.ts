import type { CollectorSource } from "../types.js";
import type { SourceTrustScore, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// Source Trust Engine
// Professional review sites with verified buyers → highest trust.
// Entertainment / general social → lowest trust.
// ---------------------------------------------------------------------------

// Base trust per source (empirically ordered by signal quality for B2B problems)
const SOURCE_BASE_TRUST: Record<CollectorSource, number> = {
  "g2": 0.92,
  "capterra": 0.90,
  "trustpilot": 0.82,
  "github-issues": 0.88,
  "github-discussions": 0.84,
  "stackoverflow": 0.83,
  "professional-forums": 0.78,
  "professional-blogs": 0.75,
  "hacker-news": 0.74,
  "product-hunt": 0.68,
  "apple-store": 0.62,
  "google-play": 0.60,
  "reddit": 0.55,
  "youtube": 0.42,
};

export function scoreSourceTrust(ctx: ScoringContext): SourceTrustScore {
  const { opportunity } = ctx;
  const perSource: Record<string, number> = {};

  for (const src of opportunity.sources) {
    perSource[src] = SOURCE_BASE_TRUST[src] ?? 0.5;
  }

  if (opportunity.sources.length === 0) {
    return { score: 0, perSource };
  }

  // Weighted average: sources with higher base trust carry more weight
  const total = opportunity.sources.reduce((sum, src) => sum + (perSource[src] ?? 0.5), 0);
  const avg = total / opportunity.sources.length;

  // Bonus for cross-source validation (same problem appearing on multiple distinct source types)
  const uniqueCategories = categorizeSources(opportunity.sources);
  const diversityBonus = Math.min(0.1, (uniqueCategories - 1) * 0.05);

  const score = Math.min(1, avg + diversityBonus);
  return { score, perSource };
}

function categorizeSources(sources: CollectorSource[]): number {
  const CATEGORIES: Record<CollectorSource, string> = {
    "g2": "review",
    "capterra": "review",
    "trustpilot": "review",
    "github-issues": "developer",
    "github-discussions": "developer",
    "stackoverflow": "developer",
    "hacker-news": "tech-community",
    "product-hunt": "tech-community",
    "reddit": "social",
    "youtube": "social",
    "apple-store": "app-store",
    "google-play": "app-store",
    "professional-forums": "professional",
    "professional-blogs": "professional",
  };
  return new Set(sources.map((s) => CATEGORIES[s] ?? "other")).size;
}
