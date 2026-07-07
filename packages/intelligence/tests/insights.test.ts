import { describe, expect, it } from "vitest";
import {
  createAdoptionInsightCollector,
  createErrorInsightCollector,
  createGrowthInsightCollector,
  createRetentionInsightCollector,
  createUsageInsightCollector,
} from "../src/insights/collectors.js";
import { InsightsEngine } from "../src/insights/engine.js";
import type { MetricSeriesSource } from "../src/insights/types.js";

function sourceFor(values: number[]): MetricSeriesSource {
  return {
    series: () => values.map((value, i) => ({ timestamp: new Date(2026, 0, i + 1).toISOString(), value })),
  };
}

describe("Insights Engine", () => {
  it("usage collector flags a sharp drop as a warning", async () => {
    const collector = createUsageInsightCollector({ id: "u1", metricName: "logins", source: sourceFor([100, 40]) });
    const [insight] = await collector.collect();
    expect(insight!.category).toBe("usage");
    expect(insight!.severity).toBe("warning");
  });

  it("growth collector flags decline", async () => {
    const collector = createGrowthInsightCollector({ id: "g1", metricName: "signups", source: sourceFor([50, 40]) });
    const [insight] = await collector.collect();
    expect(insight!.category).toBe("growth");
    expect(insight!.severity).toBe("warning");
  });

  it("adoption collector marks critical when far below target", async () => {
    const collector = createAdoptionInsightCollector({
      id: "a1",
      metricName: "adoption",
      source: sourceFor([0.05]),
      targetAdoptionRate: 0.5,
    });
    const [insight] = await collector.collect();
    expect(insight!.severity).toBe("critical");
  });

  it("retention collector marks critical below the critical threshold", async () => {
    const collector = createRetentionInsightCollector({
      id: "r1",
      metricName: "retention",
      source: sourceFor([0.1]),
      criticalBelow: 0.3,
    });
    const [insight] = await collector.collect();
    expect(insight!.severity).toBe("critical");
  });

  it("error collector marks critical above the critical threshold", async () => {
    const collector = createErrorInsightCollector({
      id: "e1",
      metricName: "error-rate",
      source: sourceFor([0.15]),
      criticalAbove: 0.1,
    });
    const [insight] = await collector.collect();
    expect(insight!.severity).toBe("critical");
  });

  it("InsightsEngine aggregates and filters across collectors", async () => {
    const engine = new InsightsEngine([
      createUsageInsightCollector({ id: "u1", metricName: "logins", source: sourceFor([100, 40]) }),
      createErrorInsightCollector({ id: "e1", metricName: "errors", source: sourceFor([0.01]), criticalAbove: 0.1 }),
    ]);
    const all = await engine.collectAll();
    expect(all).toHaveLength(2);
    const onlyWarnings = await engine.collectAll({ severity: "warning" });
    expect(onlyWarnings).toHaveLength(1);
    const byCategory = await engine.byCategory();
    expect(byCategory.usage).toHaveLength(1);
  });
});
