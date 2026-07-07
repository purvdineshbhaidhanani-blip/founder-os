import { clampConfidence, classifyConfidence } from "../shared/confidence.js";
import { rankByPriority } from "../shared/ranking.js";
import { buildExplanation } from "./explanation.js";
import type { Recommendation, RecommendationContext, RecommendationSource } from "./types.js";

let counter = 0;
function generateRecommendationId(): string {
  counter += 1;
  return `rec_${Date.now()}_${counter}`;
}

function scoreDraftConfidence(factors: { weight: number }[]): number {
  if (factors.length === 0) return 0.5;
  return clampConfidence(factors.reduce((sum, f) => sum + f.weight, 0) / factors.length);
}

/**
 * Aggregates one or more `RecommendationSource`s (rule-based, AI-powered, or
 * custom), scores each draft's confidence from its factors, generates an
 * explanation, and returns the result ranked by priority. Callers never
 * touch a source directly — this is the single entry point.
 */
export class RecommendationEngine {
  private readonly sources: RecommendationSource[] = [];

  constructor(sources: RecommendationSource[] = []) {
    for (const source of sources) this.addSource(source);
  }

  addSource(source: RecommendationSource): void {
    this.sources.push(source);
  }

  removeSource(id: string): void {
    const index = this.sources.findIndex((s) => s.id === id);
    if (index >= 0) this.sources.splice(index, 1);
  }

  async generate(context: RecommendationContext): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const source of this.sources) {
      const drafts = await source.generate(context);
      for (const draft of drafts) {
        const confidence = scoreDraftConfidence(draft.factors);
        recommendations.push({
          id: generateRecommendationId(),
          title: draft.title,
          description: draft.description,
          sourceType: source.type,
          sourceId: source.id,
          confidence,
          confidenceLevel: classifyConfidence(confidence),
          factors: draft.factors,
          explanation: buildExplanation(draft.factors),
          priority: confidence,
        });
      }
    }

    return rankByPriority(recommendations);
  }
}
