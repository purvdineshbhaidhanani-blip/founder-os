import type { BlueprintContext, PricingRecommendation, PricingTier, PricingModel } from "./types.js";

// ---------------------------------------------------------------------------
// Pricing Engine
// Derives model + tiers from value delivered and market signals.
// ---------------------------------------------------------------------------

export function recommendPricing(ctx: BlueprintContext): PricingRecommendation {
  const { intelligence: intel } = ctx;
  const annualValue = intel.humanTimeSavedScore.annualisedValueUSD;
  const market = intel.marketSizeEstimate;
  const paying = intel.checks.arePeopleAlreadyPaying;
  const category = intel.category;

  // Model selection
  let model: PricingModel;
  if (category === "developer-tools" || category === "apis" || category === "devops") {
    model = "usage-based";
  } else if (market.tier === "massive" || market.tier === "large") {
    model = "freemium+paid";
  } else if (category === "enterprise") {
    model = "enterprise-only";
  } else {
    model = "per-seat";
  }

  // Price points: rule of thumb is 10% of delivered annual value
  const starterMonthly = Math.max(29, Math.round(annualValue * 0.05 / 12));
  const growthMonthly = Math.max(99, Math.round(annualValue * 0.10 / 12));
  const enterpriseMonthly = Math.max(499, Math.round(annualValue * 0.20 / 12));

  // Round to clean numbers
  const clean = (n: number) => Math.round(n / 10) * 10;

  const tiers: PricingTier[] = [
    {
      name: "Starter",
      monthlyPrice: clean(starterMonthly),
      description: "For individuals and small teams — core workflow automation",
      targetSegment: "Solopreneurs, freelancers, small teams <10",
    },
    {
      name: "Growth",
      monthlyPrice: clean(growthMonthly),
      description: "For scaling teams — full feature access + integrations",
      targetSegment: "Teams 10–100, growth-stage companies",
    },
    {
      name: "Enterprise",
      monthlyPrice: clean(enterpriseMonthly),
      description: "Custom contracts, SSO, dedicated support, SLA",
      targetSegment: "Companies 100+ with security and compliance needs",
    },
  ];

  const rationale = buildPricingRationale(model, annualValue, paying, clean(starterMonthly));

  return {
    model,
    tiers,
    freeTrialDays: model === "freemium+paid" ? 0 : 14,
    annualDiscount: 0.20,
    rationale,
  };
}

function buildPricingRationale(model: PricingModel, annualValue: number, paying: boolean, starterPrice: number): string {
  const valueCapture = Math.round((starterPrice * 12 / Math.max(1, annualValue)) * 100);
  const parts = [
    `Model: ${model} — captures ~${valueCapture}% of annual value delivered ($${annualValue.toLocaleString()})`,
    paying ? "Budget signal confirmed — users already paying for inferior alternatives" : "No confirmed budget — freemium/trial lowers adoption barrier",
    "20% discount on annual plan incentivises upfront cash + reduces churn",
  ];
  return parts.join(". ");
}
