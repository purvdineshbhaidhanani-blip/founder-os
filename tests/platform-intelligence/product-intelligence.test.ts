import { describe, expect, it } from "vitest";
import { ProductIntelligence } from "../../src/platform-intelligence/product-intelligence/health.js";
import type { ModuleRegistryLike } from "../../src/platform-intelligence/product-intelligence/types.js";

function fakeRegistry(overrides: Partial<ModuleRegistryLike> = {}): ModuleRegistryLike {
  return {
    list: () => [{ id: "ai" }, { id: "knowledge" }],
    enabledModules: () => [{ id: "ai" }, { id: "knowledge" }],
    validateEnabled: () => ({ valid: true, issues: [] }),
    validateAll: () => ({ valid: true, issues: [] }),
    ...overrides,
  };
}

describe("Product Intelligence", () => {
  it("reports healthy when everything validates", () => {
    const pi = new ProductIntelligence();
    const report = pi.computeHealth(fakeRegistry(), { valid: true });
    expect(report.status).toBe("healthy");
    expect(report.moduleHealth.every((m) => m.status === "healthy")).toBe(true);
  });

  it("marks a module unhealthy when it has an unresolved enabled-dependency issue", () => {
    const pi = new ProductIntelligence();
    const registry = fakeRegistry({
      validateEnabled: () => ({
        valid: false,
        issues: [{ nodeId: "knowledge", detail: 'knowledge depends on "ai", which is not enabled.' }],
      }),
    });
    const report = pi.computeHealth(registry, { valid: true });
    const knowledgeHealth = report.moduleHealth.find((m) => m.moduleId === "knowledge");
    expect(knowledgeHealth?.status).toBe("unhealthy");
    expect(report.status).toBe("unhealthy");
  });

  it("marks a discovered/undocumented module as degraded", () => {
    const pi = new ProductIntelligence();
    const registry = fakeRegistry({
      enabledModules: () => [{ id: "mystery", discovered: true }],
    });
    const report = pi.computeHealth(registry, { valid: true });
    expect(report.moduleHealth[0]!.status).toBe("degraded");
  });

  it("surfaces configuration validation failures in the aggregate status", () => {
    const pi = new ProductIntelligence();
    const report = pi.computeHealth(fakeRegistry(), {
      valid: false,
      issues: [{ path: "API_KEY", message: "missing" }],
    });
    expect(report.configValidation.valid).toBe(false);
    expect(report.status).toBe("unhealthy");
  });
});
