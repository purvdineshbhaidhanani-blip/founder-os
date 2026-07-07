import type { MetricPoint, TimeSeriesBucket } from "./types.js";

export type BucketInterval = "minute" | "hour" | "day";

function bucketStartFor(timestamp: string, interval: BucketInterval): string {
  const date = new Date(timestamp);
  date.setSeconds(0, 0);
  if (interval === "hour" || interval === "day") date.setMinutes(0);
  if (interval === "day") date.setHours(0);
  return date.toISOString();
}

/**
 * Aggregates raw `MetricPoint`s into counts, sums, averages, and bucketed
 * time series — the building blocks dashboards and reports both query.
 */
export class UsageMetrics {
  private readonly points: MetricPoint[] = [];

  record(name: string, value: number, tags?: Record<string, string>): void {
    this.points.push({ name, value, timestamp: new Date().toISOString(), tags });
  }

  private filtered(name: string, tags?: Record<string, string>): MetricPoint[] {
    return this.points.filter(
      (p) => p.name === name && (!tags || Object.entries(tags).every(([k, v]) => p.tags?.[k] === v)),
    );
  }

  count(name: string, tags?: Record<string, string>): number {
    return this.filtered(name, tags).length;
  }

  sum(name: string, tags?: Record<string, string>): number {
    return this.filtered(name, tags).reduce((total, p) => total + p.value, 0);
  }

  average(name: string, tags?: Record<string, string>): number {
    const matches = this.filtered(name, tags);
    if (matches.length === 0) return 0;
    return matches.reduce((total, p) => total + p.value, 0) / matches.length;
  }

  timeSeries(name: string, interval: BucketInterval, tags?: Record<string, string>): TimeSeriesBucket[] {
    const buckets = new Map<string, number>();
    for (const point of this.filtered(name, tags)) {
      const bucket = bucketStartFor(point.timestamp, interval);
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + point.value);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucketStart, value]) => ({ bucketStart, value }));
  }

  groupByTag(name: string, tagKey: string): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const point of this.points.filter((p) => p.name === name)) {
      const key = point.tags?.[tagKey] ?? "untagged";
      groups[key] = (groups[key] ?? 0) + point.value;
    }
    return groups;
  }

  all(): MetricPoint[] {
    return [...this.points];
  }
}
