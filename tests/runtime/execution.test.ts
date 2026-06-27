import { describe, expect, it } from "vitest";
import { ExecutionEngine } from "../../src/runtime/execution/index.js";

describe("ExecutionEngine", () => {
  it("runs units sequentially", async () => {
    const engine = new ExecutionEngine();
    const results = await engine.runSequential([
      { id: "a", input: 1, run: (n) => n + 1 },
      { id: "b", input: 2, run: (n) => n + 1 },
    ]);
    expect(results.map((r) => r.output)).toEqual([2, 3]);
  });

  it("runs units in parallel honoring concurrency", async () => {
    const engine = new ExecutionEngine();
    let active = 0;
    let peak = 0;
    const make = (id: string) => ({
      id,
      input: 0,
      async run() {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
        return id;
      },
    });
    await engine.runParallel(
      ["a", "b", "c", "d"].map((id) => make(id)),
      { concurrency: 2 },
    );
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("runs dependency-aware units in topological order", async () => {
    const engine = new ExecutionEngine();
    const events: string[] = [];
    const make = (id: string, deps: string[]) => ({
      id,
      dependsOn: deps,
      input: 0,
      async run() {
        events.push(id);
        return id;
      },
    });
    await engine.runDependencyAware([
      make("a", []),
      make("b", ["a"]),
      make("c", ["a"]),
      make("d", ["b", "c"]),
    ]);
    expect(events[0]).toBe("a");
    expect(events.at(-1)).toBe("d");
  });

  it("synchronizes barriers across actors", async () => {
    const engine = new ExecutionEngine();
    const order: string[] = [];
    const actor = async (label: string) => {
      await engine.synchronize("rendezvous", 2);
      order.push(label);
    };
    await Promise.all([actor("a"), actor("b")]);
    expect(order.sort()).toEqual(["a", "b"]);
  });
});
