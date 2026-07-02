import { describe, expect, it } from "vitest";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import type { FounderReport, Opportunity, RawResearchItem, ResearchSession } from "../../src/research/types.js";

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

function harness() {
  const artifacts = new ArtifactManager({ storage: new StubStorage() });
  const memory = new MemoryEngine(new InMemoryStore());
  const repository = new ClusterRepository({ artifacts, memory });
  const engine = new ProblemIntelligenceEngine({ repository });
  return { artifacts, memory, repository, engine };
}

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function makeReport(opportunities: Opportunity[]): FounderReport {
  return {
    topOpportunities: opportunities,
    evidence: [],
    confidenceScore: { band: "low", numericScore: 0 },
    sourceCoverage: { used: [], failed: [], skipped: [], ratio: 0 },
    generatedAt: new Date().toISOString(),
  };
}

function makeSession(opportunities: Opportunity[], windowDays = 30): ResearchSession {
  return {
    id: "research_fixture",
    windowDays,
    startedAt: new Date().toISOString(),
    sourcesUsed: [],
    sourcesFailed: [],
    sourcesSkipped: [],
    opportunities,
    report: makeReport(opportunities),
    totalItemsCollected: opportunities.flatMap((o) => o.supportingItems).length,
    durationMs: 0,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("ProblemIntelligenceEngine.analyze", () => {
  it("produces clusters sorted by evidenceCount descending, and persists the report", async () => {
    const now = Date.now();

    const complaintItems: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "This is so annoying and frustrating", sourceId: "reddit", author: "alice", engagement: 5 }),
      makeItem({ url: "https://example.com/2", title: "Terrible experience, hate it", sourceId: "hackernews", author: "bob", engagement: 3 }),
      makeItem({ url: "https://example.com/3", title: "Worst tool ever, awful", sourceId: "hackernews", author: "carol", engagement: 1 }),
    ];

    const praiseItems: RawResearchItem[] = [
      makeItem({ url: "https://example.com/4", title: "I love this, amazing product", sourceId: "reddit", author: "dave" }),
    ];

    const opportunities: Opportunity[] = [
      {
        id: "opp_1",
        title: "Complaints",
        summary: "s",
        keywords: [],
        supportingItems: complaintItems,
        sourceIds: ["reddit", "hackernews"],
      },
      {
        id: "opp_2",
        title: "Praise",
        summary: "s",
        keywords: [],
        supportingItems: praiseItems,
        sourceIds: ["reddit"],
      },
    ];

    const session = makeSession(opportunities);
    const { engine, artifacts, memory } = harness();

    const report = await engine.analyze(session);

    expect(report.sourceSessionId).toBe(session.id);
    expect(report.windowDays).toBe(session.windowDays);
    expect(report.totalItemsAnalyzed).toBe(4);
    expect(report.totalItemsClassified).toBe(4);
    expect(report.clusters.length).toBeGreaterThan(0);

    // sorted by evidenceCount descending
    for (let i = 1; i < report.clusters.length; i += 1) {
      expect(report.clusters[i - 1]!.evidence.evidenceCount).toBeGreaterThanOrEqual(
        report.clusters[i]!.evidence.evidenceCount,
      );
    }

    const complaintCluster = report.clusters.find((c) => c.category === "complaint");
    expect(complaintCluster).toBeDefined();
    expect(complaintCluster?.evidence.evidenceCount).toBe(3);
    expect(complaintCluster?.normalizedStatement).toBe("Users express general dissatisfaction.");

    const praiseCluster = report.clusters.find((c) => c.category === "praise");
    expect(praiseCluster).toBeDefined();

    // persisted
    expect(report.artifactId).toBeTruthy();
    const artifact = artifacts.get(report.artifactId!);
    expect(artifact).toBeDefined();
    expect(artifact?.kind).toBe("report");
    expect(artifact?.owner).toBe("problem-intelligence-engine");

    const recalled = await memory.recall({ namespace: "project", tag: "problem-intelligence" });
    expect(recalled.some((entry) => entry.key === report.id)).toBe(true);
  });

  it("adds a duplicate trend cluster for categories whose growth is rising", async () => {
    const now = Date.now();
    const windowDays = 30;

    // 3 recent + 1 earlier bug-report items -> ratio 3, "rising"
    const items: RawResearchItem[] = [
      makeItem({
        url: "https://example.com/1",
        title: "App keeps crashing constantly",
        sourceId: "reddit",
        author: "alice",
        publishedAt: new Date(now).toISOString(),
      }),
      makeItem({
        url: "https://example.com/2",
        title: "Getting a crash every time I open it",
        sourceId: "hackernews",
        author: "bob",
        publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
      }),
      makeItem({
        url: "https://example.com/3",
        title: "Another crash bug report",
        sourceId: "hackernews",
        author: "carol",
        publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
      }),
      makeItem({
        url: "https://example.com/4",
        title: "Old crash bug from a while ago",
        sourceId: "reddit",
        author: "dave",
        publishedAt: new Date(now - windowDays * DAY_MS + 1 * DAY_MS).toISOString(),
      }),
    ];

    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Bugs", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];

    const session = makeSession(opportunities, windowDays);
    const { engine } = harness();

    const report = await engine.analyze(session);

    const bugCluster = report.clusters.find((c) => c.category === "bug");
    expect(bugCluster).toBeDefined();
    expect(bugCluster?.frequency.growth.label).toBe("rising");

    const trendCluster = report.clusters.find((c) => c.category === "trend");
    expect(trendCluster).toBeDefined();
    expect(trendCluster?.normalizedStatement).toBe("This topic is showing rising mention volume.");
    expect(trendCluster?.evidence.evidenceCount).toBe(bugCluster?.evidence.evidenceCount);
    expect(trendCluster?.id).not.toBe(bugCluster?.id);
  });

  it("does not add a trend cluster when no category shows rising growth", async () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "This is so annoying", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/2", title: "Terrible, hate it", sourceId: "reddit" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Complaints", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);
    expect(report.clusters.some((c) => c.category === "trend")).toBe(false);
  });

  it("counts totalItemsClassified as items matching at least one non-other category", async () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "This is so annoying", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/2", title: "Quarterly earnings report published today", sourceId: "reddit" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Mixed", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);
    expect(report.totalItemsAnalyzed).toBe(2);
    expect(report.totalItemsClassified).toBe(1);
    expect(report.clusters.some((c) => c.category === "other")).toBe(true);
  });
});
