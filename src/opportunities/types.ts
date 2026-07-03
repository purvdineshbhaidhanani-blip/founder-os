import type {
  ClassifiedItem,
  ProblemCategory,
  ProblemCluster,
  ProblemIntelligenceReport,
} from "../problems/types.js";
import type { RawResearchItem, ResearchSession } from "../research/types.js";

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

/** Referenced for downstream typing convenience — re-exported for callers. */
export type {
  ClassifiedItem,
  ProblemCategory,
  ProblemCluster,
  ProblemIntelligenceReport,
  RawResearchItem,
  ResearchSession,
};
