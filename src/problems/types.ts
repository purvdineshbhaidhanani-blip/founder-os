import type { RawResearchItem, ResearchSession } from "../research/types.js";

/**
 * Problem Intelligence Engine surface. Deterministic, rule-based
 * classification of raw research items into problem categories, clustered
 * into founder-facing ProblemCluster records with explainable evidence,
 * frequency and confidence scoring. No LLM call — every threshold below is
 * a fixed constant, mirroring the rest of this codebase's Reality Guard
 * philosophy of never inventing certainty.
 */

export type ProblemCategory =
  | "complaint"
  | "feature-request"
  | "bug"
  | "missing-capability"
  | "workflow-friction"
  | "pricing-complaint"
  | "migration"
  | "looking-for-alternative"
  | "buying-intent"
  | "praise"
  | "trend"
  | "market-gap"
  | "workaround"
  | "existing-spending"
  | "other";

export interface CategoryMatch {
  category: ProblemCategory;
  confidence: number; // 0-1
  matchedPatterns: string[]; // which keyword phrases actually matched, for explainability
}

export interface ClassifiedItem {
  item: RawResearchItem;
  categories: CategoryMatch[]; // one item can match multiple categories, per spec
  urgency?: boolean; // true if the item's text matches an urgency-signal phrase
  emotionalIntensityScore?: number; // 0-1, distinct emotional-intensity phrase match count, same tiering as category confidence (0/1/2/3+ matches -> 0/0.3/0.55/0.8)
}

export interface ExtractedProblem {
  classifiedItem: ClassifiedItem;
  category: ProblemCategory; // primary category this extraction is for
  normalizedStatement: string; // fixed canonical phrase for this category, never free-form generated
}

export interface ClusterEvidence {
  evidenceCount: number;
  sourceBreakdown: Record<string, number>; // sourceId -> count
  originalUrls: string[]; // deduplicated
  representativeExamples: RawResearchItem[]; // top 3 by engagement (or first 3 if no engagement data)
  engagementTotal: number;
  dateRange: { earliest: string; latest: string } | null; // ISO timestamps, null if no items have publishedAt
}

export interface FrequencyStats {
  mentions: number;
  uniqueAuthors: number;
  uniqueSources: number;
  engagementTotal: number;
  growth: {
    label: "rising" | "stable" | "declining" | "insufficient-data";
    recentHalfCount: number;
    earlierHalfCount: number;
    ratio: number | null; // recentHalfCount / (earlierHalfCount || 1), null if insufficient-data
  };
}

export interface ClusterConfidence {
  band: "low" | "medium" | "high";
  score: number; // 0-1
  explanation: string; // human-readable, generated from the actual inputs
}

export interface ProblemCluster {
  id: string;
  category: ProblemCategory;
  normalizedStatement: string;
  evidence: ClusterEvidence;
  frequency: FrequencyStats;
  confidence: ClusterConfidence;
  createdAt: string; // ISO timestamp
  sourceSessionId: string; // which ResearchSession this was derived from
  /**
   * True when this cluster's frequency.growth.label === "rising". Added in
   * Loop 4 Phase 3 to replace the old behavior of creating a SECOND,
   * duplicate "trend" cluster (same evidence/frequency) for every rising
   * cluster, which wasted ranking slots in the Top-10 opportunity list with
   * two entries pointing at the same underlying evidence. Optional/absent
   * (not `false`) on non-rising clusters, so existing fixtures/consumers
   * that don't set it remain valid.
   */
  trending?: boolean;
  /**
   * Intra-category sub-concept breakdown (Loop 5, Part 2/6) — counts of the
   * category's OWN concept groups (src/problems/concept.ts) matched across
   * this cluster's items, e.g. "43 complaints, 12 feature requests..." style
   * explainability, but always WITHIN this one category (never across other
   * categories — the one-cluster-per-category invariant is preserved; see
   * engine.ts's module doc). Absent/empty when no item in the cluster
   * matched any concept group for its category.
   */
  conceptBreakdown?: Array<{ conceptId: string; canonicalStatement: string; rootCause: string; count: number }>;
  /**
   * Root cause of the DOMINANT concept (highest-count entry of
   * `conceptBreakdown`), drawn from concept.ts's fixed RootCause taxonomy.
   * Absent when no concept group matched any item (falls back to the
   * category-level `normalizedStatement` with no specific root cause
   * inferred, rather than guessing one).
   */
  rootCause?: string;
  /**
   * `evidence.evidenceCount` with near-duplicate (src/problems/near-
   * duplicate.ts, Part 4) items collapsed to one representative per group.
   * Exposed as a SEPARATE field rather than changing `evidence.evidenceCount`
   * itself, which keeps its existing "raw count" meaning for any consumer
   * that already depends on it.
   */
  duplicateAdjustedEvidenceCount?: number;
  /** Cluster-average of src/problems/evidence-quality.ts's per-item composite score (Part 3), 0-1. */
  evidenceQualityScore?: number;
  /**
   * Root-cause chain (Loop 6, Part B) — a deterministic, rule-based
   * decomposition of the cluster's `normalizedStatement` into a business-
   * level and technical-level cause, keyed off the DOMINANT concept's
   * `rootCause` (src/problems/concept.ts). See `CAUSE_CHAIN_MAPPING` in
   * concept.ts for the exact, documented one-row-per-root-cause mapping
   * table. Absent when no concept group matched any item (same condition as
   * `rootCause` being absent) — there is no root cause to chain from.
   */
  causeChain?: CauseChain;
  /**
   * Deterministic severity scoring (Loop 6, Part C) — see
   * src/problems/severity.ts's `computeSeverity` for the full, documented
   * derivation. Computed ONCE per cluster from data already produced earlier
   * in this same pipeline pass (frequency, per-item urgency/emotional-
   * intensity already on ClassifiedItem, category, rootCause) — no new scan
   * over raw items.
   */
  severity?: ClusterSeverity;
  /**
   * Count of this category's near-duplicate GROUPS (src/problems/near-
   * duplicate.ts's `findNearDuplicates`) that span 2+ DISTINCT `sourceId`s —
   * a real cross-posting signal (the same complaint independently surfacing
   * on more than one platform), stronger than same-source reposts. Derived
   * as a cheap post-processing step over `findNearDuplicates`'s existing
   * output (Loop 6, Part E) — no second O(n²) pass.
   */
  crossSourceDuplicateCount?: number;
  /**
   * Count of near-duplicate groups (Part 4, prior loop) that are ALSO
   * "semantic duplicates": every item in the group maps to the SAME
   * concept.ts concept id, not just similar body text (Loop 6, Part E). A
   * doubly-confirmed signal — same wording AND same underlying concept.
   */
  semanticDuplicateGroupCount?: number;
  /** The concept id(s) (concept.ts) that had at least one semantic-duplicate group, for explainability. Empty/absent when `semanticDuplicateGroupCount` is 0. */
  semanticDuplicateConceptIds?: string[];
  /**
   * Explainability (Loop 6, Part F): states WHY this cluster's
   * `normalizedStatement`/`rootCause` were chosen — cites the dominant
   * concept id and how many of the category's items matched its trigger
   * phrases, or explicitly states that no concept-level sub-pattern matched
   * and the category-level fallback statement was used. Kept as a SEPARATE
   * field from `ClusterConfidence.explanation` (which explains the
   * confidence SCORE, not the grouping) so `opportunities/decision.ts`'s
   * existing `{band,score,explanation}` read of `ClusterConfidence` is
   * unchanged.
   */
  groupingReason?: string;
}

/**
 * Root-cause chain shape (src/problems/concept.ts's `deriveCauseChain` +
 * `CAUSE_CHAIN_MAPPING`, Loop 6 Part B). Named/exported here (rather than
 * inlined on `ProblemCluster`) so concept.ts can import and return this
 * exact shape without re-declaring it.
 */
export interface CauseChain {
  /** The cluster's own `normalizedStatement` — what was actually observed/reported. */
  observedProblem: string;
  /** The dominant concept's `rootCause` (concept.ts), verbatim. */
  underlyingCause: string;
  /** Fixed, rootCause-keyed business-level "why this matters to the business" statement. */
  businessCause: string;
  /** Fixed, rootCause-keyed technical-level "what's likely broken/missing under the hood" statement. */
  technicalCause: string;
}

/**
 * Deterministic severity composite (src/problems/severity.ts, Loop 6 Part
 * C). Every numeric sub-score is 0-100 for a consistent, explainable scale;
 * `severity` itself is a fixed, documented weighted composite of
 * frequency/urgency/businessImpact/emotionalFriction (weights sum to 1.0,
 * asserted in tests/problems/severity.test.ts) — see severity.ts's
 * `SEVERITY_WEIGHTS`.
 */
export interface ClusterSeverity {
  /** 0-100 weighted composite — see severity.ts's `SEVERITY_WEIGHTS`. */
  severity: number;
  /** 0-100, derived from `cluster.frequency.mentions`/growth (already computed). */
  frequency: number;
  /** 0-100, the fraction of this category's ClassifiedItems with `urgency === true` (already computed by detector.ts), scaled to 0-100. */
  urgency: number;
  /** 0-100, derived from category + rootCause (see severity.ts's fixed lookup tables). */
  businessImpact: number;
  /** Derived from rootCause — see severity.ts's `TIME_COST_BY_ROOT_CAUSE`. */
  timeCost: "low" | "medium" | "high";
  /** Derived from rootCause — see severity.ts's `MONEY_COST_BY_ROOT_CAUSE`. */
  moneyCost: "low" | "medium" | "high";
  /** 0-100, the average `emotionalIntensityScore` (0-1, already computed by detector.ts) across this category's ClassifiedItems, scaled to 0-100. */
  emotionalFriction: number;
  /** 0-100 — see severity.ts's documented developer/customer friction split rule (per-category weight table). */
  developerFriction: number;
  /** 0-100 — see severity.ts's documented developer/customer friction split rule (per-category weight table). */
  customerFriction: number;
  /** Human-readable, generated from the actual inputs — every number cited is real, never fabricated. */
  reasons: string[];
}

export interface ProblemIntelligenceReport {
  id: string;
  sourceSessionId: string;
  windowDays: number;
  clusters: ProblemCluster[];
  totalItemsAnalyzed: number;
  totalItemsClassified: number; // items that matched at least one non-"other" category
  generatedAt: string;
  artifactId?: string;
  /**
   * Count of raw items filtered out as structural noise (tutorials, docs,
   * announcements, marketing, newsletters, event promos — see
   * src/problems/noise-filter.ts) BEFORE category grouping. Never silently
   * dropped without a visible count, per this codebase's explainability
   * ethos. Optional/additive (always populated by
   * `ProblemIntelligenceEngine.analyze`, defaulting to `0`) so hand-built
   * `ProblemIntelligenceReport` fixtures elsewhere in the codebase (e.g.
   * tests/opportunities/calibration.test.ts) that predate this field keep
   * compiling unchanged — mirrors `ResearchSession.sourcesPartial`'s own
   * doc comment for the identical reason.
   */
  totalItemsRejectedAsNoise?: number;
  /**
   * Category clusters that were BUILT (evidence/frequency/confidence all
   * computed) but then rejected by the Part 7 quality gates in engine.ts
   * before being added to `clusters` — e.g. a low-confidence cluster with
   * too little raw evidence, or a cluster whose evidence is mostly near-
   * duplicate content. "Reject silently" is forbidden by this codebase's
   * whole ethos: every rejection is visible here with a stated, real reason,
   * just excluded from the founder-facing `clusters` list. Optional/additive
   * for the same backward-compatibility reason as `totalItemsRejectedAsNoise`
   * above (always populated by `ProblemIntelligenceEngine.analyze`,
   * defaulting to `[]`).
   */
  rejectedClusters?: Array<{ category: ProblemCategory; reason: string }>;
}

/** Referenced for downstream typing convenience — re-exported for callers. */
export type { RawResearchItem, ResearchSession };
