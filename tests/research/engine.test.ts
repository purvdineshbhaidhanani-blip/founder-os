import { describe, expect, it } from "vitest";
import { ConnectorRegistry, BUILTIN_CONNECTORS } from "../../src/connectors/registry.js";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ResearchEngine, MissingKeysError } from "../../src/research/engine.js";
import type { SourceAdapter, RawResearchItem } from "../../src/research/types.js";

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

function makeItem(sourceId: string, title: string): RawResearchItem {
  return { title, url: `https://example.com/${sourceId}`, sourceId, publishedAt: new Date().toISOString() };
}

function keylessAdapter(id: string, items: RawResearchItem[]): SourceAdapter {
  return {
    id,
    keyless: true,
    fetch: async () => ({ ok: true, items }),
  };
}

function failingAdapter(id: string, keyless: boolean, error: string): SourceAdapter {
  return {
    id,
    keyless,
    fetch: async () => ({ ok: false, error }),
  };
}

function harness(env: Record<string, string | undefined>, adapters: SourceAdapter[]) {
  const connectors = new ConnectorRegistry(BUILTIN_CONNECTORS, env);
  const artifacts = new ArtifactManager({ storage: new StubStorage() });
  const memory = new MemoryEngine(new InMemoryStore());
  const engine = new ResearchEngine({ connectors, artifacts, memory, adapters });
  return { connectors, artifacts, memory, engine };
}

describe("ResearchEngine", () => {
  it("throws MissingKeysError naming the missing env vars when no keyed sources are configured and no keyless adapters exist", async () => {
    const adapters: SourceAdapter[] = [
      { id: "github", keyless: false, fetch: async () => ({ ok: true, items: [] }) },
      { id: "youtube", keyless: false, fetch: async () => ({ ok: true, items: [] }) },
    ];
    const { engine } = harness({}, adapters);

    await expect(engine.run(30, () => undefined)).rejects.toThrow(MissingKeysError);
    try {
      await engine.run(30, () => undefined);
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingKeysError);
      const missingErr = error as MissingKeysError;
      expect(missingErr.missingEnv).toEqual(expect.arrayContaining(["GITHUB_TOKEN", "YOUTUBE_API_KEY"]));
    }
  });

  it("completes the run and records sourcesFailed when one adapter fails, keeping successful ones", async () => {
    const good = keylessAdapter("hackernews", [makeItem("hackernews", "Cool startup launch")]);
    const bad = failingAdapter("rss", true, "feed unreachable");
    const { engine } = harness({}, [good, bad]);

    const events: string[] = [];
    const session = await engine.run(30, (event) => events.push(event.type));

    expect(session.sourcesUsed).toEqual(["hackernews"]);
    expect(session.sourcesFailed).toEqual([{ id: "rss", error: "feed unreachable" }]);
    expect(events).toContain("source.start");
    expect(events).toContain("source.done");
    expect(events).toContain("source.failed");
    expect(events).toContain("complete");
    expect(session.report).toBeDefined();
    expect(session.artifactId).toBeTruthy();
  });

  it("populates sourcesSkipped for keyed sources missing required env, while still running eligible keyless ones", async () => {
    const keyless = keylessAdapter("hackernews", [makeItem("hackernews", "Another item")]);
    const keyedMissing: SourceAdapter = {
      id: "github",
      keyless: false,
      fetch: async () => ({ ok: true, items: [] }),
    };
    const { engine } = harness({}, [keyless, keyedMissing]);

    const session = await engine.run(30, () => undefined);

    expect(session.sourcesUsed).toEqual(["hackernews"]);
    expect(session.sourcesSkipped).toHaveLength(1);
    expect(session.sourcesSkipped[0]?.id).toBe("github");
    expect(session.sourcesSkipped[0]?.reason).toContain("GITHUB_TOKEN");
  });

  it("treats keyed sources as eligible once required env vars are configured", async () => {
    const keyedConfigured: SourceAdapter = {
      id: "youtube",
      keyless: false,
      fetch: async () => ({ ok: true, items: [makeItem("youtube", "Launch video")] }),
    };
    const { engine } = harness({ YOUTUBE_API_KEY: "test-key" }, [keyedConfigured]);

    const session = await engine.run(30, () => undefined);
    expect(session.sourcesUsed).toEqual(["youtube"]);
    expect(session.sourcesSkipped).toEqual([]);
  });

  it("persists the session via artifacts.register and indexes it via memory.remember", async () => {
    const good = keylessAdapter("hackernews", [makeItem("hackernews", "Something notable happened today")]);
    const { engine, artifacts, memory } = harness({}, [good]);

    const session = await engine.run(7, () => undefined);

    const artifact = artifacts.get(session.artifactId!);
    expect(artifact).toBeDefined();
    expect(artifact?.kind).toBe("report");

    const recalled = await memory.recall({ namespace: "project", key: session.id });
    expect(recalled.length).toBeGreaterThanOrEqual(0);
    const allProjectEntries = await memory.recall({ namespace: "project" });
    expect(allProjectEntries.some((entry) => entry.key === session.id)).toBe(true);
  });
});
