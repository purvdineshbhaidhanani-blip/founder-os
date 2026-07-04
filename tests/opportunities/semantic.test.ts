import { describe, expect, it } from "vitest";
import { canonicalizeProblem, mergeSynonymOpportunities } from "../../src/opportunities/semantic.js";
import { defaultCalibration } from "../../src/opportunities/calibration.js";
import { defaultFounderIntelligence } from "../../src/opportunities/founder-intelligence.js";
import { defaultAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
import {
  defaultBusinessIntelligence,
  defaultMarketIntelligence,
  defaultRevenueIntelligence,
  defaultMvpPlan,
  defaultGoToMarket,
  defaultTechnicalBlueprint,
} from "../../src/opportunities/founder-business-intelligence.js";
import { defaultKnowledgeLinks } from "../../src/opportunities/knowledge-links.js";
import { extractProblem } from "../../src/problems/extractor.js";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { OpportunityRepository } from "../../src/opportunities/repository.js";
import { OpportunityEngine } from "../../src/opportunities/engine.js";
import type { ClassifiedItem, ProblemCategory } from "../../src/problems/types.js";
import type {
  BuildDifficultyResult,
  BuyingIntentResult,
  CompetitionResult,
  FoisBreakdown,
  FounderDecision,
  FounderOpportunityReport,
  OpportunityScoreBreakdown,
  PricingSignal,
  SemanticClusterInfo,
} from "../../src/opportunities/types.js";
import type { FounderReport, Opportunity, RawResearchItem, ResearchSession } from "../../src/research/types.js";

/* -------------------------------------------------------------------- */
/* Unit-level fixtures                                                   */
/* -------------------------------------------------------------------- */

const buyingIntent: BuyingIntentResult = { score: 0, matchingItemCount: 0, totalItemCount: 1, explanation: "x" };
const competition: CompetitionResult = { competitors: [], competitionScore: 1, explanation: "x" };
const difficulty: BuildDifficultyResult = { tier: "low", matchedSignals: [], explanation: "heuristic estimate, not an engineering estimate" };
const pricing: PricingSignal = { extractedPrices: [], suggestedPriceText: "x" };

function makeScoreBreakdown(): OpportunityScoreBreakdown {
  return {
    painFrequency: 0.5,
    sourceDiversity: 0.5,
    authorDiversity: 0.5,
    buyingIntent: 0,
    engagement: 0.5,
    growth: 0.5,
    competition: 1,
    confidence: 0.5,
    weightedTotal: 0.5,
    explanation: "x",
  };
}

function makeFois(overall: number): FoisBreakdown {
  return { overall, dimensions: [], reasons: [], weaknesses: [], penalties: [] };
}

function makeDecision(): FounderDecision {
  return {
    intentDistribution: [],
    evidence: { evidenceCount: 1, uniqueSources: 1, uniqueAuthors: 1, freshness: "unknown", crossSourceAgreement: 0, echoChamber: false, explanation: "x" },
    reasoning: { whyThisMatters: "x", whyNow: "x", whoExperiences: "x", whatEvidence: "x", whyFoundersPay: "x", biggestUncertainty: "x", biggestImplementationRisk: "x" },
    confidence: { score: 50, band: "medium", contributors: [], weaknesses: [] },
    recommendation: { verdict: "WATCH", justification: "x", primaryRisk: "x", primaryOpportunity: "x" },
    qualityGates: [],
  };
}

/** Trivial placeholder — every test below calls mergeSynonymOpportunities directly, which always overwrites this. */
function makeTrivialSemanticCluster(problem: string, evidenceCount: number, sourceBreakdown: Record<string, number>): SemanticClusterInfo {
  return { canonicalTitle: problem, aliases: [], mentionCount: evidenceCount, supportingSources: Object.keys(sourceBreakdown).sort(), mergedCount: 1 };
}

function makeReport(params: {
  id: string;
  problem: string;
  foisOverall: number;
  evidenceCount: number;
  sourceBreakdown: Record<string, number>;
}): FounderOpportunityReport {
  const { id, problem, foisOverall, evidenceCount, sourceBreakdown } = params;
  return {
    id,
    clusterId: `cluster_${id}`,
    category: "complaint",
    problem,
    summary: "s",
    painScore: 0.5,
    buyingIntent,
    competition,
    confidence: { band: "medium", score: 0.5 },
    scoreBreakdown: makeScoreBreakdown(),
    fois: makeFois(foisOverall),
    supportingEvidence: { evidenceCount, sourceBreakdown, urls: [] },
    representativeQuotes: [],
    recommendedMvp: "x",
    suggestedPricing: pricing,
    targetUsers: "x",
    buildDifficulty: difficulty,
    estimatedTimeToMvp: "x",
    recommendation: { verdict: "WAIT", whyBuild: [], whyNotBuild: [], risk: [], explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    sourceProblemReportId: "report_1",
    decision: makeDecision(),
    semanticCluster: makeTrivialSemanticCluster(problem, evidenceCount, sourceBreakdown),
    calibration: defaultCalibration(),
    founderIntelligence: defaultFounderIntelligence(),
    aiDecisionValidation: defaultAiDecisionValidation(),
    businessIntelligence: defaultBusinessIntelligence(),
    marketIntelligence: defaultMarketIntelligence(),
    revenueIntelligence: defaultRevenueIntelligence(),
    mvpPlan: defaultMvpPlan(),
    goToMarket: defaultGoToMarket(),
    technicalBlueprint: defaultTechnicalBlueprint(),
    knowledgeLinks: defaultKnowledgeLinks(),
  };
}

/* -------------------------------------------------------------------- */
/* canonicalizeProblem                                                   */
/* -------------------------------------------------------------------- */

describe("canonicalizeProblem", () => {
  it("maps two differently-worded phrases from the same alias group to the same canonical name", () => {
    const a = canonicalizeProblem("We are planning our product launch for next quarter");
    const b = canonicalizeProblem("Our go to market strategy needs an overhaul");

    expect(a.canonical).toBe("Product Launch / GTM");
    expect(a.matchedAlias).toBe("product launch");
    expect(b.canonical).toBe("Product Launch / GTM");
    expect(b.matchedAlias).toBe("go to market");
    expect(a.canonical).toBe(b.canonical);
  });

  it("matches a second alias group independently (Customer Onboarding)", () => {
    const result = canonicalizeProblem("Our customer onboarding flow is confusing new users");
    expect(result.canonical).toBe("Customer Onboarding");
    expect(result.matchedAlias).not.toBeNull();
  });

  it("falls back to the trimmed input text, with matchedAlias null, for unrelated text", () => {
    const text = "Users express general dissatisfaction.";
    const result = canonicalizeProblem(text);
    expect(result.canonical).toBe(text);
    expect(result.matchedAlias).toBeNull();
  });

  /**
   * Honesty check backing semantic.ts's module-doc claim: none of the 15
   * fixed per-category CANONICAL_STATEMENTS (src/problems/extractor.ts) —
   * which is what FounderOpportunityReport.problem ALWAYS is, in the real
   * pipeline — accidentally collide with the alias map. Derives the 15
   * statements via the real (read-only) `extractProblem` rather than a
   * copy-pasted string list, so this test can't silently drift out of sync
   * with extractor.ts.
   */
  it("never matches any of the 15 fixed per-category normalizedStatement strings (proves the real-pipeline no-op claim)", () => {
    const allCategories: ProblemCategory[] = [
      "complaint",
      "feature-request",
      "bug",
      "missing-capability",
      "workflow-friction",
      "pricing-complaint",
      "migration",
      "looking-for-alternative",
      "buying-intent",
      "praise",
      "trend",
      "market-gap",
      "workaround",
      "existing-spending",
      "other",
    ];
    const dummyClassifiedItem: ClassifiedItem = {
      item: { title: "t", url: "https://example.com/x", sourceId: "src" },
      categories: [],
    };

    const collisions: string[] = [];
    for (const category of allCategories) {
      const { normalizedStatement } = extractProblem(dummyClassifiedItem, category);
      const { matchedAlias } = canonicalizeProblem(normalizedStatement);
      if (matchedAlias !== null) {
        collisions.push(`${category} -> "${normalizedStatement}" matched alias "${matchedAlias}"`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[semantic no-op proof] ${allCategories.length} fixed category statements checked, ${collisions.length} accidental alias collision(s).`);
    expect(collisions).toEqual([]);
  });
});

/* -------------------------------------------------------------------- */
/* mergeSynonymOpportunities                                             */
/* -------------------------------------------------------------------- */

describe("mergeSynonymOpportunities", () => {
  it("is a clean no-op for reports with distinct, non-colliding problem text (the common, expected case)", () => {
    const reports = [
      makeReport({ id: "opp_1", problem: "Users express general dissatisfaction.", foisOverall: 50, evidenceCount: 3, sourceBreakdown: { reddit: 3 } }),
      makeReport({ id: "opp_2", problem: "Users are requesting a new feature.", foisOverall: 60, evidenceCount: 4, sourceBreakdown: { hackernews: 4 } }),
      makeReport({ id: "opp_3", problem: "Users express willingness to pay for a solution.", foisOverall: 70, evidenceCount: 5, sourceBreakdown: { producthunt: 5 } }),
    ];

    const { merged, aliasGroups } = mergeSynonymOpportunities(reports);

    expect(merged.length).toBe(3);
    expect(merged.map((r) => r.id)).toEqual(["opp_1", "opp_2", "opp_3"]);
    expect(aliasGroups).toEqual([]);
    for (const report of merged) {
      expect(report.semanticCluster.mergedCount).toBe(1);
      expect(report.semanticCluster.aliases).toEqual([]);
      expect(report.semanticCluster.canonicalTitle).toBe(report.problem);
    }
  });

  it("merges two reports whose problem text collides under the same alias group, keeping the higher-fois.overall survivor", () => {
    const weaker = makeReport({
      id: "opp_launch",
      problem: "We are planning our product launch for next quarter",
      foisOverall: 40,
      evidenceCount: 3,
      sourceBreakdown: { reddit: 3 },
    });
    const stronger = makeReport({
      id: "opp_gtm",
      problem: "Our go to market strategy needs an overhaul",
      foisOverall: 70,
      evidenceCount: 5,
      sourceBreakdown: { hackernews: 5 },
    });

    const { merged, aliasGroups } = mergeSynonymOpportunities([weaker, stronger]);

    expect(merged).toHaveLength(1);
    const survivor = merged[0]!;
    expect(survivor.id).toBe("opp_gtm");
    expect(survivor.semanticCluster.canonicalTitle).toBe("Product Launch / GTM");
    expect(survivor.semanticCluster.aliases).toEqual(["We are planning our product launch for next quarter"]);
    expect(survivor.semanticCluster.mentionCount).toBe(8); // 3 + 5
    expect(survivor.semanticCluster.supportingSources).toEqual(["hackernews", "reddit"]);
    expect(survivor.semanticCluster.mergedCount).toBe(2);

    expect(aliasGroups).toHaveLength(1);
    expect(aliasGroups[0]!.canonical).toBe("Product Launch / GTM");
    expect(aliasGroups[0]!.survivorId).toBe("opp_gtm");
    expect(aliasGroups[0]!.mergedReportIds).toEqual(["opp_launch"]);
    expect(aliasGroups[0]!.memberProblems.sort()).toEqual(
      ["We are planning our product launch for next quarter", "Our go to market strategy needs an overhaul"].sort(),
    );

    // eslint-disable-next-line no-console
    console.log(
      `[semantic merge proof] survivor=${survivor.id} canonicalTitle="${survivor.semanticCluster.canonicalTitle}" ` +
        `aliases=${JSON.stringify(survivor.semanticCluster.aliases)} mentionCount=${survivor.semanticCluster.mentionCount} ` +
        `supportingSources=${JSON.stringify(survivor.semanticCluster.supportingSources)}`,
    );
  });

  it("preserves input order: a survivor is emitted at the position where its group was FIRST seen, not re-sorted", () => {
    const x = makeReport({ id: "opp_x", problem: "Users express general dissatisfaction.", foisOverall: 90, evidenceCount: 2, sourceBreakdown: { reddit: 2 } });
    const launchWeak = makeReport({ id: "opp_launch_weak", problem: "product launch is looming", foisOverall: 40, evidenceCount: 2, sourceBreakdown: { reddit: 2 } });
    const y = makeReport({ id: "opp_y", problem: "Users are requesting a new feature.", foisOverall: 80, evidenceCount: 2, sourceBreakdown: { reddit: 2 } });
    const launchStrong = makeReport({ id: "opp_launch_strong", problem: "our go to market plan is weak", foisOverall: 70, evidenceCount: 2, sourceBreakdown: { hackernews: 2 } });

    const { merged } = mergeSynonymOpportunities([x, launchWeak, y, launchStrong]);

    // launchStrong (higher fois) wins the "Product Launch / GTM" group, but
    // is emitted at launchWeak's ORIGINAL position (index 1), not moved to
    // the end where launchStrong itself originally appeared.
    expect(merged.map((r) => r.id)).toEqual(["opp_x", "opp_launch_strong", "opp_y"]);
  });

  it("returns an empty result for an empty input", () => {
    const { merged, aliasGroups } = mergeSynonymOpportunities([]);
    expect(merged).toEqual([]);
    expect(aliasGroups).toEqual([]);
  });
});

/* -------------------------------------------------------------------- */
/* Integration-level: real pipeline, honest no-op proof                  */
/* -------------------------------------------------------------------- */

function harness() {
  const artifacts = new ArtifactManager({ storage: new StubStorage() });
  const memory = new MemoryEngine(new InMemoryStore());
  const clusterRepository = new ClusterRepository({ artifacts, memory });
  const problemEngine = new ProblemIntelligenceEngine({ repository: clusterRepository });
  const opportunityRepository = new OpportunityRepository({ artifacts, memory });
  const opportunityEngine = new OpportunityEngine({ repository: opportunityRepository });
  return { problemEngine, opportunityEngine };
}

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

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function makeFounderReport(opportunities: Opportunity[]): FounderReport {
  return {
    topOpportunities: opportunities,
    evidence: [],
    confidenceScore: { band: "low", numericScore: 0 },
    sourceCoverage: { used: [], failed: [], skipped: [], ratio: 0 },
    generatedAt: new Date().toISOString(),
  };
}

function makeSession(opportunities: Opportunity[]): ResearchSession {
  return {
    id: "research_semantic_fixture",
    windowDays: 30,
    startedAt: new Date().toISOString(),
    sourcesUsed: [],
    sourcesFailed: [],
    sourcesSkipped: [],
    opportunities,
    report: makeFounderReport(opportunities),
    totalItemsCollected: opportunities.flatMap((o) => o.supportingItems).length,
    durationMs: 0,
  };
}

describe("Part A wired into OpportunityEngine.analyze (real pipeline)", () => {
  it("is a clean, honestly-reported no-op on a realistic multi-category fixture (category clustering already de-duplicated the synonyms upstream)", async () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://sem.example/1", title: "Willing to pay for a better tool, it costs $30", sourceId: "reddit", author: "a" }),
      makeItem({ url: "https://sem.example/2", title: "Would pay for this instead of the current mess", sourceId: "hackernews", author: "b" }),
      makeItem({ url: "https://sem.example/3", title: "This is so annoying and frustrating to use", sourceId: "reddit", author: "c" }),
      makeItem({ url: "https://sem.example/4", title: "Terrible experience, hate it, worst tool ever", sourceId: "reddit", author: "d" }),
      makeItem({ url: "https://sem.example/5", title: "I love this, amazing product, highly recommend", sourceId: "hackernews", author: "e" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Mixed", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { problemEngine, opportunityEngine } = harness();

    const problemReport = await problemEngine.analyze(session);
    const topReport = await opportunityEngine.analyze(session, problemReport);

    expect(topReport.semanticMerge).toBeDefined();
    expect(topReport.semanticMerge.aliasGroupsApplied).toBe(0);
    expect(topReport.semanticMerge.aliasGroups).toEqual([]);

    for (const opportunity of topReport.opportunities) {
      expect(opportunity.semanticCluster.mergedCount).toBe(1);
      expect(opportunity.semanticCluster.aliases).toEqual([]);
      expect(opportunity.semanticCluster.canonicalTitle).toBe(opportunity.problem);
      expect(opportunity.semanticCluster.mentionCount).toBe(opportunity.supportingEvidence.evidenceCount);
    }

    // eslint-disable-next-line no-console
    console.log(
      `[semantic real-pipeline proof] ${topReport.opportunities.length} opportunit(y/ies), ` +
        `aliasGroupsApplied=${topReport.semanticMerge.aliasGroupsApplied} (expected 0 — see semantic.ts module doc).\n` +
        topReport.opportunities
          .map((o) => `  - category=${o.category} canonicalTitle="${o.semanticCluster.canonicalTitle}" mergedCount=${o.semanticCluster.mergedCount}`)
          .join("\n"),
    );
  });
});
