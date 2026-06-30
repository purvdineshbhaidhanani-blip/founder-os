import type { CostBreakdown, PricingRecommendation, RevenueScenario, BudgetAnalysis, BreakevenAnalysis, ROIAnalysis } from "./types.js";

// ---------------------------------------------------------------------------
// Financial Engine
// Combines costs, pricing, and revenue into budget, breakeven, and ROI.
// ---------------------------------------------------------------------------

export function analyzeBudget(costs: CostBreakdown, runwayMonths = 18): BudgetAnalysis {
  const preLaunch = costs.totalPreLaunchCost;
  const postLaunchBurn = costs.totalMonthlyBurn;
  const totalFunding = preLaunch + postLaunchBurn * runwayMonths;

  const breakdown = [
    `Pre-launch development: $${preLaunch.toLocaleString()} (${costs.development.teamSize} engineers × ${costs.development.monthsToMVP} months)`,
    `Design + tooling: $${(costs.development.designCost + costs.development.toolingCost).toLocaleString()}`,
    `Monthly infrastructure (post-launch): $${costs.infrastructure.totalMonthlyInfra.toLocaleString()}/mo`,
    `Monthly AI + API costs: $${(costs.ai.totalMonthlyAICost + costs.api.totalMonthlyAPICost).toLocaleString()}/mo`,
    `Monthly operations: $${costs.monthlyOperationsCost.toLocaleString()}/mo`,
    `Total monthly burn post-launch: $${postLaunchBurn.toLocaleString()}/mo`,
    `Recommended ${runwayMonths}-month runway total: $${totalFunding.toLocaleString()}`,
  ];

  return {
    totalPreLaunchBudget: preLaunch,
    monthlyBurnPostLaunch: postLaunchBurn,
    recommendedRunwayMonths: runwayMonths,
    totalFundingNeeded: totalFunding,
    breakdown,
  };
}

export function calculateBreakeven(
  costs: CostBreakdown,
  pricing: PricingRecommendation,
): BreakevenAnalysis {
  const starterPrice = pricing.tiers[0]?.monthlyPrice ?? 99;
  const growthPrice = pricing.tiers[1]?.monthlyPrice ?? 299;
  const blendedARPC = Math.round(starterPrice * 0.70 + growthPrice * 0.30);

  // COGS margin: infra + AI per customer (rough: ~20% of ARPC)
  const cogPerCustomer = Math.round(blendedARPC * 0.20);
  const grossMarginPerCustomer = blendedARPC - cogPerCustomer;

  // Monthly burn = fixed costs only (no per-customer variable — already in COGS)
  const fixedMonthlyBurn = costs.totalMonthlyBurn;
  const customersNeeded = Math.ceil(fixedMonthlyBurn / Math.max(1, grossMarginPerCustomer));
  const monthlyRevenueAtBreakeven = customersNeeded * blendedARPC;

  // Assume linear customer growth from 0 to breakeven
  const approxMonthsToBreakeven = Math.ceil(customersNeeded / Math.max(1, Math.round(customersNeeded / 12)));

  return {
    monthsToBreakeven: Math.min(36, Math.max(6, approxMonthsToBreakeven)),
    customersNeeded,
    monthlyRevenueAtBreakeven,
    assumptions: [
      `Blended ARPC: $${blendedARPC}/mo (70% starter / 30% growth mix)`,
      `COGS: ~20% of ARPC ($${cogPerCustomer}/customer/mo)`,
      `Gross margin per customer: $${grossMarginPerCustomer}/mo`,
      `Fixed monthly burn: $${fixedMonthlyBurn.toLocaleString()}/mo`,
      "Linear customer ramp assumed",
    ],
  };
}

export function calculateROI(
  costs: CostBreakdown,
  revenues: RevenueScenario[],
  budgetAnalysis: BudgetAnalysis,
): ROIAnalysis {
  const baseCase = revenues.find((r) => r.name === "base") ?? revenues[0]!;
  const totalInvestment = budgetAnalysis.totalFundingNeeded;

  const projectedROI = Math.round(((baseCase.year3ARR - totalInvestment) / Math.max(1, totalInvestment)) * 100);

  // Approximate payback: months until cumulative revenue covers total investment
  const monthlyARRGrowth = baseCase.year1ARR / 12;
  const paybackMonths = Math.ceil(totalInvestment / Math.max(1, monthlyARRGrowth));

  return {
    totalInvestment,
    year1ARR: baseCase.year1ARR,
    year2ARR: baseCase.year2ARR,
    year3ARR: baseCase.year3ARR,
    projectedROIPercent: projectedROI,
    paybackPeriodMonths: Math.min(60, paybackMonths),
  };
}
