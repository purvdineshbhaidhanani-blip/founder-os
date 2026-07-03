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

/** Referenced for downstream typing convenience — re-exported for callers. */
export type {
  ClassifiedItem,
  ProblemCategory,
  ProblemCluster,
  ProblemIntelligenceReport,
  RawResearchItem,
  ResearchSession,
};
