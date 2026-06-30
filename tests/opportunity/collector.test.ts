import { describe, it, expect } from "vitest";
import { CollectorRegistry } from "../../src/opportunity/collector.js";
import type { ICollector, CollectorConfig, CollectorResult } from "../../src/opportunity/collector.js";

class StubCollector implements ICollector {
  readonly source = "reddit" as const;
  readonly displayName = "Stub Reddit";
  async collect(_config?: CollectorConfig): Promise<CollectorResult> {
    return {
      source: "reddit",
      items: [],
      fetchedAt: new Date().toISOString(),
      errors: [],
    };
  }
}

describe("CollectorRegistry", () => {
  it("registers and retrieves a collector", () => {
    const registry = new CollectorRegistry();
    registry.register(new StubCollector());
    const found = registry.get("reddit");
    expect(found).toBeDefined();
    expect(found?.displayName).toBe("Stub Reddit");
  });

  it("lists all registered collectors", () => {
    const registry = new CollectorRegistry();
    registry.register(new StubCollector());
    expect(registry.list().length).toBe(1);
    expect(registry.sources()).toContain("reddit");
  });

  it("returns undefined for unknown source", () => {
    const registry = new CollectorRegistry();
    expect(registry.get("hacker-news")).toBeUndefined();
  });
});
