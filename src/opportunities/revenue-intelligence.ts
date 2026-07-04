import type { FounderOpportunityReport, FounderPricingModel, MonetizationSupportLabel, PricingConfidence } from "./types.js";

/**
 * Phase 3 — Revenue Intelligence layer.
 *
 * A pure COMPOSITION layer over `aiDecisionValidation.monetization`,
 * `report.suggestedPricing`, and
 * `founderIntelligence.founderOpportunity.bestPricingModel` — all already
 * computed elsewhere and read-only here. No LLM call, no network, no
 * filesystem writes, no re-scan of raw evidence items, no re-derivation of
 * clustering/FOIS/decision/calibration/founderIntelligence/
 * aiDecisionValidation. This module NEVER invents a revenue number: every
 * numeric-sounding claim is either a qualitative band tied to real,
 * already-computed evidence, or the literal sentinel string
 * "NOT VERIFIED"/"not-verified" (matching `possiblePricingFor`'s convention
 * in ai-decision-validation.ts).
 */

/* ========================================================================= */
/* Revenue potential                                                        */
/* ========================================================================= */

export type RevenueBand = "high" | "medium" | "low" | "NOT VERIFIED";

/** fois "commercialPotential" dimension raw score (0-100) at/above this -> "high" revenue potential. */
const REVENUE_HIGH_RAW_THRESHOLD = 60;
/** fois "commercialPotential" dimension raw score (0-100) at/above this (and below HIGH) -> "medium". */
const REVENUE_MEDIUM_RAW_THRESHOLD = 30;

/**
 * revenuePotential is driven by fois.dimensions' "commercialPotential"
 * dimension (already computed, combining pricing evidence + category +
 * buying intent — see fois.ts) rather than a new number. When that
 * dimension is genuinely absent (should not happen — fois.ts always
 * computes a fixed set of 9 dimensions — but this module never assumes an
 * upstream invariant it cannot itself verify), the sentinel "NOT VERIFIED"
 * is returned instead of guessing a band.
 */
function revenuePotentialFor(fois: FounderOpportunityReport["fois"]): { band: RevenueBand; reason: string } {
  const dimension = fois.dimensions.find((d) => d.name === "commercialPotential");
  if (!dimension) {
    return {
      band: "NOT VERIFIED",
      reason: 'fois.dimensions contains no "commercialPotential" entry -> revenue potential cannot be assessed without inventing a number.',
    };
  }
  const band: RevenueBand =
    dimension.raw >= REVENUE_HIGH_RAW_THRESHOLD ? "high" : dimension.raw >= REVENUE_MEDIUM_RAW_THRESHOLD ? "medium" : "low";
  return {
    band,
    reason: `fois.dimensions["commercialPotential"].raw=${dimension.raw.toFixed(0)}/100 (${dimension.reason}) -> ${band} revenue potential.`,
  };
}

/* ========================================================================= */
/* Revenue model description                                                */
/* ========================================================================= */

const REVENUE_MODEL_DESCRIPTION: Record<FounderPricingModel, string> = {
  subscription: "Recurring subscription revenue, billed on a fixed cadence (e.g. monthly/annual).",
  enterprise: "Recurring, sales-led contract revenue, typically annual with a longer sales cycle.",
  freemium: "A free tier drives acquisition; recurring subscription revenue only from the converted paid tier (conversion rate NOT VERIFIED).",
  usage: "Usage-based revenue that scales with the customer's actual consumption, not a fixed recurring fee.",
  "one-time": "A single, non-recurring purchase per customer; no built-in recurring revenue component.",
};

/* ========================================================================= */
/* Upsell / cross-sell potential (from founderIntelligence.marketGaps)      */
/* ========================================================================= */

export type ExpansionBand = "high" | "medium" | "low" | "not-verified";

/** marketGaps.length at/above this -> "high" upsell potential (many evidenced gaps = many candidate paid add-ons). */
const UPSELL_HIGH_GAP_COUNT = 3;

/**
 * upsellPotential is driven by the COUNT of `founderIntelligence.marketGaps`
 * — each evidence-backed gap is a candidate paid add-on/tier, never an
 * invented feature.
 */
function upsellPotentialFor(gapCount: number): { band: ExpansionBand; reason: string } {
  if (gapCount === 0) {
    return { band: "not-verified", reason: "founderIntelligence.marketGaps is empty -> no evidenced gap exists to build an upsell surface from." };
  }
  const band: ExpansionBand = gapCount >= UPSELL_HIGH_GAP_COUNT ? "high" : "medium";
  return {
    band,
    reason: `founderIntelligence.marketGaps has ${gapCount} evidence-backed gap(s) (>= ${UPSELL_HIGH_GAP_COUNT} = high) -> each is a candidate paid add-on/tier.`,
  };
}

/** Gap names that indicate a real, evidence-backed cross-sell (integration/API-attach) surface. */
const CROSS_SELL_GAP_NAMES = new Set(["Weak Integrations", "Missing API"]);

/**
 * crossSellPotential is gated specifically on the "Weak Integrations"/
 * "Missing API" evidenced gaps (the only fixed-taxonomy gaps that map
 * directly to an attach/integration-based cross-sell motion) — never a
 * generic guess from gap count alone.
 */
function crossSellPotentialFor(gapNames: string[]): { band: ExpansionBand; reason: string } {
  const matched = gapNames.filter((name) => CROSS_SELL_GAP_NAMES.has(name));
  if (matched.length === 0) {
    return {
      band: "not-verified",
      reason: `founderIntelligence.marketGaps contains none of ${[...CROSS_SELL_GAP_NAMES].join("/")} -> no evidenced integration-based cross-sell surface.`,
    };
  }
  return {
    band: matched.length >= 2 ? "high" : "medium",
    reason: `founderIntelligence.marketGaps includes ${matched.join(", ")} -> an evidenced integration/API-attach cross-sell surface.`,
  };
}

/* ========================================================================= */
/* Result shape + entry point                                               */
/* ========================================================================= */

export interface RevenueIntelligenceResult {
  revenuePotential: RevenueBand;
  revenuePotentialReason: string;
  /** Reused verbatim from `aiDecisionValidation.monetization.pricingConfidence`. */
  pricingConfidence: PricingConfidence;
  /** Reused verbatim from `aiDecisionValidation.monetization.possiblePricing` — already gated for "NOT VERIFIED" when unbacked. */
  possiblePricing: string;
  /** Reused verbatim from `founderIntelligence.founderOpportunity.bestPricingModel`. */
  revenueModel: FounderPricingModel;
  revenueModelDescription: string;
  /** Reused verbatim from `aiDecisionValidation.monetization.subscriptionViability`. */
  subscriptionViability: MonetizationSupportLabel;
  /** Reused verbatim from `aiDecisionValidation.monetization.enterprisePotential`. */
  expansionPotential: MonetizationSupportLabel;
  upsellPotential: ExpansionBand;
  upsellPotentialReason: string;
  crossSellPotential: ExpansionBand;
  crossSellPotentialReason: string;
}

/**
 * Composes the Phase 3 Revenue Intelligence bundle from an already-populated
 * `FounderOpportunityReport`. Pure function — no side effects, no LLM call,
 * no re-derivation of any upstream field. Standalone library (mirrors
 * `src/founder-copilot`'s pattern): not wired into engine.ts.
 */
export function composeRevenueIntelligence(report: FounderOpportunityReport): RevenueIntelligenceResult {
  const { fois, aiDecisionValidation, founderIntelligence } = report;
  const { monetization } = aiDecisionValidation;
  const { bestPricingModel } = founderIntelligence.founderOpportunity;
  const marketGaps = founderIntelligence.marketGaps;

  const revenuePotential = revenuePotentialFor(fois);
  const upsellPotential = upsellPotentialFor(marketGaps.length);
  const crossSellPotential = crossSellPotentialFor(marketGaps.map((gap) => gap.gap));

  return {
    revenuePotential: revenuePotential.band,
    revenuePotentialReason: revenuePotential.reason,
    pricingConfidence: monetization.pricingConfidence,
    possiblePricing: monetization.possiblePricing,
    revenueModel: bestPricingModel,
    revenueModelDescription: REVENUE_MODEL_DESCRIPTION[bestPricingModel],
    subscriptionViability: monetization.subscriptionViability,
    expansionPotential: monetization.enterprisePotential,
    upsellPotential: upsellPotential.band,
    upsellPotentialReason: upsellPotential.reason,
    crossSellPotential: crossSellPotential.band,
    crossSellPotentialReason: crossSellPotential.reason,
  };
}
