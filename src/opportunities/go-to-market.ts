import type { DifferentiationStrategyName, FounderOpportunityReport } from "./types.js";

/**
 * Phase 6 — Go-To-Market engine.
 *
 * A pure COMPOSITION layer over
 * `aiDecisionValidation.founderOpportunity.suggestedLaunchStrategy` /
 * `.earlyAdopterProfile`, `aiDecisionValidation.finalRecommendation
 * .goToMarketDirection`, `founderIntelligence.founderOpportunity.bestCustomer`
 * / `.whyThisCustomer`, `founderIntelligence.differentiationStrategies`, and
 * `report.supportingEvidence.sourceBreakdown` — all already computed
 * elsewhere and read-only here. No LLM call, no network, no filesystem
 * writes, no re-scan of raw evidence items, no re-derivation of
 * clustering/FOIS/decision/calibration/founderIntelligence/
 * aiDecisionValidation. Every returned field cites the real, already-computed
 * value it is composed from.
 */

/* ========================================================================= */
/* Shared helpers                                                            */
/* ========================================================================= */

function dominantSourceOf(sourceBreakdown: Record<string, number>): { sourceId: string; count: number } {
  let bestId = "unknown";
  let bestCount = -1;
  for (const [sourceId, count] of Object.entries(sourceBreakdown)) {
    if (count > bestCount) {
      bestId = sourceId;
      bestCount = count;
    }
  }
  return { sourceId: bestId, count: Math.max(0, bestCount) };
}

/* ========================================================================= */
/* Channels                                                                  */
/* ========================================================================= */

export interface GtmChannel {
  channel: string;
  reason: string;
}

/**
 * recommendedChannels rule table (first match wins), from the dominant
 * evidence source id (`report.supportingEvidence.sourceBreakdown`, already
 * computed) — the evidenced source is the strongest available signal for
 * "where the audience already is", never a generic guess:
 *   1. dominant source contains "github"/"stack" -> developer-centric channels
 *   2. dominant source contains "reddit"          -> Reddit community channels
 *   3. dominant source contains "hn"/"hackernews"  -> Hacker News / indie-hacker channels
 *   4. else (no strong source signal)              -> generic content/outreach channels, with an explicit lower-confidence caveat
 */
function recommendedChannelsFor(dominantSourceId: string, dominantCount: number, evidenceCount: number): GtmChannel[] {
  const source = dominantSourceId.toLowerCase();
  const share = evidenceCount === 0 ? 0 : dominantCount / evidenceCount;
  const shareNote = `(dominant source "${dominantSourceId}" accounts for ${(share * 100).toFixed(0)}% of evidence)`;

  if (source.includes("github") || source.includes("stack")) {
    return [
      { channel: "Developer communities (GitHub issues/discussions, Stack Overflow)", reason: `Dominant evidence source is "${dominantSourceId}" ${shareNote}.` },
      { channel: "Technical content (blog posts, docs, changelogs)", reason: `Audience is evidenced as developer-centric via "${dominantSourceId}" ${shareNote}.` },
      { channel: "Open-source community engagement", reason: `Developer-centric dominant source "${dominantSourceId}" ${shareNote} suggests an OSS-adjacent audience.` },
    ];
  }
  if (source.includes("reddit")) {
    return [
      { channel: "Reddit communities (organic engagement in relevant subreddits)", reason: `Dominant evidence source is "${dominantSourceId}" ${shareNote}.` },
      { channel: "Community-led content (AMAs, discussion threads)", reason: `Evidenced audience is concentrated on "${dominantSourceId}" ${shareNote}.` },
    ];
  }
  if (source.includes("hn") || source.includes("hackernews")) {
    return [
      { channel: "Hacker News (Show HN launch)", reason: `Dominant evidence source is "${dominantSourceId}" ${shareNote}.` },
      { channel: "Indie-hacker communities", reason: `Evidenced audience is concentrated on "${dominantSourceId}" ${shareNote}.` },
    ];
  }
  return [
    {
      channel: "Content marketing (SEO/blog targeting the evidenced pain)",
      reason: `No strong dominant-source signal (source="${dominantSourceId}" ${shareNote}) -> generic, lower-confidence channel recommendation.`,
    },
    {
      channel: "Direct outreach to the evidenced early-adopter profile",
      reason: `No strong dominant-source signal -> outreach directly to the evidenced audience is the safest lower-confidence default.`,
    },
  ];
}

/* ========================================================================= */
/* Positioning                                                              */
/* ========================================================================= */

/** Cap on how many differentiation strategies are cited in the positioning statement — keeps the statement focused on the strongest evidenced angle(s). */
const POSITIONING_STRATEGY_CAP = 2;

function positioningStatementFor(
  bestCustomer: string,
  differentiationStrategies: Array<{ strategy: DifferentiationStrategyName; evidenceReason: string }>,
): { statement: string; basis: DifferentiationStrategyName[] | "NOT VERIFIED" } {
  if (differentiationStrategies.length === 0) {
    return {
      statement: `NOT VERIFIED — no evidence-backed differentiation strategy exists (founderIntelligence.differentiationStrategies is empty); a positioning angle cannot be asserted without inventing one. Target customer per evidence: "${bestCustomer}".`,
      basis: "NOT VERIFIED",
    };
  }
  const top = differentiationStrategies.slice(0, POSITIONING_STRATEGY_CAP);
  const statement = `For "${bestCustomer}": position around ${top.map((s) => `"${s.strategy}"`).join(" and ")} (${top
    .map((s) => s.evidenceReason)
    .join(" ")})`;
  return { statement, basis: top.map((s) => s.strategy) };
}

/* ========================================================================= */
/* Launch sequence                                                          */
/* ========================================================================= */

export interface GtmLaunchStep {
  step: number;
  action: string;
  reason: string;
}

function launchSequenceFor(params: {
  bestCustomer: string;
  earlyAdopterProfile: string;
  positioningStatement: string;
  channels: GtmChannel[];
  launchStrategy: string;
}): GtmLaunchStep[] {
  const { bestCustomer, earlyAdopterProfile, positioningStatement, channels, launchStrategy } = params;
  const topChannel = channels[0];

  return [
    {
      step: 1,
      action: `Validate with the evidenced early-adopter segment: "${bestCustomer}".`,
      reason: `founderIntelligence.founderOpportunity.bestCustomer="${bestCustomer}"; aiDecisionValidation.founderOpportunity.earlyAdopterProfile="${earlyAdopterProfile}".`,
    },
    {
      step: 2,
      action: `Launch with the evidenced positioning angle.`,
      reason: positioningStatement,
    },
    {
      step: 3,
      action: topChannel ? `Scale via the top recommended channel: "${topChannel.channel}".` : "No recommended channel was composed (unexpected) — scale channel is undetermined.",
      reason: topChannel ? topChannel.reason : "recommendedChannels is empty.",
    },
    {
      step: 4,
      action: `Follow the overall launch strategy.`,
      reason: `aiDecisionValidation.founderOpportunity.suggestedLaunchStrategy="${launchStrategy}".`,
    },
  ];
}

/* ========================================================================= */
/* Result shape + entry point                                               */
/* ========================================================================= */

export interface GoToMarketResult {
  /** Reused verbatim from `aiDecisionValidation.founderOpportunity.suggestedLaunchStrategy`. */
  launchStrategy: string;
  /** Reused verbatim from `aiDecisionValidation.finalRecommendation.goToMarketDirection` (composed upstream as the same value as `launchStrategy`; both are surfaced for traceability to each's own source field, per the mission's explicit input list). */
  goToMarketDirection: string;
  /** Reused verbatim from `founderIntelligence.founderOpportunity.bestCustomer`. */
  bestCustomer: string;
  /** Reused verbatim from `founderIntelligence.founderOpportunity.whyThisCustomer`. */
  whyThisCustomer: string;
  /** Reused verbatim from `aiDecisionValidation.founderOpportunity.earlyAdopterProfile`. */
  earlyAdopterProfile: string;
  recommendedChannels: GtmChannel[];
  positioningStatement: string;
  /** The differentiation strategy name(s) the positioning statement is grounded in, or the literal "NOT VERIFIED" when none exist. */
  positioningBasis: DifferentiationStrategyName[] | "NOT VERIFIED";
  launchSequence: GtmLaunchStep[];
}

/**
 * Composes the Phase 6 Go-To-Market bundle from an already-populated
 * `FounderOpportunityReport`. Pure function — no side effects, no LLM call,
 * no re-derivation of any upstream field. Standalone library (mirrors
 * `src/founder-copilot`'s pattern): not wired into engine.ts.
 */
export function composeGoToMarket(report: FounderOpportunityReport): GoToMarketResult {
  const { founderIntelligence, aiDecisionValidation, supportingEvidence } = report;
  const { bestCustomer, whyThisCustomer } = founderIntelligence.founderOpportunity;
  const { suggestedLaunchStrategy, earlyAdopterProfile } = aiDecisionValidation.founderOpportunity;
  const { goToMarketDirection } = aiDecisionValidation.finalRecommendation;
  const differentiationStrategies = founderIntelligence.differentiationStrategies;

  const dominant = dominantSourceOf(supportingEvidence.sourceBreakdown);
  const recommendedChannels = recommendedChannelsFor(dominant.sourceId, dominant.count, supportingEvidence.evidenceCount);
  const positioning = positioningStatementFor(bestCustomer, differentiationStrategies);
  const launchSequence = launchSequenceFor({
    bestCustomer,
    earlyAdopterProfile,
    positioningStatement: positioning.statement,
    channels: recommendedChannels,
    launchStrategy: suggestedLaunchStrategy,
  });

  return {
    launchStrategy: suggestedLaunchStrategy,
    goToMarketDirection,
    bestCustomer,
    whyThisCustomer,
    earlyAdopterProfile,
    recommendedChannels,
    positioningStatement: positioning.statement,
    positioningBasis: positioning.basis,
    launchSequence,
  };
}
