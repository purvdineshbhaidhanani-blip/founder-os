export interface AgentExecutionRecord {
  agent: string;
  ok: boolean;
  durationMs: number;
  costCents?: number;
  tokens?: number;
  /** 0..1 quality score; optional. */
  qualityScore?: number;
}

export interface AgentMetrics {
  agent: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  totalCostCents: number;
  totalTokens: number;
  totalQualityScore: number;
  qualitySamples: number;
}

export interface AgentAnalyticsView {
  agent: string;
  executionCount: number;
  successRate: number;
  failureRate: number;
  averageDurationMs: number;
  averageCostCents: number;
  averageTokens: number;
  averageQuality?: number;
}

/**
 * Agent Analytics — accumulates per-agent execution counters and projects
 * them into a view used by the Cost Optimizer, the Capability Directory and
 * the Founder Command Center.
 */
export class AgentAnalytics {
  private metrics = new Map<string, AgentMetrics>();

  record(record: AgentExecutionRecord): void {
    const metrics = this.metrics.get(record.agent) ?? this.empty(record.agent);
    metrics.executionCount += 1;
    if (record.ok) metrics.successCount += 1;
    else metrics.failureCount += 1;
    metrics.totalDurationMs += record.durationMs;
    if (record.costCents) metrics.totalCostCents += record.costCents;
    if (record.tokens) metrics.totalTokens += record.tokens;
    if (typeof record.qualityScore === "number") {
      metrics.totalQualityScore += record.qualityScore;
      metrics.qualitySamples += 1;
    }
    this.metrics.set(record.agent, metrics);
  }

  view(agent: string): AgentAnalyticsView | undefined {
    const metrics = this.metrics.get(agent);
    if (!metrics) return undefined;
    return this.toView(metrics);
  }

  all(): AgentAnalyticsView[] {
    return [...this.metrics.values()].map((metrics) => this.toView(metrics));
  }

  rankings(top = 5): { best: AgentAnalyticsView[]; worst: AgentAnalyticsView[] } {
    const views = this.all().filter((view) => view.executionCount > 0);
    const sorted = [...views].sort((a, b) => b.successRate - a.successRate);
    return { best: sorted.slice(0, top), worst: sorted.slice(-top).reverse() };
  }

  recommendations(): string[] {
    const out: string[] = [];
    for (const view of this.all()) {
      if (view.executionCount < 5) continue;
      if (view.successRate < 0.5) {
        out.push(`Investigate "${view.agent}" — success rate ${(view.successRate * 100).toFixed(0)}%`);
      }
      if (view.averageDurationMs > 60_000) {
        out.push(`Optimize "${view.agent}" — average duration ${(view.averageDurationMs / 1000).toFixed(1)}s`);
      }
    }
    return out;
  }

  private empty(agent: string): AgentMetrics {
    return {
      agent,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      totalDurationMs: 0,
      totalCostCents: 0,
      totalTokens: 0,
      totalQualityScore: 0,
      qualitySamples: 0,
    };
  }

  private toView(metrics: AgentMetrics): AgentAnalyticsView {
    const total = metrics.executionCount || 1;
    return {
      agent: metrics.agent,
      executionCount: metrics.executionCount,
      successRate: metrics.successCount / total,
      failureRate: metrics.failureCount / total,
      averageDurationMs: metrics.totalDurationMs / total,
      averageCostCents: metrics.totalCostCents / total,
      averageTokens: metrics.totalTokens / total,
      averageQuality: metrics.qualitySamples ? metrics.totalQualityScore / metrics.qualitySamples : undefined,
    };
  }
}
