import { describe, expect, it } from "vitest";
import { OptimizationEngine } from "../src/optimization/engine.js";
import type { OptimizableModuleRegistry } from "../src/optimization/types.js";

function fakeRegistry(modules: Array<{ id: string; dependsOn?: string[] }>): OptimizableModuleRegistry {
  const enabledIds = new Set(modules.map((m) => m.id));
  return {
    list: () => modules,
    enabledModules: () => modules,
    isEnabled: (id: string) => enabledIds.has(id),
  };
}

describe("Optimization Engine", () => {
  it("suggests enabling a companion module for observability", async () => {
    const engine = new OptimizationEngine();
    const suggestions = await engine.analyze({ moduleRegistry: fakeRegistry([{ id: "ai" }]) });
    expect(suggestions.some((s) => s.category === "module-selection" && s.title.includes("logging-monitoring"))).toBe(
      true,
    );
  });

  it("suggests reviewing a leaf module not in the required set", async () => {
    const engine = new OptimizationEngine();
    const suggestions = await engine.analyze({
      moduleRegistry: fakeRegistry([{ id: "search" }]),
      requiredModuleIds: ["ai"],
    });
    expect(suggestions.some((s) => s.title.includes('"search"'))).toBe(true);
  });

  it("suggests simplification once enabled modules exceed the threshold", async () => {
    const engine = new OptimizationEngine();
    const modules = Array.from({ length: 9 }, (_, i) => ({ id: `module-${i}` }));
    const suggestions = await engine.analyze({ moduleRegistry: fakeRegistry(modules), simplificationThreshold: 8 });
    expect(suggestions.some((s) => s.category === "simplification")).toBe(true);
  });

  it("flags a performance signal above its critical threshold as high impact", async () => {
    const engine = new OptimizationEngine();
    const suggestions = await engine.analyze({
      performanceSignals: [{ label: "queue-depth", value: 500, criticalAbove: 400 }],
    });
    expect(suggestions[0]!.category).toBe("performance");
    expect(suggestions[0]!.impact).toBe("high");
  });

  it("flags cost overruns proportional to how far over budget they are", async () => {
    const engine = new OptimizationEngine();
    const suggestions = await engine.analyze({
      costSignals: [{ label: "ai-inference", monthlyCostUsd: 500, threshold: 100 }],
    });
    expect(suggestions[0]!.category).toBe("cost");
    expect(suggestions[0]!.impact).toBe("high");
  });

  it("ranks suggestions by priority (confidence * impact) descending", async () => {
    const engine = new OptimizationEngine();
    const suggestions = await engine.analyze({
      performanceSignals: [
        { label: "low-priority", value: 60, warnAbove: 50 },
        { label: "high-priority", value: 999, criticalAbove: 900 },
      ],
    });
    expect(suggestions[0]!.priority).toBeGreaterThanOrEqual(suggestions[suggestions.length - 1]!.priority);
  });
});
