import { describe, expect, it } from "vitest";
import { DiagnosticsEngine } from "../src/diagnostics/engine.js";
import type { ModuleRegistryLike } from "../src/product-intelligence/types.js";

describe("Health & Diagnostics", () => {
  it("flags missing configuration as critical", async () => {
    const engine = new DiagnosticsEngine();
    const report = await engine.run({ configValidation: { valid: false, issues: [{ path: "API_KEY", message: "missing" }] } });
    expect(report.issues.some((i) => i.category === "missing-configuration" && i.severity === "critical")).toBe(true);
  });

  it("flags broken dependencies from the module registry", async () => {
    const registry: ModuleRegistryLike = {
      list: () => [{ id: "a" }],
      enabledModules: () => [{ id: "a" }],
      validateEnabled: () => ({ valid: true, issues: [] }),
      validateAll: () => ({ valid: false, issues: [{ nodeId: "a", detail: "missing dep" }] }),
    };
    const engine = new DiagnosticsEngine();
    const report = await engine.run({ moduleRegistry: registry });
    expect(report.issues.some((i) => i.category === "broken-dependencies")).toBe(true);
  });

  it("flags auto-discovered modules as invalid/unverified", async () => {
    const registry: ModuleRegistryLike = {
      list: () => [{ id: "mystery", discovered: true }],
      enabledModules: () => [],
      validateEnabled: () => ({ valid: true, issues: [] }),
      validateAll: () => ({ valid: true, issues: [] }),
    };
    const engine = new DiagnosticsEngine();
    const report = await engine.run({ moduleRegistry: registry });
    expect(report.issues.some((i) => i.category === "invalid-modules")).toBe(true);
  });

  it("flags performance signals crossing warning/critical thresholds", async () => {
    const engine = new DiagnosticsEngine();
    const report = await engine.run({
      performanceSignals: [{ label: "p95-latency-ms", value: 950, warnAbove: 500, criticalAbove: 900 }],
    });
    expect(report.issues[0]!.severity).toBe("critical");
  });

  it("supports registering a custom check", async () => {
    const engine = new DiagnosticsEngine({ checks: [] });
    engine.registerCheck(() => [{ id: "x", category: "performance", severity: "info", message: "custom check ran" }]);
    const report = await engine.run({});
    expect(report.issues).toHaveLength(1);
  });
});
