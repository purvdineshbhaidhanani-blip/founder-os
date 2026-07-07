import type { ConfidenceLevel } from "@platform/shared";
import type { Rankable } from "@platform/shared";

export type RecommendationSourceType = "rule" | "ai";

export interface RecommendationFactor {
  label: string;
  detail: string;
  /** 0-1 contribution of this factor toward the recommendation's confidence. */
  weight: number;
}

/** Arbitrary context bag a source reads from — product state, metrics, config, whatever it needs. Never product-specific by contract. */
export type RecommendationContext = Record<string, unknown>;

export interface RecommendationDraft {
  title: string;
  description: string;
  factors: RecommendationFactor[];
}

export interface Recommendation extends Rankable {
  id: string;
  title: string;
  description: string;
  sourceType: RecommendationSourceType;
  sourceId: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  factors: RecommendationFactor[];
  explanation: string;
}

/** A pluggable producer of recommendations — rule-based, AI-powered, or anything else implementing this. */
export interface RecommendationSource {
  id: string;
  type: RecommendationSourceType;
  generate(context: RecommendationContext): Promise<RecommendationDraft[]> | RecommendationDraft[];
}
