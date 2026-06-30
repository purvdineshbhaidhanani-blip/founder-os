import type { AgentAnalytics } from "../analytics/agents.js";
import type { ModelRouter, RouteDecision } from "../routing/model-router.js";
import type { SettingsManager } from "../settings/manager.js";

export interface OptimizationRecommendation {
  kind: "downgrade-model" | "enable-cache" | "shrink-context" | "parallelize" | "agent-investigation";
  target: string;
  rationale: string;
  estimatedSavingsCents?: number;
}

export interface SpendSnapshot {
  dailyCents: number;
  monthlyCents: number;
}

/**
 * AI Cost Optimizer — picks the cheapest model that meets quality criteria,
 * tracks aggregate spend against Settings limits, and produces concrete
 * recommendations driven by Agent Analytics. Never trades quality silently:
 * downgrade recommendations require a stated rationale and savings estimate.
 */
export class CostOptimizer {
  private spent: SpendSnapshot = { dailyCents: 0, monthlyCents: 0 };

  constructor(
    private analytics: AgentAnalytics,
    private router: ModelRouter,
    private settings: SettingsManager,
  ) {}

  recordSpend(cents: number): void {
    this.spent.dailyCents += cents;
    this.spent.monthlyCents += cents;
  }

  resetDaily(): void { this.spent.dailyCents = 0; }
  resetMonthly(): void { this.spent.monthlyCents = 0; }

  remainingBudget(): { dailyCents: number; monthlyCents: number } {
    const limits = this.settings.getLimits();
    return {
      dailyCents: (limits.maxCostPerDayCents ?? Number.POSITIVE_INFINITY) - this.spent.dailyCents,
      monthlyCents: Number.POSITIVE_INFINITY - this.spent.monthlyCents,
    };
  }

  /** Cheapest-model lookup respecting a quality floor. */
  pickModel(criteria: { taskKind?: string; minQuality?: "low" | "medium" | "high" }): RouteDecision | undefined {
    return this.router.route({
      taskKind: criteria.taskKind,
      minQuality: criteria.minQuality,
      prefer: "cheapest",
    });
  }

  recommendations(): OptimizationRecommendation[] {
    const out: OptimizationRecommendation[] = [];
    for (const view of this.analytics.rankings().worst) {
      if (view.executionCount >= 10 && view.averageCostCents > 50) {
        out.push({
          kind: "downgrade-model",
          target: view.agent,
          rationale: `Average cost ${(view.averageCostCents / 100).toFixed(2)} USD with ${(view.successRate * 100).toFixed(0)}% success rate.`,
          estimatedSavingsCents: Math.round(view.averageCostCents * 0.4),
        });
      }
      if (view.averageDurationMs > 90_000) {
        out.push({
          kind: "parallelize",
          target: view.agent,
          rationale: `Average duration ${(view.averageDurationMs / 1000).toFixed(0)}s suggests sequential work that could run in parallel.`,
        });
      }
    }
    return out;
  }
}
