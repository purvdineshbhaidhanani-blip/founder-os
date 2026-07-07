import type { ConfidenceLevel } from "../shared/confidence.js";
import type { Rankable } from "../shared/ranking.js";
import type { PerformanceSignal } from "../diagnostics/types.js";

export const OPTIMIZATION_CATEGORIES = ["module-selection", "performance", "cost", "simplification"] as const;
export type OptimizationCategory = (typeof OPTIMIZATION_CATEGORIES)[number];

export const OPTIMIZATION_IMPACTS = ["low", "medium", "high"] as const;
export type OptimizationImpact = (typeof OPTIMIZATION_IMPACTS)[number];

export interface OptimizationDraft {
  category: OptimizationCategory;
  title: string;
  description: string;
  impact: OptimizationImpact;
  /** 0-1. Defaults to 0.6 if omitted. */
  confidence?: number;
}

export interface OptimizationSuggestion extends Rankable {
  id: string;
  category: OptimizationCategory;
  title: string;
  description: string;
  impact: OptimizationImpact;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
}

export interface OptimizableModule {
  id: string;
  category?: string;
  dependsOn?: string[];
}

/** Structural shape any module registry satisfies — matches the Loop 3 `ModuleRegistry` and the Intelligence Registry without importing either. */
export interface OptimizableModuleRegistry {
  list(): OptimizableModule[];
  enabledModules(): OptimizableModule[];
  isEnabled(id: string): boolean;
}

export interface CostSignal {
  label: string;
  monthlyCostUsd: number;
  threshold: number;
}

export interface OptimizationContext {
  moduleRegistry?: OptimizableModuleRegistry;
  /** Module ids the product explicitly requires (e.g. from `resolveEffectiveModules`) — enabled modules outside this set are candidates for review. */
  requiredModuleIds?: string[];
  performanceSignals?: PerformanceSignal[];
  costSignals?: CostSignal[];
  /** Enabled-module count above which simplification is suggested. Defaults to 8. */
  simplificationThreshold?: number;
}

export type OptimizationAnalyzer = (context: OptimizationContext) => OptimizationDraft[] | Promise<OptimizationDraft[]>;
