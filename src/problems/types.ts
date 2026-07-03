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
