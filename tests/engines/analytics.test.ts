import { describe, expect, it } from "vitest";
import { InMemoryAuditTracker } from "../../src/engines/analytics/audit.js";
import { DashboardEngine } from "../../src/engines/analytics/dashboards.js";
import { UsageMetrics } from "../../src/engines/analytics/metrics.js";
import { ReportGenerator } from "../../src/engines/analytics/reports.js";
import { InMemoryEventTracker } from "../../src/engines/analytics/tracker.js";

describe("Analytics Engine", () => {
  it("tracks and queries events", async () => {
    const tracker = new InMemoryEventTracker();
    await tracker.track("signup", { plan: "pro" }, "user-1");
    await tracker.track("signup", { plan: "free" }, "user-2");
    const results = await tracker.query({ name: "signup" });
    expect(results).toHaveLength(2);
  });

  it("aggregates usage metrics: count, sum, average, and grouping", () => {
    const metrics = new UsageMetrics();
    metrics.record("api.calls", 1, { tenant: "acme" });
    metrics.record("api.calls", 3, { tenant: "acme" });
    metrics.record("api.calls", 5, { tenant: "globex" });

    expect(metrics.count("api.calls")).toBe(3);
    expect(metrics.sum("api.calls", { tenant: "acme" })).toBe(4);
    expect(metrics.average("api.calls", { tenant: "acme" })).toBe(2);
    expect(metrics.groupByTag("api.calls", "tenant")).toEqual({ acme: 4, globex: 5 });
  });

  it("DashboardEngine renders widget snapshots, isolating widget failures", async () => {
    const engine = new DashboardEngine();
    const snapshot = await engine.render({
      id: "d1",
      name: "Overview",
      widgets: [
        { id: "w1", title: "Total", compute: () => 42 },
        {
          id: "w2",
          title: "Broken",
          compute: () => {
            throw new Error("boom");
          },
        },
      ],
    });
    expect(snapshot.widgets[0]!.value).toBe(42);
    expect(snapshot.widgets[1]!.error).toBe("boom");
  });

  it("ReportGenerator computes every section independently", async () => {
    const generator = new ReportGenerator();
    const report = await generator.generate({
      id: "r1",
      title: "Monthly",
      sections: [{ title: "Revenue", compute: () => 1000 }],
    });
    expect(report.sections[0]!.value).toBe(1000);
  });

  it("InMemoryAuditTracker records and filters by actor/action", async () => {
    const audit = new InMemoryAuditTracker();
    await audit.record("alice", "delete", "project-1");
    await audit.record("bob", "create", "project-2");
    const aliceActions = await audit.query({ actor: "alice" });
    expect(aliceActions).toHaveLength(1);
    expect(aliceActions[0]!.action).toBe("delete");
  });
});
