import { describe, expect, it } from "vitest";
import { MemoryEngine, InMemoryStore } from "../../src/runtime/memory/index.js";

describe("MemoryEngine", () => {
  it("remembers and recalls entries", async () => {
    const engine = new MemoryEngine(new InMemoryStore());
    const entry = await engine.remember("task", "task:abc", { step: 1 }, { tags: ["alpha"] });
    expect(entry.id).toMatch(/^mem_/);
    const recalled = await engine.recall({ namespace: "task" });
    expect(recalled).toHaveLength(1);
    expect(recalled[0]?.data).toEqual({ step: 1 });
  });

  it("filters by tag and text", async () => {
    const engine = new MemoryEngine();
    await engine.remember("project", "alpha-project", "spec", { tags: ["spec"] });
    await engine.remember("project", "beta-project", "code", { tags: ["code"] });
    const tagged = await engine.recall({ namespace: "project", tag: "spec" });
    expect(tagged).toHaveLength(1);
    const fuzzy = await engine.recall({ text: "beta" });
    expect(fuzzy).toHaveLength(1);
  });

  it("cleans up expired entries", async () => {
    const engine = new MemoryEngine();
    await engine.remember("working", "expired-key", "x", { ttlMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const removed = await engine.cleanup();
    expect(removed).toBe(1);
    expect(await engine.recall({ namespace: "working" })).toHaveLength(0);
  });

  it("indexes by namespace and tag", async () => {
    const engine = new MemoryEngine();
    await engine.remember("agent", "engineer", "data", { tags: ["mvp"] });
    await engine.remember("task", "task:1", "data", { tags: ["mvp"] });
    const index = await engine.index();
    expect(index.totalEntries).toBe(2);
    expect(index.byNamespace.agent).toBe(1);
    expect(index.byTag.mvp).toBe(2);
  });
});
