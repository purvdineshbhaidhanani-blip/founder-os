import type { ProblemCluster } from "../problems/types.js";
import type { FounderOpportunityReport } from "./types.js";
import { composeBusinessIntelligence, type BusinessIntelligenceResult } from "./business-intelligence.js";
import { composeMarketIntelligence, type MarketIntelligenceResult } from "./market-intelligence.js";
import { composeRevenueIntelligence, type RevenueIntelligenceResult } from "./revenue-intelligence.js";
import { generateMvpScope, type MvpScopeResult } from "./mvp-generator.js";
import { composeGoToMarket, type GoToMarketResult } from "./go-to-market.js";
import { composeTechnicalBlueprint, type TechnicalBlueprintResult } from "./technical-blueprint.js";

/**
 * Founder Business Intelligence wiring layer.
 *
 * Wires the 6 standalone Phase 1-6 founder-business-synthesis modules
 * (business-intelligence.ts, market-intelligence.ts, revenue-intelligence.ts,
 * mvp-generator.ts, go-to-market.ts, technical-blueprint.ts) into the
 * `FounderOpportunityReport` pipeline as ADDITIVE report fields.
 *
 * DESIGN DECISION (documented per the wiring mission): a single COMBINED
 * `attachFounderBusinessIntelligence` is used — one pipeline step in
 * engine.ts, rather than 6 separate attach calls — because all 6 compose
 * functions share the same read-only inputs (`report.founderIntelligence`,
 * `report.aiDecisionValidation`, etc.) and the same "map the already-ranked,
 * already-sliced list, preserve order, look up the source cluster once"
 * shape as calibration.ts's `attachCalibration` / founder-intelligence.ts's
 * `attachFounderIntelligence` / ai-decision-validation.ts's
 * `attachAiDecisionValidation`. Combining them avoids 6x the engine.ts churn
 * and 6x the O(n) `clusters` map-building for no benefit, while still
 * calling each module's own pure `compose*`/`generate*` function exactly
 * once per opportunity with zero re-derivation.
 *
 * Every one of the 6 compose functions is itself a pure COMPOSITION layer
 * that reads already-computed fields off the report (`founderIntelligence`,
 * `aiDecisionValidation`, `fois`, `calibration`, `decision`, ...) — see each
 * module's own doc comment for its exact input list. This wiring layer does
 * not add, remove, or alter any of those rules; it only calls them, in the
 * correct order (after `founderIntelligence` and `aiDecisionValidation` are
 * both real, final values — never placeholders) and attaches their results.
 */

/**
 * Trivial, type-valid placeholder bundle — set at report-construction time
 * in engine.ts's `buildOpportunityReport` (before the source ProblemCluster
 * can be looked back up post-Top-N-slice), always overwritten by
 * `attachFounderBusinessIntelligence` for every surviving report. Mirrors
 * calibration.ts's `defaultCalibration()` / founder-intelligence.ts's
 * `defaultFounderIntelligence()` / ai-decision-validation.ts's
 * `defaultAiDecisionValidation()` pattern exactly.
 */
export function defaultBusinessIntelligence(): BusinessIntelligenceResult {
  const placeholder = "Placeholder — overwritten by attachFounderBusinessIntelligence.";
  return {
    businessModel: "UNKNOWN",
    businessModelReason: placeholder,
    pricingModel: "freemium",
    revenueModel: "recurring",
    revenueModelReason: placeholder,
    b2bVsB2c: "unknown",
    b2bVsB2cReason: placeholder,
    idealCustomerProfile: placeholder,
    companySize: "unknown",
    companySizeReason: placeholder,
    primaryBuyer: "UNKNOWN",
    primaryBuyerReason: placeholder,
    decisionMaker: "UNKNOWN",
    decisionMakerReason: placeholder,
    budgetEstimate: "NOT VERIFIED",
    budgetConfidence: "not-verified",
    budgetReason: placeholder,
    urgency: "low",
    urgencyReason: placeholder,
    switchingDifficulty: "unknown",
    switchingDifficultyReason: placeholder,
    expansionPotential: "not-verified",
    expansionPotentialReason: placeholder,
  };
}

export function defaultMarketIntelligence(): MarketIntelligenceResult {
  const placeholder = "Placeholder — overwritten by attachFounderBusinessIntelligence.";
  return {
    marketMaturity: "emerging",
    marketMaturityReasons: [placeholder],
    growthStage: "insufficient-data",
    growthStageReason: placeholder,
    geoConcentration: "UNKNOWN",
    geoConcentrationReason: placeholder,
    industryConcentration: "UNKNOWN",
    industryConcentrationReason: placeholder,
    searchConfidence: "low",
    searchConfidenceReason: placeholder,
    adoptionConfidence: "low",
    adoptionConfidenceReason: placeholder,
    saturation: "low",
    saturationReason: placeholder,
    competitionPressure: "low",
    opportunityWindow: "unclear",
    opportunityWindowReason: placeholder,
  };
}

export function defaultRevenueIntelligence(): RevenueIntelligenceResult {
  const placeholder = "Placeholder — overwritten by attachFounderBusinessIntelligence.";
  return {
    revenuePotential: "NOT VERIFIED",
    revenuePotentialReason: placeholder,
    pricingConfidence: "not-verified",
    possiblePricing: placeholder,
    revenueModel: "freemium",
    revenueModelDescription: placeholder,
    subscriptionViability: "not-verified",
    expansionPotential: "not-verified",
    upsellPotential: "not-verified",
    upsellPotentialReason: placeholder,
    crossSellPotential: "not-verified",
    crossSellPotentialReason: placeholder,
  };
}

export function defaultMvpPlan(): MvpScopeResult {
  const placeholder = "Placeholder — overwritten by attachFounderBusinessIntelligence.";
  return {
    recommendedMvp: placeholder,
    estimatedTimeToMvp: placeholder,
    buildDifficulty: "low",
    buildDifficultyExplanation: placeholder,
    coreFeatures: [],
    featuresToAvoidAtLaunch: [],
    featuresToAvoidReason: placeholder,
    phasedRoadmap: [],
    launchReadinessCriteria: [],
    scopeSummary: placeholder,
  };
}

export function defaultGoToMarket(): GoToMarketResult {
  const placeholder = "Placeholder — overwritten by attachFounderBusinessIntelligence.";
  return {
    launchStrategy: placeholder,
    goToMarketDirection: placeholder,
    bestCustomer: "unknown",
    whyThisCustomer: placeholder,
    earlyAdopterProfile: placeholder,
    recommendedChannels: [],
    positioningStatement: placeholder,
    positioningBasis: "NOT VERIFIED",
    launchSequence: [],
  };
}

export function defaultTechnicalBlueprint(): TechnicalBlueprintResult {
  const placeholder = "Placeholder — overwritten by attachFounderBusinessIntelligence.";
  return {
    buildDifficulty: "low",
    expectedMvpComplexity: "low",
    architectureAdvice: placeholder,
    architectureAdviceReason: placeholder,
    databaseAdvice: placeholder,
    databaseAdviceReason: placeholder,
    apiAdvice: placeholder,
    apiAdviceReason: placeholder,
    authAdvice: placeholder,
    authAdviceReason: placeholder,
    aiLayerAdvice: placeholder,
    aiLayerAdviceReason: placeholder,
    hostingAdvice: placeholder,
    hostingAdviceReason: placeholder,
    storageAdvice: placeholder,
    storageAdviceReason: placeholder,
    advisoryDisclaimer: placeholder,
  };
}

/**
 * Attaches all 6 founder-business-intelligence bundles to every report in
 * the shipped list — mirrors ai-decision-validation.ts's
 * `attachAiDecisionValidation` pattern exactly (map, preserve order, never
 * re-sort/re-score, O(1) cluster lookup via a map built once over
 * `clusters`, no O(n^2) anywhere). Must be called from engine.ts's `analyze`
 * AFTER `attachAiDecisionValidation`, so every input the 6 compose functions
 * read (`report.founderIntelligence`, `report.aiDecisionValidation`,
 * `report.fois`, `report.calibration`, `report.decision`, ...) is the REAL,
 * final value, never a placeholder.
 */
export function attachFounderBusinessIntelligence(
  opportunities: FounderOpportunityReport[],
  clusters: ProblemCluster[],
): FounderOpportunityReport[] {
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster] as const));

  return opportunities.map((report) => {
    const cluster = clusterById.get(report.clusterId);
    if (!cluster) {
      // Should not happen (every shipped report's clusterId traces back to
      // a cluster in the same problemReport.clusters this run started
      // from) — fail safe with the existing placeholders rather than
      // throwing, so a future upstream change can't crash the whole
      // pipeline over a diagnostics-only layer (mirrors
      // attachFounderIntelligence's/attachAiDecisionValidation's guard).
      return report;
    }

    return {
      ...report,
      businessIntelligence: composeBusinessIntelligence(report),
      marketIntelligence: composeMarketIntelligence(report, cluster),
      revenueIntelligence: composeRevenueIntelligence(report),
      mvpPlan: generateMvpScope(report),
      goToMarket: composeGoToMarket(report),
      technicalBlueprint: composeTechnicalBlueprint(report),
    };
  });
}
