import type {
  ClassifiedItem,
  ProblemCategory,
  ProblemCluster,
  ProblemIntelligenceReport,
} from "../problems/types.js";
import type { RawResearchItem, ResearchSession } from "../research/types.js";
// Founder Business Intelligence wiring pass (see founder-business-intelligence.ts) —
// `import type` only, so this is erased at compile time and introduces no
// runtime circular dependency between types.ts and these 6 sibling modules
// (each of which itself only imports *types* from this file).
import type { BusinessIntelligenceResult } from "./business-intelligence.js";
import type { MarketIntelligenceResult } from "./market-intelligence.js";
import type { RevenueIntelligenceResult } from "./revenue-intelligence.js";
import type { MvpScopeResult } from "./mvp-generator.js";
import type { GoToMarketResult } from "./go-to-market.js";
import type { TechnicalBlueprintResult } from "./technical-blueprint.js";
// Phase 8 — Knowledge Links relationship layer (see knowledge-links.ts) —
// `import type` only, same erased-at-compile-time reasoning as the 6
// imports directly above.
import type { KnowledgeLinksResult } from "./knowledge-links.js";
// Opportunity Selection / elimination layer wiring pass (see
// opportunity-selection.ts) — `import type` only, same erased-at-compile-time
// reasoning as the imports directly above. Reuses 3 small labeled unions
// already computed by Phase 1/2's business/market intelligence modules
// rather than redefining them.
import type { RevenueModelLabel, UrgencyBand } from "./business-intelligence.js";

/**
 * Founder Opportunity Reports engine surface. Turns the deterministic
 * ProblemIntelligenceReport clusters into ranked, founder-facing build
 * opportunities. No LLM call — every formula/threshold below is a fixed
 * constant, mirroring src/problems' Reality Guard philosophy of never
 * inventing certainty.
 */

export interface BuyingIntentResult {
  score: number; // 0-1
  matchingItemCount: number;
  totalItemCount: number;
  explanation: string;
}

export interface CompetitorMention {
  name: string; // extracted text
  mentionCount: number;
  evidenceUrls: string[];
}

export interface CompetitionResult {
  competitors: CompetitorMention[]; // sorted by mentionCount desc
  competitionScore: number; // 0-1, see formula below
  explanation: string;
}

export type BuildDifficultyTier = "low" | "medium" | "high";

export interface BuildDifficultyResult {
  tier: BuildDifficultyTier;
  matchedSignals: string[];
  explanation: string; // must include the phrase "heuristic estimate, not an engineering estimate"
}

export interface PricingSignal {
  extractedPrices: number[]; // deduplicated, sorted ascending
  suggestedPriceText: string;
}

export interface OpportunityScoreBreakdown {
  painFrequency: number;
  sourceDiversity: number;
  authorDiversity: number;
  buyingIntent: number;
  engagement: number;
  growth: number;
  competition: number;
  confidence: number;
  weightedTotal: number; // 0-1, the final opportunityScore
  explanation: string; // lists each factor's raw value, weight, and contribution
}

/**
 * One scored dimension of the Founder Opportunity Intelligence Score (FOIS).
 * `raw` is the dimension's own 0-100 score before weighting; `weighted` is
 * `raw * weight` (still on a 0-100 scale since weights sum to 1.0 across all
 * dimensions). `evidence` lists the concrete facts (never invented text)
 * that produced `raw`, for auditability — see fois.ts.
 */
export interface FoisDimension {
  name: string;
  raw: number; // 0-100
  weight: number; // 0-1, all dimension weights sum to 1.0
  weighted: number; // raw * weight, 0-100 scale
  reason: string; // human-readable, generated from the actual inputs
  evidence: string[]; // concrete facts used to compute `raw`, never invented
}

/** A named, subtractive adjustment applied to the FOIS overall score after dimensions are summed. See fois.ts's PENALTY constants. */
export interface FoisPenalty {
  reason: string;
  points: number; // positive integer, subtracted from the overall score
}

/**
 * Founder Opportunity Intelligence Score — a transparent, evidence-based,
 * multi-dimensional 0-100 replacement for scoreBreakdown.weightedTotal as
 * the ranking driver (see fois.ts). Additive to FounderOpportunityReport;
 * does not replace or modify `scoreBreakdown`.
 */
export interface FoisBreakdown {
  overall: number; // 0-100, clamped, sum(dimensions.weighted) minus penalties
  dimensions: FoisDimension[];
  reasons: string[]; // top positive-contributing dimension reasons, human-readable
  weaknesses: string[]; // low-scoring dimensions + fired penalties, human-readable
  penalties: FoisPenalty[];
}

export type FounderRecommendationVerdict = "BUILD" | "WAIT" | "IGNORE";

export interface FounderRecommendation {
  verdict: FounderRecommendationVerdict;
  whyBuild: string[];
  whyNotBuild: string[];
  risk: string[];
  explanation: string; // states the exact threshold comparison that produced the verdict
}

export interface FounderOpportunityReport {
  id: string;
  clusterId: string; // from the source ProblemCluster
  category: string;
  problem: string; // the cluster's normalizedStatement
  summary: string;
  painScore: number; // = scoreBreakdown.painFrequency
  buyingIntent: BuyingIntentResult;
  competition: CompetitionResult;
  confidence: { band: string; score: number }; // copied from the source cluster
  scoreBreakdown: OpportunityScoreBreakdown;
  /**
   * Founder Opportunity Intelligence Score (see fois.ts). Additive field —
   * `scoreBreakdown` above is left untouched for existing UI/export
   * consumers. `fois.overall` is now the report's ranking key (see
   * engine.ts's sort), replacing `scoreBreakdown.weightedTotal`.
   */
  fois: FoisBreakdown;
  supportingEvidence: { evidenceCount: number; sourceBreakdown: Record<string, number>; urls: string[] };
  representativeQuotes: Array<{ text: string; url: string; source: string }>; // from cluster's representativeExamples
  recommendedMvp: string;
  suggestedPricing: PricingSignal;
  targetUsers: string;
  buildDifficulty: BuildDifficultyResult;
  estimatedTimeToMvp: string;
  recommendation: FounderRecommendation;
  createdAt: string;
  sourceSessionId: string;
  sourceProblemReportId: string;
  /**
   * Loop 3 Founder Decision layer (see decision.ts) — a composition of
   * intent distribution, evidence/echo-chamber intelligence, structured
   * reasoning, a NEW explainable decision-level confidence, quality gates,
   * and a freshly-derived BUILD/WATCH/IGNORE verdict. Additive: every field
   * above (including `recommendation`, which keeps its own BUILD/WAIT/
   * IGNORE vocabulary) is left untouched for existing UI/export consumers.
   */
  decision: FounderDecision;
  /**
   * Loop 3 Part A semantic-alias merge metadata (see semantic.ts). Always
   * populated, even when no merge occurred (the common case) — see
   * SemanticClusterInfo's doc comment.
   */
  semanticCluster: SemanticClusterInfo;
  /**
   * Loop 4 calibration/diagnostics bundle (see calibration.ts) — a
   * READ-ONLY layer over every field above. Never alters fois, decision, or
   * this report's rank. Always populated on every report in the shipped
   * `opportunities` list (see engine.ts's `attachCalibration` call).
   */
  calibration: OpportunityCalibration;
  /**
   * Loop 7 Founder Intelligence bundle (see founder-intelligence.ts) —
   * competitor intelligence, market-gap detection, market maturity, a
   * founder-facing build/customer/pricing synthesis, competition pressure,
   * evidence-backed differentiation strategies, and an always-8-item risk
   * taxonomy. Additive and READ-ONLY: every field above is left untouched.
   * Always populated on every report in the shipped `opportunities` list
   * (see engine.ts's `attachFounderIntelligence` call, run after
   * `attachCalibration`).
   */
  founderIntelligence: FounderIntelligence;
  /**
   * Loop 8 AI Decision Validation bundle (see ai-decision-validation.ts) —
   * a read-only adversarial-review/explainability layer over `decision`,
   * `founderIntelligence`, `fois`, and `calibration`. Additive: every field
   * above is left untouched for existing UI/export consumers. Always
   * populated on every report in the shipped `opportunities` list (see
   * engine.ts's `attachAiDecisionValidation` call, run after
   * `attachFounderIntelligence`, the last step in the pipeline).
   */
  aiDecisionValidation: AiDecisionValidation;
  /**
   * Founder-facing Business Intelligence bundle (see business-intelligence.ts,
   * Phase 1) — business/revenue/pricing model, B2B-vs-B2C, buyer/decision-maker,
   * budget estimate, urgency, switching difficulty, and expansion potential.
   * Additive and READ-ONLY: a pure composition over `founderIntelligence` and
   * `aiDecisionValidation` above (never recomputes them, never mutates any
   * field above). Always populated on every report in the shipped
   * `opportunities` list (see engine.ts's `attachFounderBusinessIntelligence`
   * call, run after `attachAiDecisionValidation`, the last step in the
   * pipeline).
   */
  businessIntelligence: BusinessIntelligenceResult;
  /**
   * Founder-facing Market Intelligence bundle (see market-intelligence.ts,
   * Phase 2) — growth stage, search/adoption confidence, saturation, and
   * opportunity-window framing. Additive and READ-ONLY: a pure composition
   * over `founderIntelligence`, `calibration`, and the source cluster's
   * growth data. Always populated on every report in the shipped
   * `opportunities` list (see engine.ts's `attachFounderBusinessIntelligence`
   * call, run after `attachAiDecisionValidation`).
   */
  marketIntelligence: MarketIntelligenceResult;
  /**
   * Founder-facing Revenue Intelligence bundle (see revenue-intelligence.ts,
   * Phase 3) — revenue potential, revenue-model description, upsell/cross-sell
   * potential. Additive and READ-ONLY: a pure composition over
   * `aiDecisionValidation.monetization`, `suggestedPricing`, and
   * `founderIntelligence`. Always populated on every report in the shipped
   * `opportunities` list (see engine.ts's `attachFounderBusinessIntelligence`
   * call, run after `attachAiDecisionValidation`).
   */
  revenueIntelligence: RevenueIntelligenceResult;
  /**
   * Founder-facing MVP Scope bundle (see mvp-generator.ts, Phase 4) — a
   * phased feature roadmap, launch-readiness criteria, and features
   * deliberately deferred out of the MVP. Additive and READ-ONLY: a pure
   * composition over `aiDecisionValidation.founderOpportunity`,
   * `founderIntelligence.marketGaps`, and `buildDifficulty`. Always
   * populated on every report in the shipped `opportunities` list (see
   * engine.ts's `attachFounderBusinessIntelligence` call, run after
   * `attachAiDecisionValidation`).
   */
  mvpPlan: MvpScopeResult;
  /**
   * Founder-facing Go-To-Market bundle (see go-to-market.ts, Phase 6) —
   * recommended channels, positioning statement, and a launch sequence.
   * Additive and READ-ONLY: a pure composition over
   * `aiDecisionValidation.founderOpportunity`/`finalRecommendation`,
   * `founderIntelligence`, and `supportingEvidence`. Always populated on
   * every report in the shipped `opportunities` list (see engine.ts's
   * `attachFounderBusinessIntelligence` call, run after
   * `attachAiDecisionValidation`).
   */
  goToMarket: GoToMarketResult;
  /**
   * Founder-facing Technical Blueprint bundle (see technical-blueprint.ts,
   * Phase 5) — ADVISORY architecture/database/API/auth/AI-layer/hosting/
   * storage guidance for the opportunity's hypothetical future product
   * (never a statement about this repository's own stack). Additive and
   * READ-ONLY: a pure composition over `buildDifficulty` and
   * `founderIntelligence`. Always populated on every report in the shipped
   * `opportunities` list (see engine.ts's `attachFounderBusinessIntelligence`
   * call, run after `attachAiDecisionValidation`).
   */
  technicalBlueprint: TechnicalBlueprintResult;
  /**
   * Phase 8 — Knowledge Links relationship layer (see knowledge-links.ts) —
   * a typed, directed, ID-reference edge set between report sections
   * already computed above (Problem -> Competitors -> Customer -> Market ->
   * Revenue -> Execution -> Monitoring). NOT a graph database; a pure,
   * read-only composition. Additive and READ-ONLY: never mutates any field
   * above. Always populated on every report in the shipped `opportunities`
   * list (see engine.ts's `attachKnowledgeLinks` call, run LAST, after
   * `attachFounderBusinessIntelligence`).
   */
  knowledgeLinks: KnowledgeLinksResult;
}

export interface TopOpportunitiesReport {
  id: string;
  sourceSessionId: string;
  sourceProblemReportId: string;
  opportunities: FounderOpportunityReport[]; // top 10, sorted by fois.overall descending (see engine.ts)
  totalClustersConsidered: number;
  generatedAt: string;
  artifactId?: string;
  /**
   * Diagnostic summary of the Loop 3 Part A semantic-alias merge pass (see
   * semantic.ts's `mergeSynonymOpportunities`), run in engine.ts AFTER
   * dedupeOpportunities and BEFORE the Top-N slice. `aliasGroupsApplied` is
   * 0 in the common case where no two surviving opportunities' `problem`
   * statements collided under the fixed alias map — expected, since
   * category-based clustering already de-duplicates most synonyms upstream
   * (see semantic.ts module doc). Always present (never omitted), so a
   * clean no-op run is visibly proven rather than silently absent.
   */
  semanticMerge: { aliasGroupsApplied: number; aliasGroups: AliasGroupSummary[] };
  /**
   * Loop 4 aggregate regression dashboard (see calibration.ts's
   * `computeAggregateCalibration`) — computed over the FULL pre-dedup,
   * pre-slice per-cluster opportunity list ("the built opportunity list"),
   * not just the shipped `opportunities` Top-N, so it reflects the whole
   * run's health. Read-only diagnostics; never fed back into ranking.
   */
  calibration: CalibrationAggregate;
  /**
   * Opportunity Selection / elimination layer (see opportunity-selection.ts)
   * — Founder OS's final, additive "eliminate weak opportunities until only
   * the highest-conviction survive" reduction, computed as the LAST step in
   * engine.ts's `analyze`, over the already-built, already-ranked shipped
   * `opportunities` array above (read-only: never re-sorts, re-scores, or
   * mutates that array or any report on it). Composes exclusively from
   * fields already computed on each `FounderOpportunityReport` (plus the
   * matching source `ProblemCluster`, looked up by `clusterId` exactly like
   * `attachFounderIntelligence`/`attachAiDecisionValidation` already do) —
   * no new raw-evidence scan, no recomputation of fois/decision/calibration/
   * founderIntelligence/aiDecisionValidation/anything upstream.
   */
  opportunitySelection: OpportunitySelectionResult;
}

/* ---------------------------------------------------------------------- */
/* Loop 3, Part A — semantic (canonical-alias) clustering (semantic.ts)   */
/* ---------------------------------------------------------------------- */

/**
 * Per-surviving-opportunity semantic-cluster metadata, attached by
 * `mergeSynonymOpportunities` (semantic.ts) to every report it returns —
 * merged or not. When a report was not merged with anything (the common
 * case, see semantic.ts module doc), `aliases` is empty and `mergedCount`
 * is 1: the fields are still populated so "Cluster Title / Aliases /
 * Mention Count / Supporting Sources" is always answerable per-opportunity,
 * never conditionally present.
 */
export interface SemanticClusterInfo {
  /** The alias map's canonical group name if `problem` matched a known synonym group, else `problem` itself. */
  canonicalTitle: string;
  /** Other reports' `problem` statements merged into this survivor (excludes the survivor's own `problem`); empty if no merge occurred. */
  aliases: string[];
  /** Combined `supportingEvidence.evidenceCount` across every merged report (== this report's own count if no merge occurred). */
  mentionCount: number;
  /** Union of `supportingEvidence.sourceBreakdown` keys across every merged report, sorted. */
  supportingSources: string[];
  /** How many opportunity reports were merged into this survivor; 1 means no merge occurred. */
  mergedCount: number;
}

/** One non-trivial (2+ member) alias-collision group found by `mergeSynonymOpportunities`. Only groups that actually merged something appear here — see semantic.ts. */
export interface AliasGroupSummary {
  canonical: string;
  /** The specific alias-map phrase that triggered the match. */
  matchedAlias: string;
  /** `problem` statement of every report in this group, survivor included. */
  memberProblems: string[];
  survivorId: string;
  /** ids of the reports that were merged away (dropped in favor of the survivor). */
  mergedReportIds: string[];
}

/** `canonicalizeProblem`'s return shape — see semantic.ts. */
export interface CanonicalizationResult {
  canonical: string;
  /** The alias-map phrase that matched, or null if `text` did not match any known synonym group (canonical falls back to `text.trim()`). */
  matchedAlias: string | null;
}

/** `mergeSynonymOpportunities`'s return shape — see semantic.ts. */
export interface SemanticMergeResult {
  /** Surviving reports, each augmented with `semanticCluster`, in the same relative order as the input (see semantic.ts module doc on ordering). */
  merged: FounderOpportunityReport[];
  aliasGroups: AliasGroupSummary[];
}

/* ---------------------------------------------------------------------- */
/* Loop 3, Parts B-G — Founder Decision layer (decision.ts)               */
/* ---------------------------------------------------------------------- */

/** One founder-facing intent bucket's share of a cluster's classified items — see decision.ts's `computeIntentDistribution`. */
export interface IntentDistributionEntry {
  intent: string;
  /** Number of DISTINCT items carrying this intent (an item matching e.g. both "bug" and "complaint" counts once under "Founder Pain", not twice). */
  count: number;
  /** `count / clusterItems.length`. NOTE: fractions across entries do not necessarily sum to 1.0, since one item can carry multiple simultaneous intents. */
  fraction: number;
}

/** Freshness label for a cluster's evidence — see decision.ts's `computeFreshness`. Never fabricated: "unknown" when no item carries `publishedAt`. */
export type DecisionFreshness = "fresh" | "aging" | "stale" | "unknown";

/** Evidence-quality + echo-chamber read for a Founder Decision — see decision.ts Part C. */
export interface DecisionEvidence {
  evidenceCount: number;
  uniqueSources: number;
  uniqueAuthors: number;
  freshness: DecisionFreshness;
  /** Count of distinct sources that EACH independently contain at least one item carrying the cluster's dominant intent. */
  crossSourceAgreement: number;
  /** True when one source accounts for >= the module's dominant-source-share threshold of all evidence — an echo-chamber risk. */
  echoChamber: boolean;
  explanation: string;
}

/** Structured, fact-grounded narrative for a Founder Decision — see decision.ts Part D. Every field must cite a real number from the input; never a generic platitude. */
export interface DecisionReasoning {
  whyThisMatters: string;
  whyNow: string;
  whoExperiences: string;
  whatEvidence: string;
  whyFoundersPay: string;
  biggestUncertainty: string;
  biggestImplementationRisk: string;
}

/** One named, documented contributor to `DecisionConfidence.score` — see decision.ts Part E. */
export interface DecisionConfidenceContributor {
  name: string;
  points: number;
  reason: string;
}

/**
 * A NEW, decision-level, explainable 0-100 confidence score — distinct from
 * (but reading, as one input) the source `ProblemCluster.confidence` band.
 * Does not modify or replace `src/problems/confidence.ts` or the report's
 * existing `confidence` field. See decision.ts Part E.
 */
export interface DecisionConfidence {
  score: number;
  band: "high" | "medium" | "low";
  contributors: DecisionConfidenceContributor[];
  weaknesses: string[];
}

/** One quality gate evaluated for a Founder Decision — always present (fired or not), for transparency. See decision.ts Part G. */
export interface DecisionQualityGate {
  name: string;
  fired: boolean;
  reason: string;
}

export type FounderDecisionVerdict = "BUILD" | "WATCH" | "IGNORE";

/**
 * Freshly-computed BUILD/WATCH/IGNORE verdict from fois.overall + this
 * decision's own confidence + quality gates — NOT a copy of the report's
 * existing `recommendation.verdict` (which keeps its own WAIT vocabulary
 * untouched for existing consumers). See decision.ts Part F.
 */
export interface DecisionRecommendation {
  verdict: FounderDecisionVerdict;
  justification: string;
  primaryRisk: string;
  primaryOpportunity: string;
}

/**
 * Founder Decision — Loop 3's composition layer over the already-computed
 * recommendation/confidence/fois/buyingIntent/competition/evidence outputs.
 * Additive to FounderOpportunityReport; see decision.ts module doc.
 */
export interface FounderDecision {
  intentDistribution: IntentDistributionEntry[];
  evidence: DecisionEvidence;
  reasoning: DecisionReasoning;
  confidence: DecisionConfidence;
  recommendation: DecisionRecommendation;
  qualityGates: DecisionQualityGate[];
}

/* ---------------------------------------------------------------------- */
/* Loop 4 — Calibration & Diagnostics layer (calibration.ts)              */
/* ---------------------------------------------------------------------- */

/**
 * One documented, pure-function-derived calibration signal for a single
 * FounderOpportunityReport — see calibration.ts for each formula. Every
 * value is a READ-ONLY diagnostic computed from fields already present on
 * the report (fois, decision, buyingIntent, semanticCluster); none of these
 * numbers feed back into fois.overall, the report's rank, or its
 * recommendation/decision verdict.
 */
export interface CalibrationMetrics {
  /** 0-1: 0 = sitting exactly on a BUILD/IGNORE boundary, 1 = one WATCH-band-width (or more) away from both boundaries. See calibration.ts. */
  rankingStability: number;
  /** 0-1: fraction of the fixed FOIS dimensions whose `raw` score is >= 40 — how many independent signals actually fired, vs. one lucky dimension. */
  signalDensity: number;
  /** decision.evidence.evidenceCount / decision.evidence.uniqueSources (guarded against divide-by-zero) — mentions per source; high with few sources suggests an echo chamber. */
  evidenceDensity: number;
  /** 0-1 (guarded/clamped): decision.evidence.crossSourceAgreement / decision.evidence.uniqueSources. */
  crossSourceConsistency: number;
  /** 0-1: the dominant entry's `fraction` in decision.intentDistribution (0 if the distribution is empty) — how concentrated the classified intent signal is. */
  intentConsistency: number;
  /** 0-1 (guarded): sum of fired fois.penalties points / (fois.overall + that sum) — how much penalty weight relative to the total score. */
  noiseRatio: number;
  /** 0-1: (semanticCluster.mergedCount - 1) / semanticCluster.mergedCount — 0 when nothing was merged (mergedCount === 1). */
  duplicateCompressionRatio: number;
}

/** One always-evaluated, named quality-diagnostic flag — see calibration.ts's diagnostic definitions. Always present whether fired or not, for transparency (mirrors decision.ts's DecisionQualityGate). */
export interface CalibrationDiagnosticFlag {
  flag: string;
  fired: boolean;
  reason: string;
}

/**
 * DIAGNOSTIC ONLY — see calibration.ts module doc. `rankBefore` is this
 * report's 1-based index in the actual shipped `opportunities` order.
 * `rankAfter` is a HYPOTHETICAL 1-based index if the list were instead
 * sorted by a noise-adjusted score (fois.overall * (1 - noiseRatio)); it is
 * NEVER applied to the shipped order, which stays sorted by fois.overall.
 * `movement` = rankBefore - rankAfter (positive = would rank higher/better
 * under the noise-adjusted view).
 */
export interface CalibrationRanking {
  rankBefore: number;
  rankAfter: number;
  movement: number;
  reason: string;
}

/**
 * Only populated (non-null) for opportunities whose
 * decision.recommendation.verdict === "BUILD" — non-BUILD verdicts get
 * `null` here rather than a less-meaningful explanation of "why ranked
 * here" for an opportunity that isn't being recommended to build.
 */
export interface CalibrationExplainability {
  whyRankedHere: string;
  whyAboveNext: string;
  topContributingSignals: string[];
  penaltiesApplied: string[];
  largestUncertainty: string;
}

/** Composed from CalibrationDiagnosticFlag firings — see calibration.ts's composition rule. `likely` never removes the opportunity from the shipped list; it only marks it for founder review. */
export interface CalibrationFalsePositive {
  likely: boolean;
  reasons: string[];
}

/**
 * Loop 4 calibration/diagnostics bundle attached to every FounderOpportunityReport
 * in the shipped `opportunities` list — see calibration.ts. Entirely
 * additive and read-only: nothing here alters fois, decision, or the
 * report's rank.
 */
export interface OpportunityCalibration {
  metrics: CalibrationMetrics;
  diagnostics: CalibrationDiagnosticFlag[];
  ranking: CalibrationRanking;
  explainability: CalibrationExplainability | null;
  falsePositive: CalibrationFalsePositive;
}

/** One fixed-width fois.overall bucket in the threshold diagnostic's observed distribution. */
export interface CalibrationFoisBucket {
  range: string;
  count: number;
}

/**
 * ADVISORY ONLY — see calibration.ts's computeThresholdDiagnostic.
 * `suggestion` is free text; no automatic threshold change is ever applied
 * anywhere in this codebase from this field. `rejectedPct`/`acceptedPct`/
 * `uncertainPct` are 0-100 percentages of the `builtOpportunities` list
 * passed to `computeThresholdDiagnostic`.
 */
export interface ThresholdDiagnostic {
  foisBuildThreshold: number;
  observedFoisDistribution: CalibrationFoisBucket[];
  rejectedPct: number;
  acceptedPct: number;
  uncertainPct: number;
  suggestion: string;
}

/**
 * Aggregate regression dashboard for a whole OpportunityEngine.analyze()
 * run — attached to TopOpportunitiesReport. Computed over the full `built`
 * per-cluster opportunity list (before dedup/semantic-merge/Top-N slicing),
 * NOT just the shipped Top-N — see calibration.ts's computeAggregateCalibration.
 */
export interface CalibrationAggregate {
  itemsCollected: number;
  /** null (never fabricated) when the source ResearchSession has no `relevanceFilter` (see calibration.ts) — check `notes` for why. */
  itemsRemovedByRelevance: number | null;
  itemsClustered: number;
  opportunitiesRejectedByGates: number;
  /** Mean of `confidence.score` (0-1, the SOURCE ProblemCluster's confidence — distinct from decision.confidence). */
  averageConfidence: number;
  averageFois: number;
  averageEvidence: number;
  averageIntentConcentration: number;
  averageSourceDiversity: number;
  /** Mean of `decision.confidence.score` (0-100, the Loop 3 decision-level confidence — distinct from `averageConfidence` above). */
  averageRecommendationConfidence: number;
  verdictBreakdown: { build: number; watch: number; ignore: number };
  falsePositiveCount: number;
  thresholdDiagnostic: ThresholdDiagnostic;
  /** Honest caveats about this aggregate's own inputs (e.g. missing relevanceFilter) — never silently dropped. */
  notes: string[];
}

/* ---------------------------------------------------------------------- */
/* Loop 7 — Founder Intelligence layer (founder-intelligence.ts)          */
/* ---------------------------------------------------------------------- */

/**
 * Fixed 5-tier market-maturity vocabulary shared by Part A (competitor
 * intelligence) and Part C (`estimateMarketMaturity`) — see
 * founder-intelligence.ts for the exact, documented rule table.
 */
export type MarketMaturityLabel = "emerging" | "growing" | "crowded" | "saturated" | "declining";

/** `estimateMarketMaturity`'s return shape (founder-intelligence.ts Part C). Every branch cites real numbers in `reasons`. */
export interface MarketMaturityResult {
  maturity: MarketMaturityLabel;
  reasons: string[];
}

export type OpenSourceVsSaas = "open-source" | "saas" | "mixed" | "unknown";
export type EnterpriseVsSmb = "enterprise" | "smb" | "mixed" | "unknown";
/** "unknown" is reserved for the zero-competitor case (never a fabricated guess) — see founder-intelligence.ts Part A. */
export type CompetitorConfidence = "high" | "medium" | "low" | "unknown";

/**
 * Loop 7, Part A — Competitor Intelligence. Composed entirely from fields
 * already present on `CompetitionResult`/`PricingSignal` plus a bounded,
 * already-selected evidence-text sample (`cluster.evidence
 * .representativeExamples`, max 3 items) — never a new extraction pass and
 * never an invented competitor name. See founder-intelligence.ts Part A.
 */
export interface CompetitorIntelligence {
  /** Top competitors by `mentionCount` (competitors[] is already sorted desc), capped at `PRIMARY_COMPETITOR_CAP`. */
  primaryCompetitors: string[];
  /** Fixed inference from `cluster.category` + competitor count — see founder-intelligence.ts's `competitorCategoryFor`. */
  competitorCategory: string;
  /** Reused verbatim from Part C's `estimateMarketMaturity` result — not redefined here. */
  marketMaturity: MarketMaturityLabel;
  openSourceVsSaas: OpenSourceVsSaas;
  enterpriseVsSmb: EnterpriseVsSmb;
  /** Subset of competitor names whose own evidence (name + evidenceUrls) contains a real indie/bootstrapped signal phrase — often empty; never guessed. */
  soloFounderFriendlyCompetitors: string[];
  /** The report's existing `pricing` field reused AS-IS when `extractedPrices.length > 0`, else `null` — never a fabricated price. */
  pricingEvidence: PricingSignal | null;
  competitorConfidence: CompetitorConfidence;
  /** Flattened, deduplicated union of every competitor's `evidenceUrls`. */
  competitorEvidence: string[];
  explanation: string;
}

/** Fixed gap taxonomy — see founder-intelligence.ts Part B's `CONCEPT_ID_TO_GAP`/`CATEGORY_GAP_FALLBACK` lookup tables. */
export type MarketGapName =
  | "Missing Features"
  | "Expensive Pricing"
  | "Complex UX"
  | "Missing AI"
  | "Poor Automation"
  | "Poor Mobile Experience"
  | "Slow Support"
  | "Weak Integrations"
  | "Missing API"
  | "Poor Onboarding"
  | "Weak Documentation"
  | "Manual Workflow";

/**
 * One detected market gap — ONLY appears in `FounderIntelligence.marketGaps`
 * when backed by real evidence (a matched `cluster.conceptBreakdown` entry,
 * or the category-level fallback when `conceptBreakdown` is absent). Never
 * listed with zero evidence. See founder-intelligence.ts Part B.
 */
export interface MarketGap {
  gap: MarketGapName;
  evidenceCount: number;
  /** `conceptBreakdown[].conceptId`s that matched this gap; empty for the category-level fallback (no concept-level match existed). */
  exampleConceptIds: string[];
  confidence: "high" | "medium" | "low";
}

export type CompetitionPressureLabel = "very-low" | "low" | "medium" | "high" | "very-high";

/** `estimateCompetitionPressure`'s return shape (founder-intelligence.ts Part E). */
export interface CompetitionPressureResult {
  pressure: CompetitionPressureLabel;
  explanation: string;
}

export type FounderPricingModel = "subscription" | "one-time" | "usage" | "freemium" | "enterprise";
export type FounderMvpComplexity = "low" | "medium" | "high";
export type SoloFounderSuitability = "high" | "medium" | "low";

/**
 * Loop 7, Part D — Founder Opportunity synthesis. A COMPOSITION of
 * already-computed fields (`decision.recommendation`, `fois`,
 * `buildDifficulty`, `calibration`) plus this module's own Parts A-C
 * outputs — never a new verdict engine. `shouldBuild` always mirrors
 * `decision.recommendation.verdict === "BUILD"` exactly. See
 * founder-intelligence.ts Part D.
 */
export interface FounderOpportunitySynthesis {
  shouldBuild: boolean;
  why: string[];
  whyNot: string[];
  bestCustomer: string;
  whyThisCustomer: string;
  bestPricingModel: FounderPricingModel;
  /** `buildDifficulty.tier` reused verbatim, never recomputed. */
  expectedBuildDifficulty: BuildDifficultyTier;
  expectedMvpComplexity: FounderMvpComplexity;
  soloFounderSuitability: SoloFounderSuitability;
}

/** Fixed differentiation-strategy taxonomy — see founder-intelligence.ts Part F. A strategy only appears when directly supported by a real, already-computed signal; an empty array is valid and expected. */
export type DifferentiationStrategyName =
  | "AI-first"
  | "Automation-first"
  | "Vertical SaaS"
  | "Lower Pricing"
  | "Faster UX"
  | "Developer-first"
  | "No-code"
  | "Privacy-first"
  | "Offline-first";

export interface DifferentiationStrategy {
  strategy: DifferentiationStrategyName;
  evidenceReason: string;
}

/** Fixed 8-item risk taxonomy — ALWAYS all 8 present in `FounderIntelligence.risks`, even when `severity === "low"`. See founder-intelligence.ts Part G. */
export type FounderRiskName =
  | "Market Risk"
  | "Execution Risk"
  | "Technical Risk"
  | "Pricing Risk"
  | "Competition Risk"
  | "Customer Risk"
  | "Platform Risk"
  | "Regulation Risk";

export interface FounderIntelligenceRisk {
  risk: FounderRiskName;
  severity: "low" | "medium" | "high";
  explanation: string;
}

/**
 * Loop 7 — Founder Intelligence bundle (founder-intelligence.ts). A
 * READ-ONLY composition layer over fields already computed elsewhere
 * (`competition`, `buyingIntent`, `pricing`, `buildDifficulty`, `fois`,
 * `decision`, `calibration`, plus the source `ProblemCluster`'s
 * `conceptBreakdown`/`frequency`/`category`) — no re-scan of raw evidence
 * items, no re-classification, no LLM call. Nothing here alters `fois`,
 * `decision`, `calibration`, or the report's rank. Attached to every
 * report in the shipped `opportunities` list by `attachFounderIntelligence`,
 * run in engine.ts AFTER `attachCalibration` (mirrors that function's
 * placeholder-then-overwrite pattern — see `defaultFounderIntelligence`).
 */
export interface FounderIntelligence {
  competitorIntelligence: CompetitorIntelligence;
  marketGaps: MarketGap[];
  marketMaturity: MarketMaturityResult;
  founderOpportunity: FounderOpportunitySynthesis;
  competitionPressure: CompetitionPressureResult;
  differentiationStrategies: DifferentiationStrategy[];
  risks: FounderIntelligenceRisk[];
}

/* ---------------------------------------------------------------------- */
/* Loop 8 — AI Decision Validation layer (ai-decision-validation.ts)      */
/* ---------------------------------------------------------------------- */

/**
 * Module 1 — Decision Reasoning. A COMPOSITION of fields already computed on
 * the source `ProblemCluster` (`normalizedStatement`, `rootCause`,
 * `causeChain`, `frequency.growth`) plus `FounderIntelligence.marketGaps` —
 * never a new scan, never an invented fact. See ai-decision-validation.ts
 * Module 1 for the exact per-field derivation.
 */
export interface AiDecisionReasoning {
  actualBusinessProblem: string;
  whyExists: string;
  whyCurrentSolutionsFailing: string;
  /** Reused verbatim from `decision.reasoning`'s own field values — never regenerated. */
  evidenceSupporting: string[];
  /** Fired `decision.qualityGates` + `fois.weaknesses` + fired `calibration.diagnostics`, reused verbatim. */
  evidenceWeakening: string[];
  /** From `cluster.frequency.growth.label`: rising/stable -> "recurring", declining -> "temporary", insufficient-data -> "unknown". */
  painTemporaryOrRecurring: "temporary" | "recurring" | "unknown";
}

/**
 * Module 2 — Counter-Evidence Engine. Exactly 5 fixed, always-present claims
 * (fired or not), each a deliberately adversarial reframing of an
 * ALREADY-COMPUTED signal — never a new scan. This is the mission's explicit
 * "never assume BUILD" mechanism.
 */
export interface AiCounterEvidenceClaim {
  claim:
    | "problem is exaggerated"
    | "market already saturated"
    | "users solved it manually"
    | "competitors already dominate"
    | "demand may be temporary";
  fired: boolean;
  reason: string;
}

/**
 * Module 3 — BUILD/WATCH/IGNORE Validation. `validatedRecommendation`
 * mirrors `decision.recommendation.verdict` by default; the ONLY override is
 * an asymmetric, documented BUILD -> WATCH downgrade (see
 * `COUNTER_EVIDENCE_DOWNGRADE_THRESHOLD` in ai-decision-validation.ts) — this
 * engine never upgrades a verdict and never downgrades WATCH -> IGNORE.
 */
export interface AiValidationResult {
  validatedRecommendation: FounderDecisionVerdict;
  validationReason: string;
  /** <= 0, see ai-decision-validation.ts's CONFIDENCE_ADJUSTMENT_PER_FIRED_CLAIM formula. Does not mutate `decision.confidence.score`. */
  confidenceAdjustment: number;
}

/**
 * Module 4 — Founder Risk Engine. Fixed 8-item taxonomy, ALWAYS all 8
 * present. 5 of the 8 (Market/Competition/Execution/Technical/Platform Risk)
 * are REUSED as-is from `founderIntelligence.risks` (converted to a 0-100
 * score via a fixed severity->score table) rather than duplicated; the other
 * 3 (Distribution/Monetization/Timing Risk) are genuinely new, freshly
 * computed from already-attached fields. See ai-decision-validation.ts Module 4.
 */
export type AiFounderRiskName =
  | "Market Risk"
  | "Competition Risk"
  | "Execution Risk"
  | "Technical Risk"
  | "Distribution Risk"
  | "Monetization Risk"
  | "Timing Risk"
  | "Platform Risk";

export interface AiFounderRisk {
  risk: AiFounderRiskName;
  score: number; // 0-100
  reason: string;
  supportingEvidence: string[];
}

/**
 * Module 5 — Founder Opportunity Engine. A COMPOSITION/extension of
 * `founderIntelligence.founderOpportunity` + `marketGaps` — never a new
 * customer-research pass.
 */
export interface AiFounderOpportunityProfile {
  idealCustomerProfile: string;
  whoShouldNotBeTargeted: string;
  earlyAdopterProfile: string;
  /** = `cluster.normalizedStatement`, reused verbatim. */
  corePain: string;
  /** Top `founderIntelligence.marketGaps` by evidenceCount, capped — see TOP_MVP_FEATURE_CAP. */
  topMvpFeatures: string[];
  /** Empty array (with the reason documented in code, per the "never invent" quality gate) when no real high-complexity signal exists. */
  featuresToAvoid: string[];
  suggestedLaunchStrategy: string;
}

export type PricingConfidence = "high" | "medium" | "low" | "not-verified";
/** "not-verified" is the honest default absent a real signal — see Module 10's quality-gate philosophy. */
export type MonetizationSupportLabel = "supported" | "unsupported" | "not-verified";

/**
 * Module 6 — Monetization Reasoning. `possiblePricing` NEVER invents a
 * dollar figure: when no comparable pricing evidence exists, it contains the
 * literal string "NOT VERIFIED" instead of a fabricated number.
 */
export interface AiMonetizationReasoning {
  possiblePricing: string;
  pricingConfidence: PricingConfidence;
  pricingAssumptions: string[];
  subscriptionViability: MonetizationSupportLabel;
  enterprisePotential: MonetizationSupportLabel;
}

/**
 * Module 7 — AI Confidence Review. `originalScore` is a read-only COPY of
 * `decision.confidence.score` (0-100 scale, unmodified). `adjustedScore` is
 * a NEW, separately-scaled 0-1 normalized view (`originalScore/100 +
 * confidenceAdjustment`, clamped 0-1) — this field never mutates
 * `decision.confidence` itself. Never increases confidence, only reduces or
 * leaves it as-is ("justified").
 */
export interface AiConfidenceReview {
  originalScore: number;
  adjustedScore: number;
  adjustment: number;
  verdict: "justified" | "reduced";
  reason: string;
}

/**
 * Module 8 — Decision Explainability. Every field is composed from real,
 * already-cited strings/values produced by Modules 1-7 — never new free text
 * generation.
 */
export interface AiDecisionExplainability {
  whyBuild: string;
  whyWait: string;
  whyIgnore: string;
  evidenceThatMattersMost: string;
  evidenceMissing: string;
  whatCouldChangeThis: string;
}

/**
 * Module 9 — Final Founder Recommendation, the top-level return of the
 * whole AI Decision Validation module. `executiveSummary` is a
 * TEMPLATE-composed string (never free-text generation) citing real numbers
 * already computed elsewhere on the report.
 */
export interface FinalFounderRecommendation {
  executiveSummary: string;
  recommendedAction: FounderDecisionVerdict;
  evidenceSummary: string;
  businessOpportunity: string;
  risks: AiFounderRisk[];
  recommendedMvp: string[];
  suggestedPricingDirection: string;
  goToMarketDirection: string;
  /** Aggregate of every "NOT VERIFIED"/"unknown" signal surfaced across Modules 1-7. */
  unknowns: string[];
  nextValidationSteps: string[];
}

/**
 * Module 11 — Self Review. One named self-consistency check across fields
 * ALREADY COMPUTED by Modules 1-9 above — no new data, no re-derivation.
 * `detail` always cites the exact two (or more) field values compared, so a
 * fired contradiction is loud and traceable, never a vague warning. See
 * ai-decision-validation.ts's `buildSelfReview` for the fixed, documented
 * checklist.
 */
export interface AiSelfReviewCheck {
  /** Short, stable name for this check (e.g. "BUILD verdict vs high-scoring risks") — see buildSelfReview for the fixed set. */
  check: string;
  /** false = a contradiction was found (fired); true = the compared fields agree, or the contradiction condition simply didn't apply. */
  consistent: boolean;
  /** Cites the exact field paths/values compared (e.g. `validation.validatedRecommendation="BUILD" vs risks[...]`) — never a vague summary. */
  detail: string;
}

/**
 * Module 11 — Self Review bundle. `internallyConsistent` is `true` iff every
 * entry in `checks` has `consistent === true`. This is a READ-ONLY
 * diagnostic layer: it never mutates `validation`, `risks`, `monetization`,
 * `reviewedConfidence`, or `finalRecommendation` — it only reports on them.
 * See ai-decision-validation.ts's `buildSelfReview`.
 */
export interface AiSelfReview {
  checks: AiSelfReviewCheck[];
  internallyConsistent: boolean;
}

/**
 * Loop 8 — AI Decision Validation bundle (ai-decision-validation.ts). A
 * READ-ONLY composition/adversarial-review layer over `decision`,
 * `founderIntelligence`, `fois`, and `calibration` — all already attached
 * earlier in the same report-construction pipeline. No LLM call, no re-scan
 * of raw evidence items, no re-derivation of clustering/FOIS/decision/
 * calibration/founderIntelligence. Nothing here alters any of those fields
 * or the report's rank. Attached to every report in the shipped
 * `opportunities` list by `attachAiDecisionValidation`, run in engine.ts
 * AFTER `attachFounderIntelligence` (the last step in the pipeline).
 */
export interface AiDecisionValidation {
  decisionReasoning: AiDecisionReasoning;
  counterEvidence: AiCounterEvidenceClaim[];
  validation: AiValidationResult;
  risks: AiFounderRisk[];
  founderOpportunity: AiFounderOpportunityProfile;
  monetization: AiMonetizationReasoning;
  reviewedConfidence: AiConfidenceReview;
  explainability: AiDecisionExplainability;
  finalRecommendation: FinalFounderRecommendation;
  /**
   * Module 11 — additive self-consistency / internal-contradiction check
   * across the fields already computed above (Modules 1-9). Never removes,
   * renames, or alters any existing field; see ai-decision-validation.ts's
   * `buildSelfReview`.
   */
  selfReview: AiSelfReview;
}

/* ---------------------------------------------------------------------- */
/* Opportunity Selection / elimination layer (opportunity-selection.ts)   */
/* ---------------------------------------------------------------------- */

/**
 * "Never guess": UNKNOWN is a first-class outcome distinct from FAIL,
 * reserved for gates whose backing signal genuinely doesn't exist on this
 * report/cluster (never inferred from absence). See opportunity-selection.ts
 * Part A for the exact, documented per-gate derivation rule.
 */
export type QualificationGateStatus = "PASS" | "FAIL" | "UNKNOWN";

/** One of the 10 always-evaluated qualification gates — see opportunity-selection.ts Part A. */
export interface QualificationGate {
  gate: string;
  status: QualificationGateStatus;
  evidence: string[];
  reason: string;
}

/**
 * Part B — Elimination verdict. `rejected=true` when ANY real, cited signal
 * fires (see opportunity-selection.ts Part B's fixed rule list). Every
 * string in `reasons` cites the exact real value that triggered it — never a
 * generic message.
 */
export interface EliminationVerdict {
  rejected: boolean;
  reasons: string[];
}

/**
 * Part C — Differentiation Engine. A cheap composition over
 * `founderIntelligence.differentiationStrategies`, `founderIntelligence.marketGaps`,
 * `competition.competitors`, and the source cluster's `symptoms`/`rootCause`
 * — never a new detection pass. See opportunity-selection.ts Part C.
 */
export interface DifferentiationEngineResult {
  currentSolution: string;
  whyUsersStillUseIt: string;
  biggestComplaints: string[];
  missingFeatures: string[];
  pricingComplaints: string[];
  manualWorkarounds: string[];
  aiOpportunities: string[];
  automationOpportunities: string[];
  uxOpportunities: string[];
  workflowOpportunities: string[];
  whyUsersWouldSwitch: string;
}

/** Fixed 4-tier friction/risk vocabulary shared by every Part D dimension — see opportunity-selection.ts Part D. */
export type FrictionTier = "low" | "medium" | "high" | "unknown";

/**
 * Part D — Market Replacement Analysis. Every one of the 5 named tiers is
 * derived from `businessIntelligence.switchingDifficulty` +
 * `competition.competitors.length` + `report.technicalBlueprint` (all
 * already computed, read-only here) — see opportunity-selection.ts Part D
 * for the exact, documented per-field derivation and the `replacementFeasibility`
 * composite formula.
 */
export interface MarketReplacementAnalysis {
  switchFriction: FrictionTier;
  switchFrictionReason: string;
  migrationDifficulty: FrictionTier;
  migrationDifficultyReason: string;
  integrationDependency: FrictionTier;
  integrationDependencyReason: string;
  learningCurve: FrictionTier;
  learningCurveReason: string;
  lockInRisk: FrictionTier;
  lockInRiskReason: string;
  replacementFeasibility: "high" | "medium" | "low" | "unknown";
  replacementFeasibilityReason: string;
}

/**
 * Part E — Business Viability. A pure re-composition of
 * `revenueIntelligence`/`businessIntelligence` fields already computed
 * elsewhere — `retentionLikelihood` is ALWAYS `"unknown"` since no
 * churn/retention signal has ever been measured anywhere upstream in this
 * codebase (honestly reported, never invented). See
 * opportunity-selection.ts Part E for the `viabilityTier` composite formula.
 */
export interface BusinessViabilityResult {
  /** Reused verbatim from `businessIntelligence.revenueModel`. */
  revenueModel: RevenueModelLabel;
  /** Reused verbatim from `revenueIntelligence.pricingConfidence`. */
  pricingConfidence: PricingConfidence;
  /** Reused verbatim from `businessIntelligence.urgency`. */
  customerUrgency: UrgencyBand;
  businessFrequency: number;
  businessFrequencyReason: string;
  /** Always `"unknown"` — see this interface's doc. */
  retentionLikelihood: "unknown";
  retentionLikelihoodReason: string;
  /** Reused verbatim from `businessIntelligence.expansionPotential` (== `revenueIntelligence.expansionPotential`). */
  expansionPotential: MonetizationSupportLabel;
  expansionPotentialReason: string;
  viabilityTier: "high" | "medium" | "low" | "unknown";
  viabilityTierReason: string;
}

/** One scored, weighted, named dimension of the High Conviction Score — see opportunity-selection.ts Part F. */
export interface HighConvictionScoreDimension {
  name: string;
  raw: number; // 0-100
  weight: number; // 0-1, all 8 dimension weights sum to 1.0 (asserted in tests)
  weighted: number; // raw * weight, 0-100 scale
  reason: string;
}

/**
 * Part F — High Conviction Score. A NEW, separate, additive 0-100 score,
 * distinct from `fois.overall` (fois.ts is never touched by this module) —
 * see opportunity-selection.ts Part F for the exact 8-dimension formula and
 * documented weight rationale.
 */
export interface HighConvictionScore {
  overall: number; // 0-100
  dimensions: HighConvictionScoreDimension[];
}

/**
 * Part H — Self Critique, computed ONLY for survivors (see
 * opportunity-selection.ts Part H). Every field reuses already-computed
 * `aiDecisionValidation`/`decision`/`calibration` fields — never a new
 * derivation.
 */
export interface SelfCritique {
  reasonsToBuild: string[];
  reasonsNotToBuild: string[];
  strongestRisk: { risk: string; score: number; reason: string };
  strongestUnknown: string;
  evidenceStillMissing: string[];
  customerInterviewsRequired: string[];
}

/** One opportunity that survived Part B elimination and made the top `MAX_SURVIVORS` cut — see opportunity-selection.ts Part G. */
export interface OpportunitySelectionSurvivor {
  report: FounderOpportunityReport;
  highConvictionScore: HighConvictionScore;
  whySurvived: string;
  selfCritique: SelfCritique;
}

/** One opportunity that did NOT survive — either Part-B-eliminated or ranked below the `MAX_SURVIVORS` cap. See opportunity-selection.ts Part G. */
export interface OpportunitySelectionRejected {
  reportId: string;
  whyRejected: string[];
}

/**
 * Part G — Survivor Ranking, the top-level return of the whole Opportunity
 * Selection module (see opportunity-selection.ts's `selectTopOpportunities`).
 * Attached as `TopOpportunitiesReport.opportunitySelection` — see that
 * field's doc.
 */
export interface OpportunitySelectionResult {
  survivors: OpportunitySelectionSurvivor[];
  rejected: OpportunitySelectionRejected[];
}

/** Referenced for downstream typing convenience — re-exported for callers. */
export type {
  ClassifiedItem,
  ProblemCategory,
  ProblemCluster,
  ProblemIntelligenceReport,
  RawResearchItem,
  ResearchSession,
};
