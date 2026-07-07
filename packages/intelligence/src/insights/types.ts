export const INSIGHT_CATEGORIES = ["usage", "growth", "adoption", "retention", "error"] as const;
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

export const INSIGHT_SEVERITIES = ["info", "warning", "critical"] as const;
export type InsightSeverity = (typeof INSIGHT_SEVERITIES)[number];

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  metricValue?: number;
  generatedAt: string;
}

export interface MetricSeriesPoint {
  timestamp: string;
  value: number;
}

/**
 * The only data-shaped dependency the Insights Engine has: "give me a named
 * time series." Any metrics backend can satisfy this — including the Loop 2
 * Analytics Engine's `UsageMetrics.timeSeries`, adapted with a one-line
 * wrapper — without the Insights Engine importing it directly.
 */
export interface MetricSeriesSource {
  series(metricName: string): Promise<MetricSeriesPoint[]> | MetricSeriesPoint[];
}

export interface InsightCollector {
  id: string;
  category: InsightCategory;
  collect(): Promise<Insight[]> | Insight[];
}
