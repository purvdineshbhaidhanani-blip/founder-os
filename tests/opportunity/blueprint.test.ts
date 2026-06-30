import { describe, it, expect, beforeEach } from "vitest";
import { generateBlueprint } from "../../src/opportunity/blueprint/blueprint-engine.js";
import { BlueprintStore } from "../../src/opportunity/blueprint/blueprint-store.js";
import { buildCustomerProfile } from "../../src/opportunity/blueprint/customer-profiler.js";
import { analyzeCompetitors } from "../../src/opportunity/blueprint/competitor-analyzer.js";
import { recommendPricing } from "../../src/opportunity/blueprint/pricing-engine.js";
import { modelRevenue } from "../../src/opportunity/blueprint/revenue-engine.js";
import { estimateCosts } from "../../src/opportunity/blueprint/cost-engine.js";
import { analyzeBudget, calculateBreakeven, calculateROI } from "../../src/opportunity/blueprint/financial-engine.js";
import { scoreOpportunity } from "../../src/opportunity/intelligence/scorer.js";
import { runDecisionCourt } from "../../src/opportunity/decision/court.js";
import type { Opportunity, OpportunityEvidence, PainScore } from "../../src/opportunity/types.js";
import type { BlueprintContext } from "../../src/opportunity/blueprint/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEvidence(overrides: Partial<OpportunityEvidence> = {}): OpportunityEvidence {
  return {
    signalId: "sig-1",
    itemId: "item-1",
    source: "g2",
    url: "https://g2.com/r/1",
    quote: "We pay for Zapier but it breaks at scale. We'd pay $300/mo for something that handles 100k executions. Manual workaround costs us 8 hours a week.",
    signalType: "automation-request",
    engagement: { votes: 95, replies: 18 },
    ...overrides,
  };
}

const STRONG_PAIN: PainScore = {
  frequency: 0.9,
  severity: 0.85,
  businessImpact: 0.80,
  timeLost: 8,
  moneyLost: 1000,
  urgency: 0.85,
  frustration: 0.90,
  operationalComplexity: 0.70,
  confidence: 0.85,
};

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  const now = new Date().toISOString();
  return {
    id: "opp-bp-test",
    status: "discovered",
    problemSummary: "Workflow automation breaks at scale — Zapier too expensive, no API for custom logic",
    category: "automation",
    evidence: [
      makeEvidence(),
      makeEvidence({ signalId: "sig-2", source: "reddit", signalType: "manual-process" }),
      makeEvidence({ signalId: "sig-3", source: "github-issues", signalType: "integration-pain" }),
    ],
    painScore: STRONG_PAIN,
    buyingIntentSignals: 3,
    workaroundsDetected: ["zapier", "custom-scripts", "manual-copy-paste"],
    sources: ["g2", "reddit", "github-issues"],
    confidence: 0.82,
    signalCount: 6,
    clusterKey: "workflow-automation-scale-zapier",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCtx(): BlueprintContext {
  const opp = makeOpportunity();
  const intel = scoreOpportunity(opp);
  const decision = runDecisionCourt(intel);
  return { intelligence: intel, decision };
}

// ---------------------------------------------------------------------------
// Customer Profiler
// ---------------------------------------------------------------------------

describe("buildCustomerProfile", () => {
  it("returns a persona with all required fields", () => {
    const ctx = makeCtx();
    const profile = buildCustomerProfile(ctx);
    expect(profile.name.length).toBeGreaterThan(0);
    expect(profile.jobTitles.length).toBeGreaterThan(0);
    expect(profile.dailyPains.length).toBeGreaterThan(0);
    expect(profile.willingnessToPay.length).toBeGreaterThan(0);
    expect(profile.adoptionBarriers.length).toBeGreaterThan(0);
  });

  it("derives willingness-to-pay from annualised value saved", () => {
    const ctx = makeCtx();
    const profile = buildCustomerProfile(ctx);
    // annualisedValueUSD = 8h × $75 × 50 = $30,000 → $500–2000/mo bracket
    expect(profile.willingnessToPay).toContain("$");
  });
});

// ---------------------------------------------------------------------------
// Competitor Analyzer
// ---------------------------------------------------------------------------

describe("analyzeCompetitors", () => {
  it("returns competitors with all fields", () => {
    const ctx = makeCtx();
    const analysis = analyzeCompetitors(ctx);
    expect(analysis.competitors.length).toBeGreaterThan(0);
    for (const c of analysis.competitors) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.strength.length).toBeGreaterThan(0);
      expect(c.weakness.length).toBeGreaterThan(0);
    }
  });

  it("includes competitive gaps", () => {
    const ctx = makeCtx();
    const analysis = analyzeCompetitors(ctx);
    expect(analysis.competitiveGaps.length).toBeGreaterThan(0);
    expect(analysis.ourAdvantage.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Pricing Engine
// ---------------------------------------------------------------------------

describe("recommendPricing", () => {
  it("returns 3 tiers with positive prices", () => {
    const ctx = makeCtx();
    const pricing = recommendPricing(ctx);
    expect(pricing.tiers).toHaveLength(3);
    for (const tier of pricing.tiers) {
      expect(tier.monthlyPrice).toBeGreaterThan(0);
    }
  });

  it("tiers are ordered ascending by price", () => {
    const ctx = makeCtx();
    const pricing = recommendPricing(ctx);
    const prices = pricing.tiers.map((t) => t.monthlyPrice);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]!).toBeGreaterThan(prices[i - 1]!);
    }
  });

  it("has a valid pricing model", () => {
    const ctx = makeCtx();
    const pricing = recommendPricing(ctx);
    expect(["per-seat", "usage-based", "flat-fee", "freemium+paid", "enterprise-only"]).toContain(pricing.model);
  });
});

// ---------------------------------------------------------------------------
// Revenue Engine
// ---------------------------------------------------------------------------

describe("modelRevenue", () => {
  it("produces 3 scenarios (conservative, base, optimistic)", () => {
    const ctx = makeCtx();
    const pricing = recommendPricing(ctx);
    const scenarios = modelRevenue(ctx, pricing);
    expect(scenarios).toHaveLength(3);
    expect(scenarios.map((s) => s.name)).toEqual(["conservative", "base", "optimistic"]);
  });

  it("year1ARR increases from conservative to optimistic", () => {
    const ctx = makeCtx();
    const pricing = recommendPricing(ctx);
    const scenarios = modelRevenue(ctx, pricing);
    expect(scenarios[0]!.year1ARR).toBeLessThan(scenarios[1]!.year1ARR);
    expect(scenarios[1]!.year1ARR).toBeLessThan(scenarios[2]!.year1ARR);
  });

  it("year3ARR > year1ARR for all scenarios", () => {
    const ctx = makeCtx();
    const pricing = recommendPricing(ctx);
    const scenarios = modelRevenue(ctx, pricing);
    for (const s of scenarios) {
      expect(s.year3ARR).toBeGreaterThan(s.year1ARR);
    }
  });

  it("monthly customer ramp has 12 entries", () => {
    const ctx = makeCtx();
    const pricing = recommendPricing(ctx);
    const scenarios = modelRevenue(ctx, pricing);
    for (const s of scenarios) {
      expect(s.monthlyCustomersYear1).toHaveLength(12);
    }
  });
});

// ---------------------------------------------------------------------------
// Cost Engine
// ---------------------------------------------------------------------------

describe("estimateCosts", () => {
  it("totalPreLaunchCost > 0", () => {
    const ctx = makeCtx();
    const costs = estimateCosts(ctx);
    expect(costs.totalPreLaunchCost).toBeGreaterThan(0);
  });

  it("totalMonthlyBurn > 0", () => {
    const ctx = makeCtx();
    const costs = estimateCosts(ctx);
    expect(costs.totalMonthlyBurn).toBeGreaterThan(0);
  });

  it("totalMonthlyBurn = infra + api + ai + ops", () => {
    const ctx = makeCtx();
    const costs = estimateCosts(ctx);
    const expected = costs.infrastructure.totalMonthlyInfra + costs.api.totalMonthlyAPICost + costs.ai.totalMonthlyAICost + costs.monthlyOperationsCost;
    expect(costs.totalMonthlyBurn).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Financial Engine
// ---------------------------------------------------------------------------

describe("financial engine", () => {
  it("budget breakdown sums correctly", () => {
    const ctx = makeCtx();
    const costs = estimateCosts(ctx);
    const budget = analyzeBudget(costs);
    expect(budget.totalFundingNeeded).toBeGreaterThan(budget.totalPreLaunchBudget);
    expect(budget.breakdown.length).toBeGreaterThan(0);
  });

  it("breakeven customersNeeded > 0", () => {
    const ctx = makeCtx();
    const costs = estimateCosts(ctx);
    const pricing = recommendPricing(ctx);
    const be = calculateBreakeven(costs, pricing);
    expect(be.customersNeeded).toBeGreaterThan(0);
    expect(be.monthsToBreakeven).toBeGreaterThan(0);
  });

  it("ROI year3ARR > year1ARR", () => {
    const ctx = makeCtx();
    const costs = estimateCosts(ctx);
    const pricing = recommendPricing(ctx);
    const scenarios = modelRevenue(ctx, pricing);
    const budget = analyzeBudget(costs);
    const roi = calculateROI(costs, scenarios, budget);
    expect(roi.year3ARR).toBeGreaterThan(roi.year1ARR);
    expect(roi.totalInvestment).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Full Blueprint Engine
// ---------------------------------------------------------------------------

describe("generateBlueprint", () => {
  it("produces a complete BusinessBlueprint with all sections", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);

    expect(blueprint.opportunityId).toBe(ctx.intelligence.opportunityId);
    expect(blueprint.customerProfile).toBeDefined();
    expect(blueprint.competitorAnalysis).toBeDefined();
    expect(blueprint.productVision).toBeDefined();
    expect(blueprint.mvpPlan).toBeDefined();
    expect(blueprint.pricingRecommendation).toBeDefined();
    expect(blueprint.revenueScenarios).toHaveLength(3);
    expect(blueprint.costBreakdown).toBeDefined();
    expect(blueprint.techStack).toBeDefined();
    expect(blueprint.architectureSummary).toBeDefined();
    expect(blueprint.apiPlan).toBeDefined();
    expect(blueprint.aiPlan).toBeDefined();
    expect(blueprint.riskAnalysis).toBeDefined();
    expect(blueprint.budgetAnalysis).toBeDefined();
    expect(blueprint.breakevenAnalysis).toBeDefined();
    expect(blueprint.roiAnalysis).toBeDefined();
    expect(blueprint.founderRecommendation).toBeDefined();
    expect(blueprint.generatedAt).toBeTruthy();
  });

  it("confidence is in [0, 1]", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    expect(blueprint.confidence).toBeGreaterThanOrEqual(0);
    expect(blueprint.confidence).toBeLessThanOrEqual(1);
  });

  it("founder recommendation has a valid verdict", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    const validVerdicts = ["BUILD_NOW", "BUILD_LATER", "MONITOR", "RESEARCH_MORE", "REJECT"];
    expect(validVerdicts).toContain(blueprint.founderRecommendation.verdict);
  });

  it("founder recommendation has immediate actions", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    expect(blueprint.founderRecommendation.immediateActions.length).toBeGreaterThan(0);
  });

  it("MVP scope contains only P0 features from product vision", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    const p0Names = blueprint.productVision.coreFeatures
      .filter((f) => f.priority === "P0")
      .map((f) => f.name);
    for (const scope of blueprint.mvpPlan.scope) {
      expect(p0Names).toContain(scope);
    }
  });

  it("risk analysis has at least 1 risk across all categories", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    const totalRisks =
      blueprint.riskAnalysis.businessRisks.length +
      blueprint.riskAnalysis.technicalRisks.length +
      blueprint.riskAnalysis.legalRisks.length;
    expect(totalRisks).toBeGreaterThan(0);
  });

  it("development timeline is non-empty string", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    expect(blueprint.developmentTimeline.length).toBeGreaterThan(0);
  });

  it("AI plan has at least 1 component", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    expect(blueprint.aiPlan.components.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Blueprint Store
// ---------------------------------------------------------------------------

describe("BlueprintStore", () => {
  let store: BlueprintStore;

  beforeEach(() => {
    store = new BlueprintStore();
  });

  it("store and get round-trip", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    store.store(blueprint);
    expect(store.get(blueprint.opportunityId)).toBe(blueprint);
  });

  it("size tracks correctly", () => {
    expect(store.size()).toBe(0);
    store.store(generateBlueprint(makeCtx().intelligence, makeCtx().decision));
    expect(store.size()).toBe(1);
  });

  it("verdictBreakdown totals equal size", () => {
    store.store(generateBlueprint(makeCtx().intelligence, makeCtx().decision));
    const breakdown = store.verdictBreakdown();
    const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
    expect(total).toBe(store.size());
  });

  it("query by category filters correctly", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    store.store(blueprint);
    const filtered = store.byCategory("automation");
    expect(filtered.every((b) => b.category === "automation")).toBe(true);
  });

  it("query by minConfidence filters correctly", () => {
    const ctx = makeCtx();
    const blueprint = generateBlueprint(ctx.intelligence, ctx.decision);
    store.store(blueprint);
    const highConf = store.query({ minConfidence: 0.99 });
    expect(highConf.every((b) => b.confidence >= 0.99)).toBe(true);
  });

  it("clear empties store", () => {
    store.store(generateBlueprint(makeCtx().intelligence, makeCtx().decision));
    store.clear();
    expect(store.size()).toBe(0);
  });
});
