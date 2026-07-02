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
}

/** Referenced for downstream typing convenience — re-exported for callers. */
export type { RawResearchItem, ResearchSession };
