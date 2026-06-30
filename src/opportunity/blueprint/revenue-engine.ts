import type { BlueprintContext, RevenueScenario } from "./types.js";
import type { PricingRecommendation } from "./types.js";

// ---------------------------------------------------------------------------
// Revenue Engine
// Models conservative / base / optimistic 3-year revenue scenarios.
// ---------------------------------------------------------------------------

export function modelRevenue(ctx: BlueprintContext, pricing: PricingRecommendation): RevenueScenario[] {
  const { intelligence: intel } = ctx;
  const market = intel.marketSizeEstimate;
  const starterPrice = pricing.tiers[0]?.monthlyPrice ?? 99;
  const growthPrice = pricing.tiers[1]?.monthlyPrice ?? 299;

  // Blended ARPC: mix of starter (70%) + growth (30%)
  const blendedARPC = Math.round(starterPrice * 0.70 + growthPrice * 0.30);

  // Growth multiplier by market tier
  const multiplier: Record<string, number> = {
    massive: 1.5, large: 1.25, medium: 1.0, small: 0.75, tiny: 0.5,
  };
  const m = multiplier[market.tier] ?? 1.0;

  // Customer ramp: months 1-12 (base case)
  const baseRamp = [1, 3, 6, 10, 15, 22, 30, 40, 52, 65, 80, 95].map((n) => Math.round(n * m));
  const conservativeRamp = baseRamp.map((n) => Math.round(n * 0.5));
  const optimisticRamp = baseRamp.map((n) => Math.round(n * 1.8));

  const calcARR = (ramp: number[], priceMultiplier: number): number => {
    const dec = ramp[11] ?? 0;
    return Math.round(dec * Math.round(blendedARPC * priceMultiplier) * 12);
  };

  return [
    {
      name: "conservative",
      monthlyCustomersYear1: conservativeRamp,
      avgRevenuePerCustomer: Math.round(blendedARPC * 0.8),
      year1ARR: calcARR(conservativeRamp, 0.8),
      year2ARR: Math.round(calcARR(conservativeRamp, 0.8) * 2.2),
      year3ARR: Math.round(calcARR(conservativeRamp, 0.8) * 4.5),
      assumptions: [
        "Slow word-of-mouth growth, limited marketing budget",
        "50% of base-case customer acquisition rate",
        "Higher churn (12%/yr) as product-market fit is still being refined",
        "No enterprise deals in year 1",
      ],
    },
    {
      name: "base",
      monthlyCustomersYear1: baseRamp,
      avgRevenuePerCustomer: blendedARPC,
      year1ARR: calcARR(baseRamp, 1.0),
      year2ARR: Math.round(calcARR(baseRamp, 1.0) * 2.8),
      year3ARR: Math.round(calcARR(baseRamp, 1.0) * 6.0),
      assumptions: [
        "Steady PLG growth via community and content",
        "Monthly churn at 5%",
        "First enterprise deal at month 10",
        `${market.tier} market — normal adoption curve`,
      ],
    },
    {
      name: "optimistic",
      monthlyCustomersYear1: optimisticRamp,
      avgRevenuePerCustomer: Math.round(blendedARPC * 1.3),
      year1ARR: calcARR(optimisticRamp, 1.3),
      year2ARR: Math.round(calcARR(optimisticRamp, 1.3) * 4.0),
      year3ARR: Math.round(calcARR(optimisticRamp, 1.3) * 9.0),
      assumptions: [
        "Viral adoption via community (HN / Product Hunt launch spike)",
        "Monthly churn at 2% — strong product-market fit",
        "3+ enterprise deals by end of year 1",
        "Partnership or integration deal accelerates distribution",
      ],
    },
  ];
}
