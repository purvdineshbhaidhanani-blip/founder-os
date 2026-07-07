import type { Insight, InsightCategory, InsightCollector, InsightSeverity, MetricSeriesSource } from "./types.js";

let counter = 0;
function generateInsightId(): string {
  counter += 1;
  return `insight_${Date.now()}_${counter}`;
}

function percentChange(previous: number, latest: number): number {
  if (previous === 0) return latest === 0 ? 0 : 100;
  return ((latest - previous) / Math.abs(previous)) * 100;
}

export interface ThresholdSeriesInsightCollectorOptions {
  id: string;
  category: InsightCategory;
  metricName: string;
  source: MetricSeriesSource;
  title: (latest: number, trendPct: number) => string;
  description: (latest: number, trendPct: number) => string;
  severity: (latest: number, trendPct: number) => InsightSeverity;
}

/**
 * Generic building block behind every insight collector below: reads a
 * named time series, computes the latest value and period-over-period
 * trend, and lets the caller decide title/description/severity from those
 * two numbers. Usage/Growth/Adoption/Retention/Error collectors are all
 * just pre-configured instances of this — the trend math is written once.
 */
export class ThresholdSeriesInsightCollector implements InsightCollector {
  readonly id: string;
  readonly category: InsightCategory;

  constructor(private readonly options: ThresholdSeriesInsightCollectorOptions) {
    this.id = options.id;
    this.category = options.category;
  }

  async collect(): Promise<Insight[]> {
    const points = await this.options.source.series(this.options.metricName);
    if (points.length === 0) return [];

    const latest = points[points.length - 1]!.value;
    const previous = points.length > 1 ? points[points.length - 2]!.value : latest;
    const trendPct = percentChange(previous, latest);

    return [
      {
        id: generateInsightId(),
        category: this.category,
        severity: this.options.severity(latest, trendPct),
        title: this.options.title(latest, trendPct),
        description: this.options.description(latest, trendPct),
        metricValue: latest,
        generatedAt: new Date().toISOString(),
      },
    ];
  }
}

export interface UsageInsightOptions {
  id: string;
  metricName: string;
  source: MetricSeriesSource;
  /** A drop of at least this percentage vs. the prior period is flagged. Defaults to 20. */
  warningDropPct?: number;
}

export function createUsageInsightCollector(options: UsageInsightOptions): InsightCollector {
  const warningDropPct = options.warningDropPct ?? 20;
  return new ThresholdSeriesInsightCollector({
    id: options.id,
    category: "usage",
    metricName: options.metricName,
    source: options.source,
    title: (latest) => `Usage for "${options.metricName}" is ${latest}`,
    description: (latest, trend) => `Latest usage is ${latest} (${trend.toFixed(1)}% vs. prior period).`,
    severity: (_latest, trend) => (trend <= -warningDropPct ? "warning" : "info"),
  });
}

export interface GrowthInsightOptions {
  id: string;
  metricName: string;
  source: MetricSeriesSource;
  /** Trend below this percentage is flagged as declining growth. Defaults to 0 (any shrinkage). */
  decliningThresholdPct?: number;
}

export function createGrowthInsightCollector(options: GrowthInsightOptions): InsightCollector {
  const decliningThresholdPct = options.decliningThresholdPct ?? 0;
  return new ThresholdSeriesInsightCollector({
    id: options.id,
    category: "growth",
    metricName: options.metricName,
    source: options.source,
    title: (_latest, trend) => (trend >= 0 ? `Growing ${trend.toFixed(1)}%` : `Declining ${Math.abs(trend).toFixed(1)}%`),
    description: (latest, trend) => `"${options.metricName}" moved ${trend.toFixed(1)}% period-over-period to ${latest}.`,
    severity: (_latest, trend) => (trend < decliningThresholdPct ? "warning" : "info"),
  });
}

export interface AdoptionInsightOptions {
  id: string;
  metricName: string;
  source: MetricSeriesSource;
  /** Target adoption rate (0-1 or a raw count, whatever scale the series uses). */
  targetAdoptionRate: number;
}

export function createAdoptionInsightCollector(options: AdoptionInsightOptions): InsightCollector {
  return new ThresholdSeriesInsightCollector({
    id: options.id,
    category: "adoption",
    metricName: options.metricName,
    source: options.source,
    title: (latest) => `Adoption at ${latest}`,
    description: (latest) => `Current adoption is ${latest} against a target of ${options.targetAdoptionRate}.`,
    severity: (latest) => {
      if (latest < options.targetAdoptionRate * 0.5) return "critical";
      if (latest < options.targetAdoptionRate) return "warning";
      return "info";
    },
  });
}

export interface RetentionInsightOptions {
  id: string;
  metricName: string;
  source: MetricSeriesSource;
  /** Retention rate below this value is critical. */
  criticalBelow: number;
  /** Retention rate below this (but above critical) is a warning. Defaults to criticalBelow * 1.2. */
  warningBelow?: number;
}

export function createRetentionInsightCollector(options: RetentionInsightOptions): InsightCollector {
  const warningBelow = options.warningBelow ?? options.criticalBelow * 1.2;
  return new ThresholdSeriesInsightCollector({
    id: options.id,
    category: "retention",
    metricName: options.metricName,
    source: options.source,
    title: (latest) => `Retention at ${latest}`,
    description: (latest, trend) => `Retention is ${latest} (${trend.toFixed(1)}% vs. prior period).`,
    severity: (latest) => {
      if (latest < options.criticalBelow) return "critical";
      if (latest < warningBelow) return "warning";
      return "info";
    },
  });
}

export interface ErrorInsightOptions {
  id: string;
  metricName: string;
  source: MetricSeriesSource;
  criticalAbove: number;
  warningAbove?: number;
}

export function createErrorInsightCollector(options: ErrorInsightOptions): InsightCollector {
  const warningAbove = options.warningAbove ?? options.criticalAbove * 0.5;
  return new ThresholdSeriesInsightCollector({
    id: options.id,
    category: "error",
    metricName: options.metricName,
    source: options.source,
    title: (latest) => `Error rate at ${latest}`,
    description: (latest, trend) => `Error rate is ${latest} (${trend.toFixed(1)}% vs. prior period).`,
    severity: (latest) => {
      if (latest >= options.criticalAbove) return "critical";
      if (latest >= warningAbove) return "warning";
      return "info";
    },
  });
}
