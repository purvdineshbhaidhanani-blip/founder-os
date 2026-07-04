import { describe, expect, it } from "vitest";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { OpportunityRepository } from "../../src/opportunities/repository.js";
import { OpportunityEngine } from "../../src/opportunities/engine.js";
import type { Opportunity, RawResearchItem } from "../../src/research/types.js";
import type { FounderReport, ResearchSession } from "../../src/research/types.js";

/**
 * Integration test for the Founder Business Intelligence wiring pass
 * (engine.ts's `attachFounderBusinessIntelligence` call, see
 * founder-business-intelligence.ts) — runs the REAL engine pipeline
 * end-to-end (ProblemIntelligenceEngine -> OpportunityEngine.analyze) and
 * asserts all 6 new additive fields are present and populated on the
 * resulting reports, not just the isolated compose functions (already
 * covered by tests/opportunities/founder-business-os.test.ts's 24 unit
 * tests).
 */

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
    id: "research_fixture_fbi",
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

  const buyingIntentItems: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/fbi-1",
      title: "Willing to pay for a better tool than Trello, love the new tool",
      body: "It costs $50 a month and I'd switch immediately",
      sourceId: "reddit",
      author: "alice",
      engagement: 20,
      publishedAt: new Date(now).toISOString(),
    }),
    makeItem({
      url: "https://example.com/fbi-2",
      title: "Would pay for this instead of dealing with the current mess",
      sourceId: "hackernews",
      author: "bob",
      engagement: 15,
      publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/fbi-3",
      title: "Shut up and take my money, I need this now",
      sourceId: "producthunt",
      author: "carol",
      engagement: 10,
      publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/fbi-4",
      title: "Looking to buy something like this for my team",
      sourceId: "reddit",
      author: "dave",
      engagement: 5,
      publishedAt: new Date(now - 3 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/fbi-5",
      title: "Where can I buy a tool that solves this properly",
      sourceId: "hackernews",
      author: "erin",
      engagement: 8,
      publishedAt: new Date(now - 20 * DAY_MS).toISOString(),
    }),
  ];

  const complaintItems: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/fbi-c1",
      title: "This is so annoying and frustrating to use every day",
      sourceId: "reddit",
      author: "frank",
      publishedAt: new Date(now - 10 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/fbi-c2",
      title: "Terrible experience, hate it, worst tool ever",
      sourceId: "reddit",
      author: "grace",
      publishedAt: new Date(now - 12 * DAY_MS).toISOString(),
    }),
  ];

  const opportunities: Opportunity[] = [
    {
      id: "opp_fbi_bi",
      title: "Buying intent",
      summary: "s",
      keywords: [],
      supportingItems: buyingIntentItems,
      sourceIds: ["reddit", "hackernews", "producthunt"],
    },
    {
      id: "opp_fbi_complaint",
      title: "Complaints",
      summary: "s",
      keywords: [],
      supportingItems: complaintItems,
      sourceIds: ["reddit"],
    },
  ];

  return makeSession(opportunities, 30);
}

describe("Founder Business Intelligence wiring (engine.ts's attachFounderBusinessIntelligence)", () => {
  it("populates all 6 new additive fields on every report produced by the real engine pipeline", async () => {
    const session = buildFixtureSession();
    const { problemEngine, opportunityEngine } = harness();

    const problemReport = await problemEngine.analyze(session);
    expect(problemReport.clusters.length).toBeGreaterThan(0);

    const topReport = await opportunityEngine.analyze(session, problemReport);
    expect(topReport.opportunities.length).toBeGreaterThan(0);

    for (const opp of topReport.opportunities) {
      // Every pre-existing field remains populated (no regression).
      expect(opp.founderIntelligence).toBeDefined();
      expect(opp.aiDecisionValidation).toBeDefined();

      // businessIntelligence (Phase 1)
      expect(opp.businessIntelligence).toBeDefined();
      expect(opp.businessIntelligence.businessModel).toBeTruthy();
      expect(opp.businessIntelligence.businessModelReason).toBeTruthy();
      expect(opp.businessIntelligence.pricingModel).toBe(opp.founderIntelligence.founderOpportunity.bestPricingModel);
      expect(opp.businessIntelligence.idealCustomerProfile).toBe(opp.aiDecisionValidation.founderOpportunity.idealCustomerProfile);

      // marketIntelligence (Phase 2)
      expect(opp.marketIntelligence).toBeDefined();
      expect(opp.marketIntelligence.marketMaturity).toBe(opp.founderIntelligence.marketMaturity.maturity);
      expect(opp.marketIntelligence.competitionPressure).toBe(opp.founderIntelligence.competitionPressure.pressure);
      expect(opp.marketIntelligence.geoConcentration).toBe("UNKNOWN");
      expect(opp.marketIntelligence.industryConcentration).toBe("UNKNOWN");

      // revenueIntelligence (Phase 3)
      expect(opp.revenueIntelligence).toBeDefined();
      expect(opp.revenueIntelligence.pricingConfidence).toBe(opp.aiDecisionValidation.monetization.pricingConfidence);
      expect(opp.revenueIntelligence.possiblePricing).toBe(opp.aiDecisionValidation.monetization.possiblePricing);
      expect(opp.revenueIntelligence.revenueModel).toBe(opp.founderIntelligence.founderOpportunity.bestPricingModel);

      // mvpPlan (Phase 4)
      expect(opp.mvpPlan).toBeDefined();
      expect(opp.mvpPlan.recommendedMvp).toBe(opp.recommendedMvp);
      expect(opp.mvpPlan.estimatedTimeToMvp).toBe(opp.estimatedTimeToMvp);
      expect(opp.mvpPlan.buildDifficulty).toBe(opp.buildDifficulty.tier);
      expect(Array.isArray(opp.mvpPlan.phasedRoadmap)).toBe(true);
      expect(opp.mvpPlan.phasedRoadmap.length).toBe(3);

      // goToMarket (Phase 6)
      expect(opp.goToMarket).toBeDefined();
      expect(opp.goToMarket.launchStrategy).toBe(opp.aiDecisionValidation.founderOpportunity.suggestedLaunchStrategy);
      expect(opp.goToMarket.bestCustomer).toBe(opp.founderIntelligence.founderOpportunity.bestCustomer);
      expect(Array.isArray(opp.goToMarket.recommendedChannels)).toBe(true);
      expect(opp.goToMarket.recommendedChannels.length).toBeGreaterThan(0);

      // technicalBlueprint (Phase 5)
      expect(opp.technicalBlueprint).toBeDefined();
      expect(opp.technicalBlueprint.buildDifficulty).toBe(opp.buildDifficulty.tier);
      expect(opp.technicalBlueprint.expectedMvpComplexity).toBe(opp.founderIntelligence.founderOpportunity.expectedMvpComplexity);
      expect(opp.technicalBlueprint.advisoryDisclaimer).toContain("ADVISORY");

      // None of the 6 new bundles should still carry the construction-time
      // placeholder text once attachFounderBusinessIntelligence has run.
      expect(opp.businessIntelligence.businessModelReason).not.toContain("Placeholder");
      expect(opp.marketIntelligence.growthStageReason).not.toContain("Placeholder");
      expect(opp.revenueIntelligence.revenuePotentialReason).not.toContain("Placeholder");
      expect(opp.mvpPlan.scopeSummary).not.toContain("Placeholder");
      expect(opp.goToMarket.launchStrategy).not.toContain("Placeholder");
      expect(opp.technicalBlueprint.architectureAdviceReason).not.toContain("Placeholder");
    }
  });

  it("still preserves the pre-existing fois-descending ranking (no re-sort introduced by the new wiring step)", async () => {
    const session = buildFixtureSession();
    const { problemEngine, opportunityEngine } = harness();

    const problemReport = await problemEngine.analyze(session);
    const topReport = await opportunityEngine.analyze(session, problemReport);

    for (let i = 1; i < topReport.opportunities.length; i += 1) {
      expect(topReport.opportunities[i - 1]!.fois.overall).toBeGreaterThanOrEqual(topReport.opportunities[i]!.fois.overall);
    }
  });
});
