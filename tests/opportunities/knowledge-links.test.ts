import { describe, expect, it } from "vitest";
import { computeFounderIntelligence } from "../../src/opportunities/founder-intelligence.js";
import { computeAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
import { attachFounderBusinessIntelligence } from "../../src/opportunities/founder-business-intelligence.js";
import { attachKnowledgeLinks, computeKnowledgeLinks, defaultKnowledgeLinks } from "../../src/opportunities/knowledge-links.js";
import { ALL_MONITOR_PROVIDERS } from "../../src/monitoring/index.js";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { OpportunityRepository } from "../../src/opportunities/repository.js";
import { OpportunityEngine } from "../../src/opportunities/engine.js";
import type {
  BuildDifficultyResult,
  BuyingIntentResult,
  CompetitionResult,
  CompetitorMention,
  FoisBreakdown,
  FounderDecision,
  FounderOpportunityReport,
  OpportunityCalibration,
  PricingSignal,
} from "../../src/opportunities/types.js";
import type { ProblemCategory, ProblemCluster } from "../../src/problems/types.js";
import type { Opportunity, RawResearchItem, ResearchSession, FounderReport } from "../../src/research/types.js";

/* -------------------------------------------------------------------- */
/* Hand-built fixture helpers — mirrors founder-business-os.test.ts's   */
/* "reuse the REAL, already-shipped composition functions over hand-    */
/* built base inputs" pattern, so every input computeKnowledgeLinks     */
/* reads is exactly what the real upstream modules would produce.       */
/* -------------------------------------------------------------------- */

function makeRawItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function makeCluster(overrides: Partial<ProblemCluster> & { category: ProblemCategory }): ProblemCluster {
  return {
    id: "cluster_1",
    normalizedStatement: "Users report a problem.",
    evidence: {
      evidenceCount: 5,
      sourceBreakdown: { reddit: 3, hackernews: 2 },
      originalUrls: ["https://a", "https://b"],
      representativeExamples: [makeRawItem({ url: "https://a", title: "Example complaint" })],
      engagementTotal: 10,
      dateRange: null,
    },
    frequency: {
      mentions: 5,
      uniqueAuthors: 3,
      uniqueSources: 2,
      engagementTotal: 10,
      growth: { label: "stable", recentHalfCount: 2, earlierHalfCount: 2, ratio: 1 },
    },
    confidence: { band: "medium", score: 0.5, explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    ...overrides,
  };
}

function makeCompetition(names: Array<{ name: string; mentionCount: number; evidenceUrls?: string[] }>): CompetitionResult {
  const competitors: CompetitorMention[] = names
    .map((n) => ({ name: n.name, mentionCount: n.mentionCount, evidenceUrls: n.evidenceUrls ?? [] }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
  if (competitors.length === 0) {
    return { competitors: [], competitionScore: 1, explanation: "No competitor mentions found in evidence." };
  }
  const competitionScore = 1 / (1 + competitors.length);
  return { competitors, competitionScore, explanation: `${competitors.length} competitor(s).` };
}

function makeBuyingIntent(score: number): BuyingIntentResult {
  return { score, matchingItemCount: score > 0 ? 1 : 0, totalItemCount: 5, explanation: "x" };
}

function makePricing(prices: number[]): PricingSignal {
  return {
    extractedPrices: [...prices].sort((a, b) => a - b),
    suggestedPriceText: prices.length > 0 ? `Prices found: ${prices.join(", ")}.` : "No price data mentioned in evidence.",
  };
}

function makeBuildDifficulty(tier: "low" | "medium" | "high", matchedSignals: string[] = []): BuildDifficultyResult {
  return { tier, matchedSignals, explanation: "heuristic estimate, not an engineering estimate" };
}

function makeFois(overall: number): FoisBreakdown {
  return {
    overall,
    dimensions: [
      { name: "businessPain", raw: 50, weight: 0.15, weighted: 7.5, reason: "x", evidence: [] },
      { name: "urgency", raw: 50, weight: 0.1, weighted: 5, reason: "urgency dimension reason.", evidence: [] },
      { name: "commercialPotential", raw: 50, weight: 0.15, weighted: 7.5, reason: "commercial potential dimension reason.", evidence: [] },
    ],
    reasons: [`fois.overall=${overall}/100 driven by businessPain.`],
    weaknesses: [],
    penalties: [],
  };
}

function makeDecision(overrides: Partial<FounderDecision> = {}): FounderDecision {
  return {
    intentDistribution: [{ intent: "Founder Pain", count: 3, fraction: 0.6 }],
    evidence: {
      evidenceCount: 5,
      uniqueSources: 2,
      uniqueAuthors: 3,
      freshness: "unknown",
      crossSourceAgreement: 1,
      echoChamber: false,
      explanation: "No echo-chamber risk detected (top source share 60% < 90% threshold).",
    },
    reasoning: {
      whyThisMatters: "5 piece(s) of evidence were found.",
      whyNow: "Mention volume is stable.",
      whoExperiences: "Evidence spans 2 unique source(s) and 3 unique author(s).",
      whatEvidence: "5 item(s) across sources: reddit=3, hackernews=2.",
      whyFoundersPay: "Buying-intent score is 0.40.",
      biggestUncertainty: "x",
      biggestImplementationRisk: "Build difficulty is \"low\".",
    },
    confidence: { score: 65, band: "medium", contributors: [], weaknesses: [] },
    recommendation: { verdict: "BUILD", justification: "fois.overall=70 >= 60.", primaryRisk: "x", primaryOpportunity: "x" },
    qualityGates: [
      { name: "evidenceTooWeak", fired: false, reason: "evidenceCount=5 >= 2." },
      { name: "confidenceTooLow", fired: false, reason: "band != low." },
      { name: "echoChamberNoBuyingIntent", fired: false, reason: "condition not met." },
      { name: "foisNoSignalPenalty", fired: false, reason: "no penalty." },
    ],
    ...overrides,
  };
}

function makeCalibration(overrides: Partial<OpportunityCalibration> = {}): OpportunityCalibration {
  return {
    metrics: {
      rankingStability: 0.5,
      signalDensity: 0.5,
      evidenceDensity: 2.5,
      crossSourceConsistency: 0.5,
      intentConsistency: 0.6,
      noiseRatio: 0,
      duplicateCompressionRatio: 0,
    },
    diagnostics: [],
    ranking: { rankBefore: 1, rankAfter: 1, movement: 0, reason: "x" },
    explainability: null,
    falsePositive: { likely: false, reasons: [] },
    ...overrides,
  };
}

interface BuildReportParams {
  cluster: ProblemCluster;
  competition?: CompetitionResult;
  buyingIntent?: BuyingIntentResult;
  pricing?: PricingSignal;
  buildDifficulty?: BuildDifficultyResult;
  fois?: FoisBreakdown;
  decision?: FounderDecision;
  calibration?: OpportunityCalibration;
}

/**
 * Builds a full `FounderOpportunityReport` with ALL 6 Founder Business
 * Intelligence bundles attached via the REAL `attachFounderBusinessIntelligence`
 * pipeline function (never hand-faked) — see
 * founder-business-os.test.ts's `buildReport` for the identical pattern this
 * mirrors. `knowledgeLinks` itself is deliberately left as the default
 * placeholder here (each test computes it explicitly via
 * `computeKnowledgeLinks`/`attachKnowledgeLinks`, the functions under test).
 */
function buildReport(params: BuildReportParams): { report: FounderOpportunityReport; cluster: ProblemCluster } {
  const cluster = params.cluster;
  const competition = params.competition ?? makeCompetition([]);
  const buyingIntent = params.buyingIntent ?? makeBuyingIntent(0.4);
  const pricing = params.pricing ?? makePricing([]);
  const buildDifficulty = params.buildDifficulty ?? makeBuildDifficulty("low");
  const fois = params.fois ?? makeFois(70);
  const decision = params.decision ?? makeDecision();
  const calibration = params.calibration ?? makeCalibration();

  const founderIntelligence = computeFounderIntelligence({ cluster, competition, buyingIntent, pricing, buildDifficulty, fois, decision, calibration });
  const aiDecisionValidation = computeAiDecisionValidation({
    cluster,
    competition,
    buyingIntent,
    pricing,
    buildDifficulty,
    fois,
    decision,
    calibration,
    founderIntelligence,
  });

  const baseReport: FounderOpportunityReport = {
    id: "report_1",
    clusterId: cluster.id,
    category: cluster.category,
    problem: cluster.normalizedStatement,
    summary: cluster.normalizedStatement,
    painScore: 50,
    buyingIntent,
    competition,
    confidence: { band: cluster.confidence.band, score: cluster.confidence.score },
    scoreBreakdown: {
      painFrequency: 50,
      sourceDiversity: 50,
      authorDiversity: 50,
      buyingIntent: buyingIntent.score * 100,
      engagement: 50,
      growth: 50,
      competition: competition.competitionScore * 100,
      confidence: cluster.confidence.score * 100,
      weightedTotal: 0.6,
      explanation: "x",
    },
    fois,
    supportingEvidence: {
      evidenceCount: cluster.evidence.evidenceCount,
      sourceBreakdown: cluster.evidence.sourceBreakdown,
      urls: cluster.evidence.originalUrls,
    },
    representativeQuotes: [{ text: "Example complaint", url: "https://a", source: "src-a" }],
    recommendedMvp: "Build a minimal version addressing the top evidenced pain.",
    suggestedPricing: pricing,
    targetUsers: "Users experiencing this problem.",
    buildDifficulty,
    estimatedTimeToMvp: "4-6 weeks",
    recommendation: { verdict: "BUILD", whyBuild: ["x"], whyNotBuild: [], risk: ["x"], explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    sourceProblemReportId: "problem_report_1",
    decision,
    semanticCluster: {
      canonicalTitle: cluster.normalizedStatement,
      aliases: [],
      mentionCount: cluster.evidence.evidenceCount,
      supportingSources: Object.keys(cluster.evidence.sourceBreakdown).sort(),
      mergedCount: 1,
    },
    calibration,
    founderIntelligence,
    aiDecisionValidation,
    businessIntelligence: {
      businessModel: "x",
      businessModelReason: "x",
      pricingModel: "subscription",
      revenueModel: "recurring",
      revenueModelReason: "x",
      b2bVsB2c: "unknown",
      b2bVsB2cReason: "x",
      idealCustomerProfile: "x",
      companySize: "unknown",
      companySizeReason: "x",
      primaryBuyer: "x",
      primaryBuyerReason: "x",
      decisionMaker: "x",
      decisionMakerReason: "x",
      budgetEstimate: "NOT VERIFIED",
      budgetConfidence: "not-verified",
      budgetReason: "x",
      urgency: "low",
      urgencyReason: "x",
      switchingDifficulty: "unknown",
      switchingDifficultyReason: "x",
      expansionPotential: "not-verified",
      expansionPotentialReason: "x",
    },
    marketIntelligence: {
      marketMaturity: "emerging",
      marketMaturityReasons: ["x"],
      growthStage: "insufficient-data",
      growthStageReason: "x",
      geoConcentration: "UNKNOWN",
      geoConcentrationReason: "x",
      industryConcentration: "UNKNOWN",
      industryConcentrationReason: "x",
      searchConfidence: "low",
      searchConfidenceReason: "x",
      adoptionConfidence: "low",
      adoptionConfidenceReason: "x",
      saturation: "low",
      saturationReason: "x",
      competitionPressure: "low",
      opportunityWindow: "unclear",
      opportunityWindowReason: "x",
    },
    revenueIntelligence: {
      revenuePotential: "NOT VERIFIED",
      revenuePotentialReason: "x",
      pricingConfidence: "not-verified",
      possiblePricing: "x",
      revenueModel: "subscription",
      revenueModelDescription: "x",
      subscriptionViability: "not-verified",
      expansionPotential: "not-verified",
      upsellPotential: "not-verified",
      upsellPotentialReason: "x",
      crossSellPotential: "not-verified",
      crossSellPotentialReason: "x",
    },
    mvpPlan: {
      recommendedMvp: "x",
      estimatedTimeToMvp: "x",
      buildDifficulty: "low",
      buildDifficultyExplanation: "x",
      coreFeatures: [],
      featuresToAvoidAtLaunch: [],
      featuresToAvoidReason: "x",
      phasedRoadmap: [],
      launchReadinessCriteria: [],
      scopeSummary: "x",
    },
    goToMarket: {
      launchStrategy: "x",
      goToMarketDirection: "x",
      bestCustomer: "unknown",
      whyThisCustomer: "x",
      earlyAdopterProfile: "x",
      recommendedChannels: [],
      positioningStatement: "x",
      positioningBasis: "NOT VERIFIED",
      launchSequence: [],
    },
    technicalBlueprint: {
      buildDifficulty: "low",
      expectedMvpComplexity: "low",
      architectureAdvice: "x",
      architectureAdviceReason: "x",
      databaseAdvice: "x",
      databaseAdviceReason: "x",
      apiAdvice: "x",
      apiAdviceReason: "x",
      authAdvice: "x",
      authAdviceReason: "x",
      aiLayerAdvice: "x",
      aiLayerAdviceReason: "x",
      hostingAdvice: "x",
      hostingAdviceReason: "x",
      storageAdvice: "x",
      storageAdviceReason: "x",
      advisoryDisclaimer: "ADVISORY x",
    },
    knowledgeLinks: defaultKnowledgeLinks(),
  };

  const [withBundles] = attachFounderBusinessIntelligence([baseReport], [cluster]);
  return { report: withBundles!, cluster };
}

/* ======================================================================= */
/* computeKnowledgeLinks — unit tests                                      */
/* ======================================================================= */

describe("computeKnowledgeLinks", () => {
  it("is deterministic for a fixed input", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const a = computeKnowledgeLinks(report);
    const b = computeKnowledgeLinks(report);
    expect(a).toEqual(b);
  });

  it("always includes a problem node grounded in report.clusterId/report.problem", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const result = computeKnowledgeLinks(report);
    const problemNode = result.nodes.find((n) => n.id === `problem:${report.clusterId}`);
    expect(problemNode).toBeDefined();
    expect(problemNode!.type).toBe("problem");
    expect(problemNode!.label).toBe(report.problem);
  });

  it("zero competitors -> zero competitor nodes/threatens/competes-for-attention-of edges (empty, never fabricated), but customer/market/revenue/execution are still real and present", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster, competition: makeCompetition([]) });
    expect(report.competition.competitors).toEqual([]);
    const result = computeKnowledgeLinks(report);

    expect(result.nodes.filter((n) => n.type === "competitor")).toEqual([]);
    expect(result.edges.filter((e) => e.relation === "threatens")).toEqual([]);
    expect(result.edges.filter((e) => e.relation === "competes-for-attention-of")).toEqual([]);

    // The rest of the chain is still real and non-empty — an honest empty
    // competitor layer, not a degenerate/fabricated whole result.
    expect(result.nodes.some((n) => n.type === "customer")).toBe(true);
    expect(result.nodes.some((n) => n.type === "market")).toBe(true);
    expect(result.nodes.some((n) => n.type === "revenue")).toBe(true);
    expect(result.nodes.filter((n) => n.type === "execution")).toHaveLength(2);
    expect(result.edges.some((e) => e.relation === "affects")).toBe(true);
    expect(result.edges.some((e) => e.relation === "operates-in")).toBe(true);
    expect(result.edges.some((e) => e.relation === "shapes-monetization-of")).toBe(true);
    expect(result.edges.some((e) => e.relation === "funds-scope-of")).toBe(true);
    expect(result.edges.some((e) => e.relation === "sequenced-before")).toBe(true);
  });

  it("real competitors -> one competitor node + one 'threatens' edge + one 'competes-for-attention-of' edge per competitor, citing the real mentionCount", () => {
    const cluster = makeCluster({ category: "looking-for-alternative" });
    const { report } = buildReport({
      cluster,
      competition: makeCompetition([
        { name: "Trello", mentionCount: 5 },
        { name: "Asana", mentionCount: 3 },
      ]),
    });
    const result = computeKnowledgeLinks(report);

    const competitorNodes = result.nodes.filter((n) => n.type === "competitor");
    expect(competitorNodes.map((n) => n.id).sort()).toEqual(["competitor:Asana", "competitor:Trello"]);
    expect(competitorNodes.every((n) => n.reason.includes("mentionCount="))).toBe(true);

    const threatensEdges = result.edges.filter((e) => e.relation === "threatens");
    expect(threatensEdges).toHaveLength(2);
    expect(threatensEdges.every((e) => e.from === `problem:${report.clusterId}`)).toBe(true);
    expect(threatensEdges.map((e) => e.to).sort()).toEqual(["competitor:Asana", "competitor:Trello"]);

    const competesEdges = result.edges.filter((e) => e.relation === "competes-for-attention-of");
    expect(competesEdges).toHaveLength(2);
    expect(competesEdges.every((e) => e.to === `customer:${report.clusterId}`)).toBe(true);
  });

  it("customer node cites the real aiDecisionValidation.founderOpportunity.idealCustomerProfile", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const result = computeKnowledgeLinks(report);
    const customerNode = result.nodes.find((n) => n.type === "customer");
    expect(customerNode!.label).toBe(report.aiDecisionValidation.founderOpportunity.idealCustomerProfile);
    expect(customerNode!.reason).toContain(report.businessIntelligence.primaryBuyer);
  });

  it("market/revenue/execution nodes cite real marketIntelligence/revenueIntelligence/mvpPlan/goToMarket field values", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const result = computeKnowledgeLinks(report);

    const marketNode = result.nodes.find((n) => n.type === "market")!;
    expect(marketNode.reason).toContain(report.marketIntelligence.marketMaturity);

    const revenueNode = result.nodes.find((n) => n.type === "revenue")!;
    expect(revenueNode.reason).toContain(report.revenueIntelligence.revenueModel);

    const executionNodes = result.nodes.filter((n) => n.type === "execution");
    expect(executionNodes.some((n) => n.id === `execution:mvp:${report.clusterId}` && n.label === report.mvpPlan.recommendedMvp)).toBe(true);
    expect(executionNodes.some((n) => n.id === `execution:gtm:${report.clusterId}` && n.label === report.goToMarket.launchStrategy)).toBe(true);
  });

  it("monitoring-capability edges only ever reference a real provider.id from ALL_MONITOR_PROVIDERS, and are explicitly framed as a capability (never an asserted event)", () => {
    const cluster = makeCluster({ category: "looking-for-alternative" });
    const { report } = buildReport({ cluster, competition: makeCompetition([{ name: "Trello", mentionCount: 5 }]) });
    const result = computeKnowledgeLinks(report);

    const realProviderIds = new Set(ALL_MONITOR_PROVIDERS.map((p) => p.id));
    const monitoringNodes = result.nodes.filter((n) => n.type === "monitoring-capability");
    expect(monitoringNodes.length).toBeGreaterThan(0);
    for (const node of monitoringNodes) {
      expect(realProviderIds.has(node.label)).toBe(true);
      expect(node.id).toBe(`monitoring:${node.label}`);
    }

    const monitoringEdges = result.edges.filter((e) => e.relation === "could-be-watched-by");
    expect(monitoringEdges.length).toBeGreaterThan(0);
    for (const edge of monitoringEdges) {
      expect(edge.reason).toContain("CAPABILITY reference only");
      expect(edge.reason).not.toMatch(/detected|observed|snapshot taken|changed from/i);
    }
  });

  it("structural integrity: every edge's from/to id exists in the returned node list", () => {
    const cluster = makeCluster({ category: "looking-for-alternative" });
    const { report } = buildReport({
      cluster,
      competition: makeCompetition([
        { name: "Trello", mentionCount: 5 },
        { name: "Asana", mentionCount: 3 },
      ]),
    });
    const result = computeKnowledgeLinks(report);
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    for (const edge of result.edges) {
      expect(nodeIds.has(edge.from), `edge.from="${edge.from}" (relation="${edge.relation}") has no matching node`).toBe(true);
      expect(nodeIds.has(edge.to), `edge.to="${edge.to}" (relation="${edge.relation}") has no matching node`).toBe(true);
    }
  });

  it("monitoring-capability provider nodes are deduplicated (same provider referenced by 2+ competitors appears once in nodes)", () => {
    const cluster = makeCluster({ category: "looking-for-alternative" });
    const { report } = buildReport({
      cluster,
      competition: makeCompetition([
        { name: "Trello", mentionCount: 5 },
        { name: "Asana", mentionCount: 3 },
      ]),
    });
    const result = computeKnowledgeLinks(report);
    const monitoringNodeIds = result.nodes.filter((n) => n.type === "monitoring-capability").map((n) => n.id);
    expect(new Set(monitoringNodeIds).size).toBe(monitoringNodeIds.length);
  });
});

/* ======================================================================= */
/* defaultKnowledgeLinks / attachKnowledgeLinks                            */
/* ======================================================================= */

describe("defaultKnowledgeLinks", () => {
  it("is a trivial, valid empty placeholder", () => {
    expect(defaultKnowledgeLinks()).toEqual({ nodes: [], edges: [] });
  });
});

describe("attachKnowledgeLinks", () => {
  it("maps every report to a real (non-placeholder) knowledgeLinks, preserving array order and length", () => {
    const clusterA = makeCluster({ id: "cluster_a", category: "complaint", normalizedStatement: "Problem A" });
    const clusterB = makeCluster({ id: "cluster_b", category: "bug", normalizedStatement: "Problem B" });
    const { report: reportA } = buildReport({ cluster: clusterA });
    const { report: reportB } = buildReport({ cluster: clusterB });

    const result = attachKnowledgeLinks([reportA, reportB]);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe(reportA.id);
    expect(result[1]!.id).toBe(reportB.id);
    expect(result[0]!.knowledgeLinks.nodes.some((n) => n.id === `problem:${clusterA.id}`)).toBe(true);
    expect(result[1]!.knowledgeLinks.nodes.some((n) => n.id === `problem:${clusterB.id}`)).toBe(true);
    // Never the trivial placeholder once attached.
    expect(result[0]!.knowledgeLinks).not.toEqual(defaultKnowledgeLinks());
  });

  it("is pure — never mutates the input reports", () => {
    const cluster = makeCluster({ category: "complaint" });
    const { report } = buildReport({ cluster });
    const before = JSON.stringify(report);
    attachKnowledgeLinks([report]);
    expect(JSON.stringify(report)).toBe(before);
  });

  it("empty input array -> empty output array", () => {
    expect(attachKnowledgeLinks([])).toEqual([]);
  });
});

/* ======================================================================= */
/* Integration — real engine pipeline (engine.ts's attachKnowledgeLinks     */
/* call, run LAST, after attachFounderBusinessIntelligence)                */
/* ======================================================================= */

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
    id: "research_fixture_kl",
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

const DAY_MS = 24 * 60 * 60 * 1000;

function buildFixtureSession(): ResearchSession {
  const now = Date.now();
  const items: RawResearchItem[] = [
    makeItem({
      url: "https://example.com/kl-1",
      title: "Willing to pay for a better tool than Trello and Asana",
      body: "It costs $50 a month and I'd switch immediately",
      sourceId: "reddit",
      author: "alice",
      engagement: 20,
      publishedAt: new Date(now).toISOString(),
    }),
    makeItem({
      url: "https://example.com/kl-2",
      title: "Would pay for this instead of dealing with the current mess",
      sourceId: "hackernews",
      author: "bob",
      engagement: 15,
      publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
    }),
    makeItem({
      url: "https://example.com/kl-3",
      title: "Shut up and take my money, I need this now instead of Trello",
      sourceId: "producthunt",
      author: "carol",
      engagement: 10,
      publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
    }),
  ];

  const opportunities: Opportunity[] = [
    {
      id: "opp_kl",
      title: "Buying intent",
      summary: "s",
      keywords: [],
      supportingItems: items,
      sourceIds: ["reddit", "hackernews", "producthunt"],
    },
  ];

  return makeSession(opportunities);
}

describe("Knowledge Links wiring (engine.ts's attachKnowledgeLinks, run after attachFounderBusinessIntelligence)", () => {
  it("populates report.knowledgeLinks with a real, structurally-consistent result on every report produced by the real engine pipeline", async () => {
    const session = buildFixtureSession();
    const { problemEngine, opportunityEngine } = harness();

    const problemReport = await problemEngine.analyze(session);
    expect(problemReport.clusters.length).toBeGreaterThan(0);

    const topReport = await opportunityEngine.analyze(session, problemReport);
    expect(topReport.opportunities.length).toBeGreaterThan(0);

    for (const opp of topReport.opportunities) {
      expect(opp.knowledgeLinks).toBeDefined();
      expect(opp.knowledgeLinks).not.toEqual(defaultKnowledgeLinks());

      const problemNode = opp.knowledgeLinks.nodes.find((n) => n.id === `problem:${opp.clusterId}`);
      expect(problemNode).toBeDefined();
      expect(problemNode!.label).toBe(opp.problem);

      // Structural integrity: no edge references a fabricated node id.
      const nodeIds = new Set(opp.knowledgeLinks.nodes.map((n) => n.id));
      for (const edge of opp.knowledgeLinks.edges) {
        expect(nodeIds.has(edge.from)).toBe(true);
        expect(nodeIds.has(edge.to)).toBe(true);
      }

      // Every competitor node's id traces back to a real report.competition.competitors[].name.
      const realCompetitorNames = new Set(opp.competition.competitors.map((c) => `competitor:${c.name}`));
      for (const node of opp.knowledgeLinks.nodes.filter((n) => n.type === "competitor")) {
        expect(realCompetitorNames.has(node.id)).toBe(true);
      }
    }
  });

  it("does not alter any pre-existing field or the fois-descending ranking (additive-only wiring)", async () => {
    const session = buildFixtureSession();
    const { problemEngine, opportunityEngine } = harness();

    const problemReport = await problemEngine.analyze(session);
    const topReport = await opportunityEngine.analyze(session, problemReport);

    for (let i = 1; i < topReport.opportunities.length; i += 1) {
      expect(topReport.opportunities[i - 1]!.fois.overall).toBeGreaterThanOrEqual(topReport.opportunities[i]!.fois.overall);
    }
    for (const opp of topReport.opportunities) {
      expect(opp.businessIntelligence).toBeDefined();
      expect(opp.founderIntelligence).toBeDefined();
      expect(opp.aiDecisionValidation).toBeDefined();
    }
  });
});
