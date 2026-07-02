import { describe, expect, it } from "vitest";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { OpportunityRepository } from "../../src/opportunities/repository.js";
import { OpportunityEngine } from "../../src/opportunities/engine.js";
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
  const clusterRepository = new ClusterRepository({ artifacts, memory });
  const problemEngine = new ProblemIntelligenceEngine({ repository: clusterRepository });
  const opportunityRepository = new OpportunityRepository({ artifacts, memory });
  const opportunityEngine = new OpportunityEngine({ repository: opportunityRepository });
  return { artifacts, memory, problemEngine, opportunityEngine, opportunityRepository };
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

function buildFixtureSession(): ResearchSession {
  const now = Date.now();

  // "buying-intent" cluster: strong buying intent, decent evidence,
  // multiple sources/authors, a mentioned competitor, and a cited price ->
  // should score high enough to be a strong BUILD candidate.
  const buyingIntentItems: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/bi-1",
      title: "Willing to pay for a better tool than Trello, love the new tool",
      body: "It costs $50 a month and I'd switch immediately",
      sourceId: "reddit",
      author: "alice",
      engagement: 20,
      publishedAt: new Date(now).toISOString(),
    }),
    makeItem({
      url: "https://example.com/bi-2",
      title: "Would pay for this instead of dealing with the current mess",
      sourceId: "hackernews",
      author: "bob",
      engagement: 15,
      publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/bi-3",
      title: "Shut up and take my money, I need this now",
      sourceId: "producthunt",
      author: "carol",
      engagement: 10,
      publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/bi-4",
      title: "Looking to buy something like this for my team",
      sourceId: "reddit",
      author: "dave",
      engagement: 5,
      publishedAt: new Date(now - 3 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/bi-5",
      title: "Where can I buy a tool that solves this properly",
      sourceId: "hackernews",
      author: "erin",
      engagement: 8,
      publishedAt: new Date(now - windowDaysHalf()).toISOString(),
    }),
  ];

  // "complaint" cluster: general dissatisfaction, low buying intent, no
  // named competitor, no price mentioned, sparse engagement -> should score
  // much lower.
  const complaintItems: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/c-1",
      title: "This is so annoying and frustrating to use every day",
      sourceId: "reddit",
      author: "frank",
      publishedAt: new Date(now - 10 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/c-2",
      title: "Terrible experience, hate it, worst tool ever",
      sourceId: "reddit",
      author: "grace",
      publishedAt: new Date(now - 12 * DAY_MS).toISOString(),
    }),
  ];

  // "praise" cluster: satisfaction only, should map to a non-build MVP
  // template and never be flagged BUILD.
  const praiseItems: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/p-1",
      title: "I love this, amazing product, highly recommend",
      sourceId: "reddit",
      author: "henry",
    }),
    makeItem({
      url: "https://example.com/p-2",
      title: "Best tool I've used, great job to the team",
      sourceId: "hackernews",
      author: "irene",
    }),
  ];

  const opportunities: Opportunity[] = [
    {
      id: "opp_bi",
      title: "Buying intent",
      summary: "s",
      keywords: [],
      supportingItems: buyingIntentItems,
      sourceIds: ["reddit", "hackernews", "producthunt"],
    },
    {
      id: "opp_complaint",
      title: "Complaints",
      summary: "s",
      keywords: [],
      supportingItems: complaintItems,
      sourceIds: ["reddit"],
    },
    {
      id: "opp_praise",
      title: "Praise",
      summary: "s",
      keywords: [],
      supportingItems: praiseItems,
      sourceIds: ["reddit", "hackernews"],
    },
  ];

  return makeSession(opportunities, 30);
}

function windowDaysHalf(): number {
  // roughly mid-window so the recent/earlier split for growth calc has data
  // on both sides for the buying-intent cluster
  return 20 * DAY_MS;
}

describe("OpportunityEngine.analyze", () => {
  it("produces opportunities sorted descending by weightedTotal, fully populated, and persists the report", async () => {
    const session = buildFixtureSession();
    const { problemEngine, opportunityEngine, artifacts, memory } = harness();

    const problemReport = await problemEngine.analyze(session);
    expect(problemReport.clusters.length).toBeGreaterThanOrEqual(3);

    const topReport = await opportunityEngine.analyze(session, problemReport);

    expect(topReport.sourceSessionId).toBe(session.id);
    expect(topReport.sourceProblemReportId).toBe(problemReport.id);
    expect(topReport.totalClustersConsidered).toBe(problemReport.clusters.length);
    expect(topReport.opportunities.length).toBeGreaterThan(0);
    expect(topReport.opportunities.length).toBeLessThanOrEqual(10);

    // sorted descending by weightedTotal
    for (let i = 1; i < topReport.opportunities.length; i += 1) {
      expect(topReport.opportunities[i - 1]!.scoreBreakdown.weightedTotal).toBeGreaterThanOrEqual(
        topReport.opportunities[i]!.scoreBreakdown.weightedTotal,
      );
    }

    // every field populated
    for (const opp of topReport.opportunities) {
      expect(opp.id).toBeTruthy();
      expect(opp.clusterId).toBeTruthy();
      expect(opp.category).toBeTruthy();
      expect(opp.problem).toBeTruthy();
      expect(opp.summary).toBeTruthy();
      expect(typeof opp.painScore).toBe("number");
      expect(opp.buyingIntent).toBeDefined();
      expect(opp.competition).toBeDefined();
      expect(opp.confidence.band).toBeTruthy();
      expect(opp.scoreBreakdown).toBeDefined();
      expect(opp.supportingEvidence.evidenceCount).toBeGreaterThan(0);
      expect(Array.isArray(opp.representativeQuotes)).toBe(true);
      expect(opp.recommendedMvp).toBeTruthy();
      expect(opp.suggestedPricing).toBeDefined();
      expect(opp.targetUsers).toBeTruthy();
      expect(opp.buildDifficulty).toBeDefined();
      expect(opp.estimatedTimeToMvp).toBeTruthy();
      expect(opp.recommendation).toBeDefined();
      expect(opp.createdAt).toBeTruthy();
      expect(opp.sourceSessionId).toBe(session.id);
      expect(opp.sourceProblemReportId).toBe(problemReport.id);

      // verdict consistency with the documented thresholds given this
      // opportunity's actual numbers
      const { weightedTotal } = opp.scoreBreakdown;
      if (weightedTotal >= 0.6 && opp.confidence.band !== "low" && opp.buyingIntent.score > 0) {
        expect(opp.recommendation.verdict).toBe("BUILD");
      } else if (weightedTotal < 0.4) {
        expect(opp.recommendation.verdict).toBe("IGNORE");
      } else {
        expect(opp.recommendation.verdict).toBe("WAIT");
      }
    }

    // the buying-intent cluster should score higher than the complaint
    // cluster given its stronger evidence profile
    const buyingIntentOpp = topReport.opportunities.find((o) => o.category === "buying-intent");
    const complaintOpp = topReport.opportunities.find((o) => o.category === "complaint");
    expect(buyingIntentOpp).toBeDefined();
    expect(complaintOpp).toBeDefined();
    expect(buyingIntentOpp!.scoreBreakdown.weightedTotal).toBeGreaterThan(complaintOpp!.scoreBreakdown.weightedTotal);
    expect(buyingIntentOpp!.buyingIntent.score).toBeGreaterThan(0);

    const praiseOpp = topReport.opportunities.find((o) => o.category === "praise");
    expect(praiseOpp).toBeDefined();
    expect(praiseOpp!.recommendedMvp).toContain("Not a build opportunity");
    expect(praiseOpp!.recommendation.verdict).not.toBe("BUILD");

    // persistence
    expect(topReport.artifactId).toBeTruthy();
    const artifact = artifacts.get(topReport.artifactId!);
    expect(artifact).toBeDefined();
    expect(artifact?.kind).toBe("report");
    expect(artifact?.owner).toBe("opportunity-engine");

    const recalled = await memory.recall({ namespace: "project", tag: "opportunities" });
    expect(recalled.some((entry) => entry.key === topReport.id)).toBe(true);
  });

  it("round-trips through the repository's get/list methods", async () => {
    const session = buildFixtureSession();
    const { problemEngine, opportunityEngine, opportunityRepository } = harness();
    const problemReport = await problemEngine.analyze(session);
    const topReport = await opportunityEngine.analyze(session, problemReport);

    const fetched = await opportunityRepository.get(topReport.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(topReport.id);

    const listed = await opportunityRepository.list();
    expect(listed.some((r) => r.id === topReport.id)).toBe(true);
  });

  it("returns fewer than 10 opportunities without padding when fewer clusters exist", async () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "This is so annoying", sourceId: "reddit" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Complaints", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit"] },
    ];
    const session = makeSession(opportunities);
    const { problemEngine, opportunityEngine } = harness();

    const problemReport = await problemEngine.analyze(session);
    const topReport = await opportunityEngine.analyze(session, problemReport);

    expect(topReport.opportunities.length).toBe(problemReport.clusters.length);
    expect(topReport.opportunities.length).toBeLessThan(10);
  });
});
