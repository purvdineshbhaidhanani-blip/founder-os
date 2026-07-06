import { describe, expect, it } from "vitest";
import { MonitorEngine } from "../../src/monitoring/engine.js";
import type { MonitorProvider, MonitorSnapshot, MonitorSnapshotItem } from "../../src/monitoring/types.js";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";

class StubStorage {
  store = new Map<string, string>();
  async write(path: string, content: string) {
    this.store.set(path, content);
  }
  async read(path: string) {
    return this.store.get(path) ?? "";
  }
  async exists(path: string) {
    return this.store.has(path);
  }
}

function item(overrides: Partial<MonitorSnapshotItem> = {}): MonitorSnapshotItem {
  return {
    id: "repo-1",
    title: "Widget",
    url: "https://example.com/repo-1",
    fields: { stars: 10 },
    capturedAt: "2026-07-01T00:00:00.000Z",
    sourceId: "stub",
    ...overrides,
  };
}

function snapshot(items: MonitorSnapshotItem[], capturedAt = "2026-07-01T00:00:00.000Z"): MonitorSnapshot {
  return { providerId: "stub", category: "trending-github", query: "q", capturedAt, items };
}

/** A provider whose next returned snapshot the test can swap between runs. */
function mutableProvider(): { provider: MonitorProvider; setNext: (s: MonitorSnapshot) => void } {
  let next: MonitorSnapshot = snapshot([item()]);
  const provider: MonitorProvider = {
    id: "stub",
    keyless: true,
    category: "trending-github",
    fetch: async () => ({ ok: true, snapshot: next }),
  };
  return { provider, setNext: (s) => (next = s) };
}

function harness(providers: MonitorProvider[]) {
  const memory = new MemoryEngine(new InMemoryStore());
  const artifacts = new ArtifactManager({ storage: new StubStorage() });
  const engine = new MonitorEngine({ memory, artifacts, providers });
  return { engine, memory, artifacts };
}

describe("MonitorEngine", () => {
  it("lists configured providers with their category and keyless flag", () => {
    const { provider } = mutableProvider();
    const { engine } = harness([provider]);
    expect(engine.listProviders()).toEqual([{ id: "stub", category: "trending-github", keyless: true }]);
  });

  it("reports firstRun with no changes on the first run, then persists the snapshot", async () => {
    const { provider } = mutableProvider();
    const { engine } = harness([provider]);

    const result = await engine.run({ query: "q" });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.firstRun).toBe(true);
    expect(result.results[0]?.changes).toEqual([]);
    expect(result.results[0]?.itemCount).toBe(1);
    expect(result.providersRun).toEqual(["stub"]);
    expect(result.artifactId).toBeTruthy();

    // Snapshot is now persisted for the next diff.
    const persisted = await engine.getSnapshot("stub", "q");
    expect(persisted?.items).toHaveLength(1);
  });

  it("diffs against the previous snapshot on a subsequent run, surfacing added and changed events", async () => {
    const { provider, setNext } = mutableProvider();
    const { engine } = harness([provider]);

    await engine.run({ query: "q" }); // seed baseline: one item, stars=10

    setNext(
      snapshot(
        [item({ fields: { stars: 25 } }), item({ id: "repo-2", title: "New Widget", url: "https://example.com/repo-2" })],
        "2026-07-02T00:00:00.000Z",
      ),
    );
    const result = await engine.run({ query: "q" });

    expect(result.results[0]?.firstRun).toBe(false);
    const types = result.results[0]?.changes.map((c) => c.type).sort();
    expect(types).toEqual(["added", "changed"]);
    expect(result.totalChanges).toBe(2);
  });

  it("records a provider failure without aborting the run", async () => {
    const failing: MonitorProvider = {
      id: "boom",
      keyless: true,
      category: "market",
      fetch: async () => ({ ok: false, error: "feed down", reason: "network-failure" }),
    };
    const { provider } = mutableProvider();
    const { engine } = harness([failing, provider]);

    const result = await engine.run({ query: "q" });

    expect(result.providersFailed).toEqual(["boom"]);
    expect(result.providersRun).toEqual(["stub"]);
    const boom = result.results.find((r) => r.providerId === "boom");
    expect(boom?.ok).toBe(false);
    expect(boom?.reason).toBe("network-failure");
    expect(boom?.error).toBe("feed down");
  });

  it("restricts the run to providerIds when given", async () => {
    const a = mutableProvider().provider;
    const b: MonitorProvider = { ...mutableProvider().provider, id: "other", category: "complaint" };
    const { engine } = harness([a, b]);

    const result = await engine.run({ query: "q", providerIds: ["other"] });

    expect(result.results.map((r) => r.providerId)).toEqual(["other"]);
  });

  it("restricts the run by category when no providerIds are given", async () => {
    const a = mutableProvider().provider; // trending-github
    const b: MonitorProvider = { ...mutableProvider().provider, id: "market-1", category: "market" };
    const { engine } = harness([a, b]);

    const result = await engine.run({ query: "q", category: "market" });

    expect(result.results.map((r) => r.providerId)).toEqual(["market-1"]);
  });

  it("lists recent runs newest-first", async () => {
    const { provider } = mutableProvider();
    const { engine } = harness([provider]);

    const first = await engine.run({ query: "q" });
    const second = await engine.run({ query: "q" });

    const runs = await engine.listRuns();
    expect(runs.length).toBeGreaterThanOrEqual(2);
    const ids = runs.map((r) => r.runId);
    expect(ids).toContain(first.runId);
    expect(ids).toContain(second.runId);
  });
});
