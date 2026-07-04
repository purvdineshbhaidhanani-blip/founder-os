import type { ProblemCluster } from "../problems/types.js";
import type { CompetitionPressureLabel, FounderOpportunityReport, MarketMaturityLabel } from "./types.js";

/**
 * Phase 2 — Market Intelligence layer.
 *
 * A pure COMPOSITION layer over `founderIntelligence.marketMaturity` /
 * `founderIntelligence.competitionPressure`, `cluster.frequency.growth`,
 * `report.competition`, and `report.calibration` — all already computed
 * elsewhere and read-only here. No LLM call, no network, no filesystem
 * writes, no re-scan of raw evidence items, no re-derivation of
 * clustering/FOIS/decision/calibration/founderIntelligence. Every threshold
 * below is a fixed, documented, reasoned constant (no labeled
 * founder-outcome dataset exists to empirically tune against, matching
 * every other threshold in this codebase). Geo/industry concentration have
 * NO backing field anywhere in this codebase's schema
 * (`RawResearchItem`/`ProblemCluster` carry no location or industry-taxonomy
 * field) — both are therefore ALWAYS the literal sentinel "UNKNOWN", never a
 * guessed region or vertical.
 */

/* ========================================================================= */
/* Growth stage                                                              */
/* ========================================================================= */

export type GrowthStageLabel = "early" | "growing" | "plateauing" | "declining" | "insufficient-data";

/**
 * growthStage rule table (first match wins), from
 * `cluster.frequency.growth.label` + `founderIntelligence.marketMaturity.maturity`
 * (both already-computed fields):
 *   1. growth.label === "insufficient-data"                    -> "insufficient-data"
 *   2. growth.label === "declining"                             -> "declining"
 *   3. maturity in {"emerging"}                                 -> "early"
 *   4. maturity in {"growing"}                                  -> "growing"
 *   5. maturity in {"crowded", "saturated"}                     -> "plateauing"
 *   6. else (maturity === "declining", growth not "declining")  -> "plateauing" (maturity says declining but growth itself isn't -- treated as a plateau, not a fresh decline call, to avoid double-counting the same signal twice)
 */
function growthStageFor(growthLabel: ProblemCluster["frequency"]["growth"]["label"], maturity: MarketMaturityLabel): { stage: GrowthStageLabel; reason: string } {
  if (growthLabel === "insufficient-data") {
    return { stage: "insufficient-data", reason: `cluster.frequency.growth.label="insufficient-data" -> growth stage cannot be determined.` };
  }
  if (growthLabel === "declining") {
    return { stage: "declining", reason: `cluster.frequency.growth.label="declining" -> declining growth stage.` };
  }
  if (maturity === "emerging") {
    return { stage: "early", reason: `founderIntelligence.marketMaturity.maturity="emerging" (growth="${growthLabel}") -> early-stage market.` };
  }
  if (maturity === "growing") {
    return { stage: "growing", reason: `marketMaturity.maturity="growing" (growth="${growthLabel}") -> growing market.` };
  }
  return {
    stage: "plateauing",
    reason: `marketMaturity.maturity="${maturity}" (growth="${growthLabel}", not itself "declining") -> plateauing market.`,
  };
}

/* ========================================================================= */
/* Confidence bands                                                         */
/* ========================================================================= */

export type ConfidenceBand = "high" | "medium" | "low";

/** calibration.metrics.crossSourceConsistency (0-1) at/above this -> "high" search confidence. */
const SEARCH_CONFIDENCE_HIGH_THRESHOLD = 0.66;
/** calibration.metrics.crossSourceConsistency (0-1) at/above this (and below HIGH) -> "medium". */
const SEARCH_CONFIDENCE_MEDIUM_THRESHOLD = 0.33;

/**
 * searchConfidence: how confident we are that the evidence reflects genuine,
 * independently-corroborated search/discussion behavior (not one source
 * repeating itself) — driven by `calibration.metrics.crossSourceConsistency`
 * (0-1: `decision.evidence.crossSourceAgreement / decision.evidence.uniqueSources`,
 * already computed).
 */
function searchConfidenceFor(crossSourceConsistency: number): { band: ConfidenceBand; reason: string } {
  const band: ConfidenceBand =
    crossSourceConsistency >= SEARCH_CONFIDENCE_HIGH_THRESHOLD
      ? "high"
      : crossSourceConsistency >= SEARCH_CONFIDENCE_MEDIUM_THRESHOLD
        ? "medium"
        : "low";
  return {
    band,
    reason: `calibration.metrics.crossSourceConsistency=${crossSourceConsistency.toFixed(2)} -> ${band} search confidence (>= ${SEARCH_CONFIDENCE_HIGH_THRESHOLD} = high, >= ${SEARCH_CONFIDENCE_MEDIUM_THRESHOLD} = medium).`,
  };
}

/** calibration.metrics.signalDensity (0-1) at/above this -> "high" adoption confidence. */
const ADOPTION_CONFIDENCE_HIGH_THRESHOLD = 0.6;
/** calibration.metrics.signalDensity (0-1) at/above this (and below HIGH) -> "medium". */
const ADOPTION_CONFIDENCE_MEDIUM_THRESHOLD = 0.3;

/**
 * adoptionConfidence: how many independent FOIS signals actually fired for
 * this opportunity (`calibration.metrics.signalDensity` — fraction of fixed
 * FOIS dimensions with `raw >= 40`, already computed) — a proxy for "is this
 * demand corroborated by more than one lucky dimension".
 */
function adoptionConfidenceFor(signalDensity: number): { band: ConfidenceBand; reason: string } {
  const band: ConfidenceBand =
    signalDensity >= ADOPTION_CONFIDENCE_HIGH_THRESHOLD ? "high" : signalDensity >= ADOPTION_CONFIDENCE_MEDIUM_THRESHOLD ? "medium" : "low";
  return {
    band,
    reason: `calibration.metrics.signalDensity=${signalDensity.toFixed(2)} -> ${band} adoption confidence (>= ${ADOPTION_CONFIDENCE_HIGH_THRESHOLD} = high, >= ${ADOPTION_CONFIDENCE_MEDIUM_THRESHOLD} = medium).`,
  };
}

/* ========================================================================= */
/* Saturation                                                               */
/* ========================================================================= */

export type SaturationLabel = "low" | "medium" | "high";

/**
 * saturation: a coarser 3-tier view of `founderIntelligence.competitionPressure.pressure`
 * (5-tier, already computed) — never re-derived from competitor count directly.
 *   very-high | high -> "high"
 *   medium           -> "medium"
 *   low | very-low   -> "low"
 */
function saturationFor(pressure: CompetitionPressureLabel): { value: SaturationLabel; reason: string } {
  const value: SaturationLabel = pressure === "very-high" || pressure === "high" ? "high" : pressure === "medium" ? "medium" : "low";
  return { value, reason: `founderIntelligence.competitionPressure.pressure="${pressure}" -> ${value} saturation.` };
}

/* ========================================================================= */
/* Opportunity window                                                       */
/* ========================================================================= */

export type OpportunityWindowLabel = "opening" | "steady" | "narrow" | "closing" | "unclear";

/**
 * opportunityWindow rule table (first match wins), from
 * `cluster.frequency.growth.label` + `founderIntelligence.marketMaturity.maturity`:
 *   1. growth.label === "declining"                                    -> "closing"
 *   2. growth.label === "insufficient-data"                            -> "unclear"
 *   3. maturity === "saturated"                                        -> "narrow"
 *   4. growth.label === "rising" AND maturity in {emerging, growing}   -> "opening"
 *   5. else                                                            -> "steady"
 */
function opportunityWindowFor(
  growthLabel: ProblemCluster["frequency"]["growth"]["label"],
  maturity: MarketMaturityLabel,
): { value: OpportunityWindowLabel; reason: string } {
  if (growthLabel === "declining") {
    return { value: "closing", reason: `cluster.frequency.growth.label="declining" -> the opportunity window may already be closing.` };
  }
  if (growthLabel === "insufficient-data") {
    return { value: "unclear", reason: `growth.label="insufficient-data" -> not enough data to call the window opening or closing.` };
  }
  if (maturity === "saturated") {
    return { value: "narrow", reason: `marketMaturity.maturity="saturated" -> a crowded market leaves little room without strong differentiation.` };
  }
  if (growthLabel === "rising" && (maturity === "emerging" || maturity === "growing")) {
    return { value: "opening", reason: `growth.label="rising" AND marketMaturity.maturity="${maturity}" (uncrowded) -> the window is opening.` };
  }
  return { value: "steady", reason: `growth.label="${growthLabel}", marketMaturity.maturity="${maturity}" -> no strong opening/closing signal; steady.` };
}

/* ========================================================================= */
/* Result shape + entry point                                               */
/* ========================================================================= */

export interface MarketIntelligenceResult {
  /** Reused verbatim from `founderIntelligence.marketMaturity.maturity`. */
  marketMaturity: MarketMaturityLabel;
  /** Reused verbatim from `founderIntelligence.marketMaturity.reasons`. */
  marketMaturityReasons: string[];
  growthStage: GrowthStageLabel;
  growthStageReason: string;
  /** Always the literal "UNKNOWN" — no geo field exists anywhere in this codebase's evidence schema. */
  geoConcentration: "UNKNOWN";
  geoConcentrationReason: string;
  /** Always the literal "UNKNOWN" — no industry-taxonomy field exists anywhere in this codebase's evidence schema. */
  industryConcentration: "UNKNOWN";
  industryConcentrationReason: string;
  searchConfidence: ConfidenceBand;
  searchConfidenceReason: string;
  adoptionConfidence: ConfidenceBand;
  adoptionConfidenceReason: string;
  saturation: SaturationLabel;
  saturationReason: string;
  /** Reused verbatim from `founderIntelligence.competitionPressure.pressure`. */
  competitionPressure: CompetitionPressureLabel;
  opportunityWindow: OpportunityWindowLabel;
  opportunityWindowReason: string;
}

/**
 * Composes the Phase 2 Market Intelligence bundle from an already-populated
 * `FounderOpportunityReport` and its source `ProblemCluster`. Pure function
 * — no side effects, no LLM call, no re-derivation of any upstream field.
 * Standalone library (mirrors `src/founder-copilot`'s pattern): not wired
 * into engine.ts.
 */
export function composeMarketIntelligence(report: FounderOpportunityReport, cluster: ProblemCluster): MarketIntelligenceResult {
  const { founderIntelligence, calibration } = report;
  const { marketMaturity, competitionPressure } = founderIntelligence;
  const growthLabel = cluster.frequency.growth.label;

  const growthStage = growthStageFor(growthLabel, marketMaturity.maturity);
  const searchConfidence = searchConfidenceFor(calibration.metrics.crossSourceConsistency);
  const adoptionConfidence = adoptionConfidenceFor(calibration.metrics.signalDensity);
  const saturation = saturationFor(competitionPressure.pressure);
  const opportunityWindow = opportunityWindowFor(growthLabel, marketMaturity.maturity);

  return {
    marketMaturity: marketMaturity.maturity,
    marketMaturityReasons: marketMaturity.reasons,
    growthStage: growthStage.stage,
    growthStageReason: growthStage.reason,
    geoConcentration: "UNKNOWN",
    geoConcentrationReason:
      "No geographic/location field exists on RawResearchItem or ProblemCluster in this codebase's schema (src/research/types.ts, src/problems/types.ts) -> geo concentration cannot be computed without inventing a signal.",
    industryConcentration: "UNKNOWN",
    industryConcentrationReason:
      "No industry-taxonomy field exists on RawResearchItem or ProblemCluster in this codebase's schema -> industry concentration cannot be computed without inventing a signal.",
    searchConfidence: searchConfidence.band,
    searchConfidenceReason: searchConfidence.reason,
    adoptionConfidence: adoptionConfidence.band,
    adoptionConfidenceReason: adoptionConfidence.reason,
    saturation: saturation.value,
    saturationReason: saturation.reason,
    competitionPressure: competitionPressure.pressure,
    opportunityWindow: opportunityWindow.value,
    opportunityWindowReason: opportunityWindow.reason,
  };
}
