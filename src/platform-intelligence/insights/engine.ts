import type { Insight, InsightCategory, InsightCollector, InsightSeverity } from "./types.js";

export interface InsightFilter {
  category?: InsightCategory;
  severity?: InsightSeverity;
}

/** Registers insight collectors (usage, growth, adoption, retention, error, or custom) and aggregates their output. */
export class InsightsEngine {
  private readonly collectors: InsightCollector[] = [];

  constructor(collectors: InsightCollector[] = []) {
    for (const collector of collectors) this.addCollector(collector);
  }

  addCollector(collector: InsightCollector): void {
    this.collectors.push(collector);
  }

  removeCollector(id: string): void {
    const index = this.collectors.findIndex((c) => c.id === id);
    if (index >= 0) this.collectors.splice(index, 1);
  }

  async collectAll(filter: InsightFilter = {}): Promise<Insight[]> {
    const results = await Promise.all(this.collectors.map((collector) => collector.collect()));
    let insights = results.flat();
    if (filter.category) insights = insights.filter((i) => i.category === filter.category);
    if (filter.severity) insights = insights.filter((i) => i.severity === filter.severity);
    return insights;
  }

  async byCategory(): Promise<Record<InsightCategory, Insight[]>> {
    const insights = await this.collectAll();
    const grouped: Record<string, Insight[]> = {};
    for (const insight of insights) {
      (grouped[insight.category] ??= []).push(insight);
    }
    return grouped as Record<InsightCategory, Insight[]>;
  }
}
