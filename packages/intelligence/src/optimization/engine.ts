import { clampConfidence, classifyConfidence } from "@platform/shared";
import { rankByPriority } from "@platform/shared";
import { DEFAULT_OPTIMIZATION_ANALYZERS } from "./analyzers.js";
import type { OptimizationAnalyzer, OptimizationContext, OptimizationImpact, OptimizationSuggestion } from "./types.js";

const IMPACT_WEIGHT: Record<OptimizationImpact, number> = { low: 0.33, medium: 0.66, high: 1 };

let counter = 0;
function generateSuggestionId(): string {
  counter += 1;
  return `opt_${Date.now()}_${counter}`;
}

export interface OptimizationEngineOptions {
  analyzers?: OptimizationAnalyzer[];
}

/**
 * Analyzes platform/product configuration for better module selection,
 * performance improvements, cost optimization, and simplification
 * opportunities. Analyzers are pluggable; the four built-ins cover the
 * required categories but add nothing product-specific.
 */
export class OptimizationEngine {
  private readonly analyzers: OptimizationAnalyzer[];

  constructor(options: OptimizationEngineOptions = {}) {
    this.analyzers = options.analyzers ?? [...DEFAULT_OPTIMIZATION_ANALYZERS];
  }

  registerAnalyzer(analyzer: OptimizationAnalyzer): void {
    this.analyzers.push(analyzer);
  }

  async analyze(context: OptimizationContext): Promise<OptimizationSuggestion[]> {
    const results = await Promise.all(this.analyzers.map((analyzer) => analyzer(context)));
    const suggestions = results.flat().map((draft): OptimizationSuggestion => {
      const confidence = clampConfidence(draft.confidence ?? 0.6);
      return {
        id: generateSuggestionId(),
        category: draft.category,
        title: draft.title,
        description: draft.description,
        impact: draft.impact,
        confidence,
        confidenceLevel: classifyConfidence(confidence),
        priority: confidence * IMPACT_WEIGHT[draft.impact],
      };
    });
    return rankByPriority(suggestions);
  }
}
