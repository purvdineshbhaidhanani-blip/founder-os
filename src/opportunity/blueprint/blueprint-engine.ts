import { nowIso } from "../../utils/id.js";
import type { BusinessBlueprint, BlueprintContext } from "./types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { CourtDecision } from "../decision/types.js";
import { buildCustomerProfile } from "./customer-profiler.js";
import { analyzeCompetitors } from "./competitor-analyzer.js";
import { designProduct } from "./product-designer.js";
import { planMVP } from "./mvp-planner.js";
import { recommendPricing } from "./pricing-engine.js";
import { modelRevenue } from "./revenue-engine.js";
import { estimateCosts } from "./cost-engine.js";
import { selectTechStack } from "./tech-stack-selector.js";
import { planAPI } from "./api-planner.js";
import { planAI } from "./ai-planner.js";
import { analyzeRisks } from "./risk-analyzer.js";
import { analyzeBudget, calculateBreakeven, calculateROI } from "./financial-engine.js";
import { buildFounderRecommendation } from "./founder-recommendation.js";

// ---------------------------------------------------------------------------
// Blueprint Engine
// Orchestrates all 18 sub-engines to produce a complete BusinessBlueprint.
// ---------------------------------------------------------------------------

export function generateBlueprint(
  intelligence: OpportunityIntelligence,
  decision: CourtDecision,
): BusinessBlueprint {
  const ctx: BlueprintContext = { intelligence, decision };

  // Market & customer
  const customerProfile = buildCustomerProfile(ctx);
  const competitorAnalysis = analyzeCompetitors(ctx);

  // Product
  const productVision = designProduct(ctx);
  const mvpPlan = planMVP(ctx, productVision.coreFeatures);

  // Pricing + revenue
  const pricingRecommendation = recommendPricing(ctx);
  const revenueScenarios = modelRevenue(ctx, pricingRecommendation);

  // Costs
  const costBreakdown = estimateCosts(ctx);

  // Tech
  const { stack: techStack, architecture: architectureSummary } = selectTechStack(ctx);
  const apiPlan = planAPI(ctx);
  const aiPlan = planAI(ctx);
  const developmentTimeline = buildTimeline(ctx, costBreakdown.development.monthsToMVP);

  // Risk + finance
  const riskAnalysis = analyzeRisks(ctx);
  const budgetAnalysis = analyzeBudget(costBreakdown);
  const breakevenAnalysis = calculateBreakeven(costBreakdown, pricingRecommendation);
  const roiAnalysis = calculateROI(costBreakdown, revenueScenarios, budgetAnalysis);

  // Founder recommendation
  const founderRecommendation = buildFounderRecommendation(ctx, roiAnalysis, breakevenAnalysis, riskAnalysis);

  // Market summary
  const marketSummary = buildMarketSummary(ctx);

  // Evidence summary
  const evidenceSummary = decision.evidenceSummary.length > 0
    ? decision.evidenceSummary
    : intelligence.existingSolutionScore.solutionFailureSignals;

  // Assumptions
  const assumptions = buildAssumptions(ctx, costBreakdown, pricingRecommendation);

  return {
    opportunityId: intelligence.opportunityId,
    problemSummary: intelligence.problem,
    evidenceSummary,
    category: intelligence.category,

    customerProfile,
    marketSummary,
    competitorAnalysis,

    productVision,
    mvpPlan,

    pricingRecommendation,
    revenueScenarios,

    costBreakdown,

    techStack,
    architectureSummary,
    apiPlan,
    aiPlan,
    developmentTimeline,

    riskAnalysis,
    budgetAnalysis,
    breakevenAnalysis,
    roiAnalysis,

    assumptions,
    confidence: Math.round(intelligence.overallConfidence * decision.confidence * 100) / 100,
    founderRecommendation,

    generatedAt: nowIso(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMarketSummary(ctx: BlueprintContext): string {
  const { intelligence: intel } = ctx;
  const m = intel.marketSizeEstimate;
  const growing = intel.checks.isOpportunityGrowing ? "and growing" : "(stable)";
  return `${m.tier.charAt(0).toUpperCase() + m.tier.slice(1)} market ($${m.estimatedTAMBillions}B TAM) ${growing}. ${m.rationale}. ${intel.category} category with ${intel.sources.length} signal source(s) — confidence ${Math.round(intel.overallConfidence * 100)}%.`;
}

function buildTimeline(ctx: BlueprintContext, monthsToMVP: number): string {
  const { intelligence: intel } = ctx;
  const t = intel.technicalFeasibilityScore;
  return [
    `Month 1-2: Customer discovery + architecture design (${t.estimatedTeamSize} engineers)`,
    `Month 2-${monthsToMVP}: Core MVP development — P0 features only`,
    `Month ${monthsToMVP}: Private beta with 10 early adopters`,
    `Month ${monthsToMVP + 1}: Iterate on feedback, fix critical bugs`,
    `Month ${monthsToMVP + 2}: Public launch + pricing activation`,
    `Month ${monthsToMVP + 3}–12: Growth loop + P1 features based on retention data`,
  ].join("\n");
}

function buildAssumptions(
  ctx: BlueprintContext,
  costs: import("./types.js").CostBreakdown,
  pricing: import("./types.js").PricingRecommendation,
): string[] {
  const { intelligence: intel } = ctx;
  return [
    `Engineer cost: $${costs.development.avgMonthlySalaryPerEngineer.toLocaleString()}/mo blended (salary + benefits + tooling)`,
    `Starter price: $${pricing.tiers[0]?.monthlyPrice ?? "—"}/mo (10% of annual value delivered)`,
    `Monthly churn: 5% base case (20% annualised)`,
    `CAC: <3 months of ARPC via community-led growth`,
    `AI model costs scale linearly with usage — no sudden pricing changes`,
    `No office space required — fully remote`,
    `${intel.category} market TAM sourced from published industry research (Gartner / IDC / CB Insights)`,
    "No regulatory approval delays assumed (re-verify for healthcare/finance/legal categories)",
  ];
}
