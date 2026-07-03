import { describe, expect, it } from "vitest";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { OpportunityRepository } from "../../src/opportunities/repository.js";
import { OpportunityEngine } from "../../src/opportunities/engine.js";
import { exportAsJson, exportAsMarkdown } from "../../src/opportunities/export.js";
import { defaultAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
import type { FounderOpportunityReport, TopOpportunitiesReport } from "../../src/opportunities/types.js";
import type { FounderReport, Opportunity, RawResearchItem, ResearchSession } from "../../src/research/types.js";

/* -------------------------------------------------------------------- */
/* Harness — mirrors engine.test.ts's real, end-to-end pipeline so the  */
/* export tests exercise the ACTUAL attachAiDecisionValidation output,  */
/* never a hand-typed stand-in for Loop 7/8 fields.                     */
/* -------------------------------------------------------------------- */

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
  return { problemEngine, opportunityEngine };
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
    id: "research_fixture_export",
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

  // Strong buying-intent cluster — mirrors engine.test.ts's fixture closely
  // enough to guarantee a real (non-placeholder) BUILD/WATCH verdict with a
  // populated aiDecisionValidation bundle.
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
      publishedAt: new Date(now - 20 * DAY_MS).toISOString(),
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
  ];

  return makeSession(opportunities, 30);
}

async function buildRealTopReport(): Promise<TopOpportunitiesReport> {
  const session = buildFixtureSession();
  const { problemEngine, opportunityEngine } = harness();
  const problemReport = await problemEngine.analyze(session);
  return opportunityEngine.analyze(session, problemReport);
}

describe("export.ts — Loop 7/8 founder intelligence rendering", () => {
  it("exportAsMarkdown renders the finalRecommendation + founderOpportunity fields already attached by ai-decision-validation.ts", async () => {
    const topReport = await buildRealTopReport();
    const opp = topReport.opportunities[0]!;
    const { finalRecommendation, founderOpportunity } = opp.aiDecisionValidation;

    const markdown = exportAsMarkdown(topReport);

    // headings
    expect(markdown).toContain("## Executive Recommendation");
    expect(markdown).toContain("### Business Playbook");
    expect(markdown).toContain("### Founder Action Plan / Next Validation Steps");
    expect(markdown).toContain("### Risks");
    expect(markdown).toContain("### Unknowns");

    // real, already-computed values — never fabricated in the exporter
    expect(markdown).toContain(finalRecommendation.executiveSummary);
    expect(markdown).toContain(finalRecommendation.recommendedAction);
    expect(markdown).toContain(finalRecommendation.evidenceSummary);
    expect(markdown).toContain(finalRecommendation.businessOpportunity);
    expect(markdown).toContain(finalRecommendation.suggestedPricingDirection);
    expect(markdown).toContain(finalRecommendation.goToMarketDirection);
    expect(markdown).toContain(founderOpportunity.idealCustomerProfile);
    expect(markdown).toContain(founderOpportunity.whoShouldNotBeTargeted);
    expect(markdown).toContain(founderOpportunity.earlyAdopterProfile);

    for (const mvpItem of finalRecommendation.recommendedMvp) {
      expect(markdown).toContain(mvpItem);
    }
    for (const step of finalRecommendation.nextValidationSteps) {
      expect(markdown).toContain(step);
    }
    for (const risk of finalRecommendation.risks) {
      expect(markdown).toContain(risk.risk);
      expect(markdown).toContain(risk.reason);
    }
    for (const unknown of finalRecommendation.unknowns) {
      expect(markdown).toContain(unknown);
    }

    // existing sections must still be present — additive, never removed/reordered
    expect(markdown).toContain("# Top Founder Opportunities");
    expect(markdown).toContain("### Score breakdown");
    expect(markdown).toContain("### Evidence");
    expect(markdown).toContain("### Build guidance");
    expect(markdown.indexOf("### Build guidance")).toBeLessThan(markdown.indexOf("## Executive Recommendation"));
  });

  it("exportAsJson already serializes the whole report, so finalRecommendation + founderOpportunity are included with no hand-picked-subset changes needed", async () => {
    const topReport = await buildRealTopReport();
    const json = exportAsJson(topReport);
    const parsed = JSON.parse(json) as TopOpportunitiesReport;

    const opp = parsed.opportunities[0]!;
    expect(opp.aiDecisionValidation).toBeDefined();
    expect(opp.aiDecisionValidation.finalRecommendation).toBeDefined();
    expect(opp.aiDecisionValidation.founderOpportunity).toBeDefined();
    expect(opp.aiDecisionValidation.finalRecommendation.executiveSummary).toBe(
      topReport.opportunities[0]!.aiDecisionValidation.finalRecommendation.executiveSummary,
    );
    expect(opp.aiDecisionValidation.founderOpportunity.idealCustomerProfile).toBe(
      topReport.opportunities[0]!.aiDecisionValidation.founderOpportunity.idealCustomerProfile,
    );
  });

  it("exportAsMarkdown degrades gracefully (UNKNOWN, no crash) when aiDecisionValidation is still the unattached placeholder", async () => {
    const topReport = await buildRealTopReport();
    const opp = topReport.opportunities[0]!;

    const placeholderOpp: FounderOpportunityReport = {
      ...opp,
      aiDecisionValidation: defaultAiDecisionValidation(),
    };
    const placeholderReport: TopOpportunitiesReport = {
      ...topReport,
      opportunities: [placeholderOpp],
    };

    expect(() => exportAsMarkdown(placeholderReport)).not.toThrow();
    const markdown = exportAsMarkdown(placeholderReport);
    expect(markdown).toContain("### Executive Recommendation");
    expect(markdown).toContain("UNKNOWN");
    expect(markdown).not.toContain("Placeholder — overwritten by attachAiDecisionValidation.");
  });
});
