import type { BusinessBlueprint, BlueprintVerdict } from "./types.js";
import type { ContentCategory } from "../types.js";

// ---------------------------------------------------------------------------
// Blueprint Store
// In-memory store for generated BusinessBlueprints with filtering.
// ---------------------------------------------------------------------------

export interface BlueprintQueryOptions {
  verdict?: BlueprintVerdict;
  category?: ContentCategory;
  minConfidence?: number;
  maxResults?: number;
}

export class BlueprintStore {
  private readonly blueprints = new Map<string, BusinessBlueprint>();

  store(blueprint: BusinessBlueprint): void {
    this.blueprints.set(blueprint.opportunityId, blueprint);
  }

  get(opportunityId: string): BusinessBlueprint | undefined {
    return this.blueprints.get(opportunityId);
  }

  query(options: BlueprintQueryOptions = {}): BusinessBlueprint[] {
    const { verdict, category, minConfidence = 0, maxResults } = options;
    let results = [...this.blueprints.values()];

    if (verdict) results = results.filter((b) => b.founderRecommendation.verdict === verdict);
    if (category) results = results.filter((b) => b.category === category);
    if (minConfidence > 0) results = results.filter((b) => b.confidence >= minConfidence);

    results.sort((a, b) => b.confidence - a.confidence);
    return maxResults !== undefined ? results.slice(0, maxResults) : results;
  }

  buildNow(): BusinessBlueprint[] {
    return this.query({ verdict: "BUILD_NOW" });
  }

  buildLater(): BusinessBlueprint[] {
    return this.query({ verdict: "BUILD_LATER" });
  }

  byCategory(category: ContentCategory): BusinessBlueprint[] {
    return this.query({ category });
  }

  verdictBreakdown(): Record<BlueprintVerdict, number> {
    const breakdown: Record<BlueprintVerdict, number> = {
      BUILD_NOW: 0,
      BUILD_LATER: 0,
      MONITOR: 0,
      RESEARCH_MORE: 0,
      REJECT: 0,
    };
    for (const b of this.blueprints.values()) {
      breakdown[b.founderRecommendation.verdict]++;
    }
    return breakdown;
  }

  size(): number {
    return this.blueprints.size;
  }

  toJSON(): BusinessBlueprint[] {
    return [...this.blueprints.values()].sort((a, b) => b.confidence - a.confidence);
  }

  clear(): void {
    this.blueprints.clear();
  }
}
