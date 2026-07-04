import type { BuildDifficultyTier, DifferentiationStrategyName, FounderMvpComplexity, FounderOpportunityReport, MarketGapName } from "./types.js";

/**
 * Phase 5 — Technical Blueprint (founder-facing ADVISORY layer).
 *
 * IMPORTANT FRAMING: every field this module returns is an ADVISORY
 * recommendation about the OPPORTUNITY's hypothetical FUTURE product — it is
 * NEVER a statement about this repository's own stack or any real deployed
 * system. Every sentence is deliberately phrased as "for a typical product
 * at this evidence profile, consider X" rather than an assertion of fact,
 * per the mission's explicit framing requirement.
 *
 * A pure COMPOSITION layer over `report.buildDifficulty`,
 * `founderIntelligence.marketGaps`,
 * `founderIntelligence.founderOpportunity.expectedMvpComplexity`, and
 * `founderIntelligence.differentiationStrategies` — all already computed
 * elsewhere and read-only here. No LLM call, no network, no filesystem
 * writes, no re-scan of raw evidence items, no re-derivation of
 * clustering/FOIS/decision/calibration/founderIntelligence. Every returned
 * field cites the real, already-computed signal (buildDifficulty tier/
 * matchedSignals, a specific marketGap name, expectedMvpComplexity, or a
 * specific differentiation strategy) it is advisory-conditioned on.
 */

/* ========================================================================= */
/* Architecture advice                                                      */
/* ========================================================================= */

/**
 * architectureAdvice rule table, from `buildDifficulty.tier` (already
 * computed) alone:
 *   low    -> a single-service/monolithic architecture is advisory-sufficient
 *   medium -> a modular monolith, splitting out only a proven bottleneck
 *   high   -> isolate the highest-complexity concern into its own service from day one
 */
function architectureAdviceFor(tier: BuildDifficultyTier, matchedSignals: string[]): { advice: string; reason: string } {
  if (tier === "low") {
    return {
      advice: "For a typical product at this evidence profile, a single-service/monolithic architecture is advisory-sufficient for the MVP.",
      reason: `buildDifficulty.tier="low" (0-signal build-complexity profile) — no evidenced complexity justifies a multi-service split at MVP stage.`,
    };
  }
  if (tier === "medium") {
    return {
      advice: "For a typical product at this evidence profile, consider a modular monolith with clear internal service boundaries, splitting a service out only once a specific bottleneck is proven.",
      reason: `buildDifficulty.tier="medium" (matchedSignals: ${matchedSignals.join(", ") || "none"}) — moderate complexity warrants clear boundaries but not a premature microservice split.`,
    };
  }
  return {
    advice: `For a typical product at this evidence profile, consider isolating the highest-complexity concern (${matchedSignals[0] ?? "the matched high-complexity signal"}) into its own service from day one, keeping everything else in a single service until proven otherwise.`,
    reason: `buildDifficulty.tier="high" (matchedSignals: ${matchedSignals.join(", ") || "none"}) — real evidenced complexity signal(s) justify isolating the riskiest concern early.`,
  };
}

/* ========================================================================= */
/* Database advice                                                          */
/* ========================================================================= */

function databaseAdviceFor(tier: BuildDifficultyTier, mvpComplexity: FounderMvpComplexity): { advice: string; reason: string } {
  if (tier === "high" || mvpComplexity === "high") {
    return {
      advice: "For a typical product at this evidence profile, consider a dedicated data layer (e.g. read replicas, caching) once buildDifficulty's matched high-complexity signal(s) indicate scale-sensitive access patterns — but only after the MVP proves demand, not before.",
      reason: `buildDifficulty.tier="${tier}" and/or expectedMvpComplexity="${mvpComplexity}" -> a dedicated data layer is advisory-worth planning for, not building on day one.`,
    };
  }
  return {
    advice: "For a typical product at this evidence profile, a single managed relational database (e.g. a managed Postgres instance) is advisory-sufficient for the MVP.",
    reason: `buildDifficulty.tier="${tier}" and expectedMvpComplexity="${mvpComplexity}" -> no evidenced complexity signal justifies more than a single managed database at MVP stage.`,
  };
}

/* ========================================================================= */
/* API advice                                                               */
/* ========================================================================= */

function apiAdviceFor(gapNames: Set<MarketGapName>): { advice: string; reason: string } {
  const hasApiGap = gapNames.has("Missing API");
  const hasIntegrationGap = gapNames.has("Weak Integrations");
  if (hasApiGap || hasIntegrationGap) {
    const matched = [hasApiGap ? "Missing API" : null, hasIntegrationGap ? "Weak Integrations" : null].filter(Boolean).join(", ");
    return {
      advice: "For a typical product at this evidence profile, consider prioritizing a well-documented public API / webhook layer from the MVP, given the evidenced integration gap.",
      reason: `founderIntelligence.marketGaps includes "${matched}" -> a public-API/integration surface is directly evidence-backed.`,
    };
  }
  return {
    advice: "For a typical product at this evidence profile, a private internal API is advisory-sufficient; no public-API/integration gap was evidenced at this stage.",
    reason: `founderIntelligence.marketGaps contains neither "Missing API" nor "Weak Integrations" -> no evidenced signal to prioritize a public API at MVP stage.`,
  };
}

/* ========================================================================= */
/* Auth advice                                                              */
/* ========================================================================= */

function authAdviceFor(gapNames: Set<MarketGapName>): { advice: string; reason: string } {
  const hasIntegrationGap = gapNames.has("Weak Integrations");
  const base = "For a typical product at this evidence profile, email/OAuth social login (e.g. Google) is advisory-sufficient for the MVP.";
  if (hasIntegrationGap) {
    return {
      advice: `${base} Given the evidenced "Weak Integrations" gap, plan for SSO/SAML as a later enterprise-tier addition rather than an MVP requirement.`,
      reason: `founderIntelligence.marketGaps includes "Weak Integrations" -> future enterprise auth (SSO/SAML) is advisory-worth planning for, not an MVP requirement.`,
    };
  }
  return {
    advice: base,
    reason: `founderIntelligence.marketGaps contains no integration-related gap -> no evidenced signal to prioritize enterprise auth (SSO/SAML) beyond standard email/OAuth at MVP stage.`,
  };
}

/* ========================================================================= */
/* AI layer advice                                                          */
/* ========================================================================= */

function aiLayerAdviceFor(gapNames: Set<MarketGapName>, differentiationStrategies: DifferentiationStrategyName[]): { advice: string; reason: string } {
  const hasAiGap = gapNames.has("Missing AI");
  const hasAiFirstStrategy = differentiationStrategies.includes("AI-first");
  if (hasAiGap || hasAiFirstStrategy) {
    return {
      advice: "For a typical product at this evidence profile, an AI layer (e.g. an LLM-backed feature) is advisory-supported — consider starting with a single, narrowly-scoped, evaluable AI feature tied directly to the evidenced complaint rather than a broad AI platform.",
      reason: `${hasAiGap ? 'founderIntelligence.marketGaps includes "Missing AI"' : ""}${hasAiGap && hasAiFirstStrategy ? " and " : ""}${
        hasAiFirstStrategy ? 'founderIntelligence.differentiationStrategies includes "AI-first"' : ""
      } -> an AI layer is evidence-backed, not merely aspirational.`,
    };
  }
  return {
    advice: "NOT VERIFIED — no AI-specific gap or differentiation signal was evidenced; an AI layer is not asserted as necessary for this MVP. Avoid over-scoping the MVP with an unvalidated AI feature.",
    reason: `founderIntelligence.marketGaps does not include "Missing AI" and differentiationStrategies does not include "AI-first" -> no evidenced signal to justify an AI layer at MVP stage.`,
  };
}

/* ========================================================================= */
/* Hosting advice                                                           */
/* ========================================================================= */

function hostingAdviceFor(tier: BuildDifficultyTier, mvpComplexity: FounderMvpComplexity, matchedSignals: string[]): { advice: string; reason: string } {
  if (tier === "high") {
    return {
      advice: "For a typical product at this evidence profile, budget for meaningful infrastructure-operations complexity from day one (e.g. a platform with strong autoscaling/observability support), rather than the simplest single-region PaaS deployment.",
      reason: `buildDifficulty.tier="high" (matchedSignals: ${matchedSignals.join(", ") || "none"}) -> evidenced build complexity carries over into hosting/ops complexity.`,
    };
  }
  if (mvpComplexity === "medium" || tier === "medium") {
    return {
      advice: "For a typical product at this evidence profile, a managed PaaS deployment with the explicit option to scale horizontally as adoption grows is advisory-sufficient.",
      reason: `buildDifficulty.tier="${tier}", expectedMvpComplexity="${mvpComplexity}" -> moderate complexity warrants headroom to scale, not a from-day-one scaled deployment.`,
    };
  }
  return {
    advice: "For a typical product at this evidence profile, a single managed PaaS deployment (single region) is advisory-sufficient for the MVP.",
    reason: `buildDifficulty.tier="${tier}", expectedMvpComplexity="${mvpComplexity}" -> no evidenced complexity signal justifies more than the simplest managed deployment at MVP stage.`,
  };
}

/* ========================================================================= */
/* Storage advice                                                           */
/* ========================================================================= */

function storageAdviceFor(gapNames: Set<MarketGapName>, differentiationStrategies: DifferentiationStrategyName[]): { advice: string; reason: string } {
  const hasOfflineFirst = differentiationStrategies.includes("Offline-first");
  const hasMobileGap = gapNames.has("Poor Mobile Experience");
  if (hasOfflineFirst || hasMobileGap) {
    return {
      advice: "For a typical product at this evidence profile, consider local-first storage with background sync (rather than a purely server-dependent model), given the evidenced offline/mobile-experience signal.",
      reason: `${hasOfflineFirst ? 'differentiationStrategies includes "Offline-first"' : ""}${hasOfflineFirst && hasMobileGap ? " and " : ""}${
        hasMobileGap ? 'marketGaps includes "Poor Mobile Experience"' : ""
      } -> local-first/sync storage is evidence-backed.`,
    };
  }
  const hasFeatureOrIntegrationGap = gapNames.has("Missing Features") || gapNames.has("Weak Integrations");
  if (hasFeatureOrIntegrationGap) {
    return {
      advice: "For a typical product at this evidence profile, a managed object-storage service (e.g. for user-generated content or integration payloads) is advisory-worth planning alongside the primary database.",
      reason: `founderIntelligence.marketGaps includes a Missing Features/Weak Integrations signal -> object storage is a reasonable advisory addition, not a from-day-one requirement.`,
    };
  }
  return {
    advice: "For a typical product at this evidence profile, the primary managed database alone is advisory-sufficient for the MVP; no dedicated object-storage layer is evidenced as necessary yet.",
    reason: "No offline/mobile/feature/integration gap signal was evidenced -> no additional storage layer is justified at MVP stage.",
  };
}

/* ========================================================================= */
/* Result shape + entry point                                               */
/* ========================================================================= */

export interface TechnicalBlueprintResult {
  /** Reused verbatim from `report.buildDifficulty.tier`. */
  buildDifficulty: BuildDifficultyTier;
  /** Reused verbatim from `founderIntelligence.founderOpportunity.expectedMvpComplexity`. */
  expectedMvpComplexity: FounderMvpComplexity;
  architectureAdvice: string;
  architectureAdviceReason: string;
  databaseAdvice: string;
  databaseAdviceReason: string;
  apiAdvice: string;
  apiAdviceReason: string;
  authAdvice: string;
  authAdviceReason: string;
  /** Literal "NOT VERIFIED" prefix when no real AI-related signal was evidenced — never asserted as necessary without one. */
  aiLayerAdvice: string;
  aiLayerAdviceReason: string;
  hostingAdvice: string;
  hostingAdviceReason: string;
  storageAdvice: string;
  storageAdviceReason: string;
  /** Every advisory string above is explicitly framed as conditional/advisory about the OPPORTUNITY's hypothetical future product — never a fact about this repository's own stack or any real deployed system. */
  advisoryDisclaimer: string;
}

const ADVISORY_DISCLAIMER =
  "All recommendations in this blueprint are ADVISORY and conditioned on this opportunity's evidence profile (buildDifficulty, marketGaps, expectedMvpComplexity, differentiationStrategies) — they describe a typical, reasonable approach for a hypothetical future product built to address the evidenced problem, and are never an assertion of fact about any real, currently-deployed system (including this repository's own stack).";

/**
 * Composes the Phase 5 Technical Blueprint (founder-facing advisory) bundle
 * from an already-populated `FounderOpportunityReport`. Pure function — no
 * side effects, no LLM call, no re-derivation of any upstream field.
 * Standalone library (mirrors `src/founder-copilot`'s pattern): not wired
 * into engine.ts.
 */
export function composeTechnicalBlueprint(report: FounderOpportunityReport): TechnicalBlueprintResult {
  const { buildDifficulty, founderIntelligence } = report;
  const { marketGaps, differentiationStrategies, founderOpportunity } = founderIntelligence;
  const { expectedMvpComplexity } = founderOpportunity;

  const gapNames = new Set(marketGaps.map((gap) => gap.gap));
  const strategyNames = differentiationStrategies.map((s) => s.strategy);

  const architecture = architectureAdviceFor(buildDifficulty.tier, buildDifficulty.matchedSignals);
  const database = databaseAdviceFor(buildDifficulty.tier, expectedMvpComplexity);
  const api = apiAdviceFor(gapNames);
  const auth = authAdviceFor(gapNames);
  const aiLayer = aiLayerAdviceFor(gapNames, strategyNames);
  const hosting = hostingAdviceFor(buildDifficulty.tier, expectedMvpComplexity, buildDifficulty.matchedSignals);
  const storage = storageAdviceFor(gapNames, strategyNames);

  return {
    buildDifficulty: buildDifficulty.tier,
    expectedMvpComplexity,
    architectureAdvice: architecture.advice,
    architectureAdviceReason: architecture.reason,
    databaseAdvice: database.advice,
    databaseAdviceReason: database.reason,
    apiAdvice: api.advice,
    apiAdviceReason: api.reason,
    authAdvice: auth.advice,
    authAdviceReason: auth.reason,
    aiLayerAdvice: aiLayer.advice,
    aiLayerAdviceReason: aiLayer.reason,
    hostingAdvice: hosting.advice,
    hostingAdviceReason: hosting.reason,
    storageAdvice: storage.advice,
    storageAdviceReason: storage.reason,
    advisoryDisclaimer: ADVISORY_DISCLAIMER,
  };
}
