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
    // 2 of the 3 items ("Terrible experience...", "Worst tool ever, awful")
    // match concept.ts's "general-frustration" sub-concept ("terrible",
    // "awful"); the 3rd ("This is so annoying and frustrating") matches no
    // concept group, so it doesn't count toward the breakdown. Dominant
    // concept (count 2) replaces the old fixed category-level fallback
    // statement with a richer, sub-concept-aware one, and surfaces its root
    // cause — this is the Loop 5 Part 2/6 capability under test here.
    expect(complaintCluster?.normalizedStatement).toBe("Users express strong general frustration with the product.");
    expect(complaintCluster?.rootCause).toBe("Poor UX");
    expect(complaintCluster?.conceptBreakdown).toEqual([
      {
        conceptId: "general-frustration",
        canonicalStatement: "Users express strong general frustration with the product.",
        rootCause: "Poor UX",
        count: 2,
      },
    ]);

    const praiseCluster = report.clusters.find((c) => c.category === "praise");
    expect(praiseCluster).toBeDefined();
    // No concept group is registered for "praise" (concept.ts intentionally
    // excludes praise/trend/other — they don't decompose into root causes),
    // so it always falls back to the fixed category-level statement.
    expect(praiseCluster?.normalizedStatement).toBe("Users express satisfaction or praise.");
    expect(praiseCluster?.rootCause).toBeUndefined();
    expect(praiseCluster?.conceptBreakdown).toBeUndefined();

    // Part 8 additive report fields are always present and, for this clean
    // (no noise, no rejected clusters) fixture, both zero/empty.
    expect(report.totalItemsRejectedAsNoise).toBe(0);
    expect(report.rejectedClusters).toEqual([]);

    // Part 3/4 additive cluster fields: real, computed numbers.
    expect(complaintCluster?.evidenceQualityScore).toBeGreaterThan(0);
    expect(complaintCluster?.evidenceQualityScore).toBeLessThanOrEqual(1);
    expect(complaintCluster?.duplicateAdjustedEvidenceCount).toBe(3); // no near-duplicates in this fixture

    // persisted
    expect(report.artifactId).toBeTruthy();
    const artifact = artifacts.get(report.artifactId!);
    expect(artifact).toBeDefined();
    expect(artifact?.kind).toBe("report");
    expect(artifact?.owner).toBe("problem-intelligence-engine");

    const recalled = await memory.recall({ namespace: "project", tag: "problem-intelligence" });
    expect(recalled.some((entry) => entry.key === report.id)).toBe(true);
  });

  it("flags a rising-growth category with trending:true on a SINGLE cluster, instead of creating a duplicate trend cluster", async () => {
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

    // exactly ONE cluster is produced for this category, not two.
    const bugClusters = report.clusters.filter((c) => c.category === "bug");
    expect(bugClusters).toHaveLength(1);
    const bugCluster = bugClusters[0]!;
    expect(bugCluster.frequency.growth.label).toBe("rising");
    expect(bugCluster.trending).toBe(true);

    // no separate "trend"-category cluster is created anymore.
    expect(report.clusters.some((c) => c.category === "trend")).toBe(false);
  });

  it("leaves trending unset (falsy) when no category shows rising growth, and does not add a trend cluster", async () => {
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
    for (const cluster of report.clusters) {
      expect(cluster.trending).toBeFalsy();
    }
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

  it("Part 7 quality gate 2: rejects a cluster whose evidence is mostly near-duplicate cross-posted content", async () => {
    // 6 "bug" items: 5 are near-identical cross-posts of the SAME underlying
    // complaint (same body text, different source/author/url/title) and 1
    // is a genuinely distinct bug report. That's one near-duplicate group of
    // 5 (duplicateCount 4) out of 6 total items -> duplicateRatio 4/6 =
    // 0.667, over the 0.6 MAX_DUPLICATE_RATIO gate.
    const duplicateBody =
      "The app crashes every time I try to export data to CSV format and I lose all my unsaved work";
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/d1", title: "Export crashes", body: duplicateBody, sourceId: "reddit", author: "a1" }),
      makeItem({ url: "https://example.com/d2", title: "App crashes on export", body: duplicateBody, sourceId: "hackernews", author: "a2" }),
      makeItem({ url: "https://example.com/d3", title: "CSV export is broken", body: duplicateBody, sourceId: "hackernews", author: "a3" }),
      makeItem({ url: "https://example.com/d4", title: "Losing work on export", body: duplicateBody, sourceId: "reddit", author: "a4" }),
      makeItem({ url: "https://example.com/d5", title: "Export crash again", body: duplicateBody, sourceId: "reddit", author: "a5" }),
      makeItem({
        url: "https://example.com/d6",
        title: "Different bug entirely",
        body: "The login page shows a timeout error whenever I try to sign in with SSO enabled",
        sourceId: "reddit",
        author: "a6",
      }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Bugs", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);

    expect(report.clusters.some((c) => c.category === "bug")).toBe(false);
    const rejection = report.rejectedClusters?.find((r) => r.category === "bug");
    expect(rejection).toBeDefined();
    expect(rejection!.reason).toContain("duplicate ratio");
    expect(rejection!.reason).toContain("0.67");

    // eslint-disable-next-line no-console
    console.log(`[quality gate 2 example] bug cluster rejected: "${rejection!.reason}"`);
  });

  it("Part 7 quality gate 3: rejects a category cluster whose surviving items are mostly noise-filtered away", async () => {
    // 5 items would classify into "feature-request" (each weakly, via a
    // single "would be great if" match, confidence 0.3 — below the noise
    // safety-valve's 0.55 threshold, so it does NOT protect them). 4 of the
    // 5 ALSO carry 2+ distinct tutorial-list noise phrases and get removed
    // by the Part 1 noise filter, leaving only 1/5 (20%) surviving —
    // below the 34% NOISE_DOMINATED_SURVIVAL_RATIO_FLOOR.
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/n1", title: "Would be great if there was a step by step tutorial guide to onboarding", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/n2", title: "Would be great if there was a step by step tutorial for setup", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/n3", title: "Would be great if there was a step by step tutorial walkthrough", sourceId: "hackernews" }),
      makeItem({ url: "https://example.com/n4", title: "Would be great if there was a step by step tutorial guide to billing", sourceId: "hackernews" }),
      makeItem({ url: "https://example.com/n5", title: "Would be great if it supported CSV import", sourceId: "reddit" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Feature requests", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);

    expect(report.totalItemsRejectedAsNoise).toBe(4);
    expect(report.clusters.some((c) => c.category === "feature-request")).toBe(false);
    const rejection = report.rejectedClusters?.find((r) => r.category === "feature-request");
    expect(rejection).toBeDefined();
    expect(rejection!.reason).toContain("survived noise-filtering");
    expect(rejection!.reason).toContain("1/5");

    // eslint-disable-next-line no-console
    console.log(`[quality gate 3 example] feature-request cluster rejected: "${rejection!.reason}"`);
  });
});
