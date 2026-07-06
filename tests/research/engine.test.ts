import { afterEach, describe, expect, it } from "vitest";
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

function failingAdapter(
  id: string,
  keyless: boolean,
  error: string,
  reason: "no-results" | "network-failure" | "authentication-failure" | "api-limit" | "parsing-failure" | "unknown-error" = "unknown-error",
): SourceAdapter {
  return {
    id,
    keyless,
    fetch: async () => ({ ok: false, error, reason }),
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

  it("completes the run and records sourcesFailed (with a classified reason) when one adapter fails, keeping successful ones", async () => {
    const good = keylessAdapter("hackernews", [makeItem("hackernews", "Cool startup launch")]);
    const bad = failingAdapter("rss", true, "feed unreachable", "network-failure");
    const { engine } = harness({}, [good, bad]);

    const events: string[] = [];
    const session = await engine.run(30, (event) => events.push(event.type));

    expect(session.sourcesUsed).toEqual(["hackernews"]);
    expect(session.sourcesFailed).toEqual([{ id: "rss", error: "feed unreachable", reason: "network-failure" }]);
    expect(session.report.sourceCoverage.failedReasons).toEqual([{ id: "rss", reason: "network-failure" }]);
    expect(events).toContain("source.start");
    expect(events).toContain("source.done");
    expect(events).toContain("source.failed");
    expect(events).toContain("complete");
    expect(session.report).toBeDefined();
    expect(session.artifactId).toBeTruthy();
  });

  it("falls back to the raw user topic for every adapter when Query Intelligence returns LOW confidence (unclassifiable query)", async () => {
    // "handmade artisan candles" matches no INDUSTRY_PATTERNS keyword ->
    // industryConfidence "low" -> Task 5 fallback: adapters receive the raw
    // topic unchanged, exactly like the pre-wiring behavior.
    const seenTopics: Array<string | undefined> = [];
    const adapter: SourceAdapter = {
      id: "hackernews",
      keyless: true,
      fetch: async (_windowDays, topic) => {
        seenTopics.push(topic);
        return { ok: true, items: [] };
      },
    };
    const { engine } = harness({}, [adapter]);

    const session = await engine.run(30, () => undefined, "handmade artisan candles");

    expect(seenTopics).toEqual(["handmade artisan candles"]);
    // session.topic always records the ORIGINAL user query, never an expansion.
    expect(session.topic).toBe("handmade artisan candles");
  });

  it("dispatches the Query-Intelligence-expanded per-source query to a mapped adapter, but the raw topic to an unmapped one, while recording the original topic", async () => {
    // "AI SaaS" -> AI Software (high confidence). hackernews is a mapped
    // source, so it receives the top generated hackernews query
    // (entity "LLM" + suffix "Show HN" = "LLM Show HN"). stackexchange has no
    // dedicated per-source query list, so it falls back to the raw topic.
    const seen: Record<string, string | undefined> = {};
    const mapped: SourceAdapter = {
      id: "hackernews",
      keyless: true,
      fetch: async (_windowDays, topic) => {
        seen.hackernews = topic;
        return { ok: true, items: [] };
      },
    };
    const unmapped: SourceAdapter = {
      id: "stackexchange",
      keyless: true,
      fetch: async (_windowDays, topic) => {
        seen.stackexchange = topic;
        return { ok: true, items: [] };
      },
    };
    const { engine } = harness({}, [mapped, unmapped]);

    const session = await engine.run(30, () => undefined, "AI SaaS");

    expect(seen.hackernews).toBe("LLM Show HN");
    expect(seen.stackexchange).toBe("AI SaaS");
    expect(session.topic).toBe("AI SaaS");
  });

  it("records sourcesPartial (and surfaces it in the report) when an adapter succeeds with a partialFailure", async () => {
    const partial: SourceAdapter = {
      id: "reddit",
      keyless: true,
      fetch: async () => ({
        ok: true,
        items: [makeItem("reddit", "Some real item")],
        partialFailure: { reason: "api-limit", detail: "1/2 Reddit endpoint(s) failed" },
      }),
    };
    const { engine } = harness({}, [partial]);

    const session = await engine.run(30, () => undefined);

    expect(session.sourcesUsed).toEqual(["reddit"]);
    expect(session.sourcesFailed).toEqual([]);
    expect(session.sourcesPartial).toEqual([
      { id: "reddit", reason: "api-limit", detail: "1/2 Reddit endpoint(s) failed" },
    ]);
    expect(session.report.sourceCoverage.partial).toEqual([
      { id: "reddit", reason: "api-limit", detail: "1/2 Reddit endpoint(s) failed" },
    ]);
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

  it("populates totalItemsCollected and durationMs on a successful run", async () => {
    const good = keylessAdapter("hackernews", [
      { title: "Cool startup launch one", url: "https://example.com/hackernews/1", sourceId: "hackernews" },
      { title: "Totally unrelated other headline", url: "https://example.com/hackernews/2", sourceId: "hackernews" },
    ]);
    const { engine } = harness({}, [good]);

    const session = await engine.run(30, () => undefined);

    expect(session.totalItemsCollected).toBe(2);
    expect(typeof session.durationMs).toBe("number");
    expect(session.durationMs).toBeGreaterThanOrEqual(0);
    expect(session.durationMs).toBe(Date.parse(session.completedAt!) - Date.parse(session.startedAt));
  });

  it("dedupes near-identical items collected across adapters before aggregation, reducing item count", async () => {
    const url = "https://example.com/dup";
    const adapterA = keylessAdapter("hackernews", [
      { title: "Founders launch new billing automation tool", url, sourceId: "hackernews", engagement: 3 },
    ]);
    const adapterB = keylessAdapter("rss", [
      { title: "Founders launch new billing automation tool", url, sourceId: "rss", engagement: 10 },
    ]);
    const { engine } = harness({}, [adapterA, adapterB]);

    const session = await engine.run(30, () => undefined);

    // Both adapters returned the exact same URL — pass 1 (exact URL dedup) keeps the
    // first-seen occurrence regardless of engagement, collapsing them to one item.
    expect(session.totalItemsCollected).toBe(1);
    const supporting = session.opportunities.flatMap((o) => o.supportingItems);
    expect(supporting).toHaveLength(1);
    expect(supporting[0]?.sourceId).toBe("hackernews");
  });

  describe("relevance filter integration", () => {
    const ORIGINAL_THRESHOLD = process.env.RELEVANCE_FILTER_THRESHOLD;

    afterEach(() => {
      if (ORIGINAL_THRESHOLD === undefined) delete process.env.RELEVANCE_FILTER_THRESHOLD;
      else process.env.RELEVANCE_FILTER_THRESHOLD = ORIGINAL_THRESHOLD;
    });

    it("populates session.relevanceFilter and excludes not-relevant opportunities from opportunities/report at the default (normal) threshold", async () => {
      delete process.env.RELEVANCE_FILTER_THRESHOLD;

      const relevant = keylessAdapter("hackernews", [
        {
          title: "Founders wasting hours on manual invoicing",
          url: "https://example.com/relevant-1",
          sourceId: "hackernews",
          snippet:
            "Our team wastes hours doing this manually every week. Please add an export feature to automate it.",
        },
      ]);
      const irrelevant = keylessAdapter("rss", [
        {
          title: "Election results announced",
          url: "https://example.com/irrelevant-1",
          sourceId: "rss",
          snippet: "The election results were announced today, and the senator gave a speech to congress.",
        },
      ]);
      const { engine } = harness({}, [relevant, irrelevant]);

      const session = await engine.run(30, () => undefined);

      expect(session.relevanceFilter).toBeDefined();
      expect(session.relevanceFilter?.threshold).toBe("normal");
      expect(session.relevanceFilter?.totalEvaluated).toBe(2);
      expect(session.relevanceFilter?.notRelevantCount).toBe(1);
      expect(session.relevanceFilter?.rejectedSamples).toHaveLength(1);
      expect(session.relevanceFilter?.rejectedSamples[0]?.decision).toBe("not-relevant");

      // The politically-themed item must be excluded from opportunities/report...
      const titles = session.opportunities.map((o) => o.title);
      expect(titles.some((t) => t.includes("Election"))).toBe(false);
      expect(session.report.topOpportunities.map((o) => o.title)).not.toContain("Election results announced");

      // ...but totalItemsCollected stays the honest raw count, unaffected by relevance filtering.
      expect(session.totalItemsCollected).toBe(2);
    });

    it("respects RELEVANCE_FILTER_THRESHOLD=strict, filtering out low-signal opportunities that 'normal' would keep", async () => {
      process.env.RELEVANCE_FILTER_THRESHOLD = "strict";

      const noSignal = keylessAdapter("hackernews", [
        {
          title: "Team lunch update",
          url: "https://example.com/no-signal-1",
          sourceId: "hackernews",
          snippet: "The office had a nice team lunch today and the weather was pleasant.",
        },
      ]);
      const { engine } = harness({}, [noSignal]);

      const session = await engine.run(30, () => undefined);

      expect(session.relevanceFilter?.threshold).toBe("strict");
      expect(session.relevanceFilter?.uncertainCount).toBe(1);
      expect(session.opportunities).toHaveLength(0);
      expect(session.totalItemsCollected).toBe(1);
    });
  });
});
