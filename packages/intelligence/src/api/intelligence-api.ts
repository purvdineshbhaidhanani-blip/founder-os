import { AIRecommendationAssistant } from "../ai-layer/assistant.js";
import { TemplateAITextGenerator } from "../ai-layer/template-generator.js";
import type { InsightLike, RecommendationLike } from "../ai-layer/types.js";
import type { DecisionContext, DecisionFactor, DecisionHistoryFilter, DecisionRecord, DecisionRule } from "../decision/types.js";
import { DecisionEngine } from "../decision/engine.js";
import { DiagnosticsEngine } from "../diagnostics/engine.js";
import type { DiagnosticContext, DiagnosticReport } from "../diagnostics/types.js";
import { FeatureIntelligenceTracker } from "../feature-intelligence/tracker.js";
import type { FeatureSuccessCriteria } from "../feature-intelligence/types.js";
import { InsightsEngine, type InsightFilter } from "../insights/engine.js";
import type { Insight } from "../insights/types.js";
import { IntelligenceRegistry } from "../registry/registry.js";
import { OptimizationEngine } from "../optimization/engine.js";
import type { OptimizationContext, OptimizationSuggestion } from "../optimization/types.js";
import { ProductIntelligence } from "../product-intelligence/health.js";
import type { ConfigValidationResultLike, ModuleRegistryLike, ProductHealthReport } from "../product-intelligence/types.js";
import { RecommendationEngine } from "../recommendation/engine.js";
import type { Recommendation, RecommendationContext } from "../recommendation/types.js";

export interface IntelligenceAPIOptions {
  recommendationEngine?: RecommendationEngine;
  insightsEngine?: InsightsEngine;
  decisionEngine?: DecisionEngine;
  featureIntelligence?: FeatureIntelligenceTracker;
  productIntelligence?: ProductIntelligence;
  aiAssistant?: AIRecommendationAssistant;
  diagnosticsEngine?: DiagnosticsEngine;
  optimizationEngine?: OptimizationEngine;
  registry?: IntelligenceRegistry;
}

/**
 * The single entry point for every intelligence module in this loop.
 * Every dependency is injected (constructor defaults are sensible,
 * zero-config instances) — the API never constructs a concrete provider
 * itself, only wires together whatever was given to it.
 */
export class IntelligenceAPI {
  readonly recommendations: RecommendationEngine;
  readonly insights: InsightsEngine;
  readonly decisions: DecisionEngine;
  readonly features: FeatureIntelligenceTracker;
  readonly productHealth: ProductIntelligence;
  readonly ai: AIRecommendationAssistant;
  readonly diagnostics: DiagnosticsEngine;
  readonly optimization: OptimizationEngine;
  readonly registry: IntelligenceRegistry;

  constructor(options: IntelligenceAPIOptions = {}) {
    this.recommendations = options.recommendationEngine ?? new RecommendationEngine();
    this.insights = options.insightsEngine ?? new InsightsEngine();
    this.decisions = options.decisionEngine ?? new DecisionEngine();
    this.features = options.featureIntelligence ?? new FeatureIntelligenceTracker();
    this.productHealth = options.productIntelligence ?? new ProductIntelligence();
    this.ai = options.aiAssistant ?? new AIRecommendationAssistant(new TemplateAITextGenerator());
    this.diagnostics = options.diagnosticsEngine ?? new DiagnosticsEngine();
    this.optimization = options.optimizationEngine ?? new OptimizationEngine();
    this.registry = options.registry ?? IntelligenceRegistry.withBuiltins();
  }

  getRecommendations(context: RecommendationContext): Promise<Recommendation[]> {
    return this.recommendations.generate(context);
  }

  getInsights(filter?: InsightFilter): Promise<Insight[]> {
    return this.insights.collectAll(filter);
  }

  decide(context: DecisionContext, factors: DecisionFactor[], rules: DecisionRule[] = []): Promise<DecisionRecord> {
    return this.decisions.decide(context, factors, rules);
  }

  getDecisionHistory(filter?: DecisionHistoryFilter): Promise<DecisionRecord[]> {
    return this.decisions.history(filter);
  }

  recordFeatureUsage(featureId: string, subjectId: string, timestamp?: string): void {
    this.features.recordUsage(featureId, subjectId, timestamp);
  }

  getFeatureIntelligence(
    featureId: string,
    totalSubjects: number,
    criteria: FeatureSuccessCriteria = { targetAdoptionRate: 0.3 },
    retentionRate?: number,
  ) {
    return {
      summary: this.features.usageSummary(featureId),
      adoption: this.features.adoption(featureId, totalSubjects),
      successScore: this.features.successScore(featureId, totalSubjects, criteria, retentionRate),
      lifecycleStage: this.features.lifecycleStage(featureId, totalSubjects),
    };
  }

  getProductHealth(moduleRegistry: ModuleRegistryLike, configValidation: ConfigValidationResultLike): ProductHealthReport {
    return this.productHealth.computeHealth(moduleRegistry, configValidation);
  }

  explainRecommendation(recommendation: RecommendationLike): Promise<string> {
    return this.ai.explainRecommendation(recommendation);
  }

  summarizeInsights(insights: InsightLike[]): Promise<string> {
    return this.ai.summarizeInsights(insights);
  }

  generateActionItems(input: RecommendationLike[] | InsightLike[] | string): Promise<string[]> {
    return this.ai.generateActionItems(input);
  }

  runDiagnostics(context: DiagnosticContext): Promise<DiagnosticReport> {
    return this.diagnostics.run(context);
  }

  getOptimizations(context: OptimizationContext): Promise<OptimizationSuggestion[]> {
    return this.optimization.analyze(context);
  }
}
