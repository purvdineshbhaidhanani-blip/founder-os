export type { AITextGenerationOptions, AITextGenerator } from "@platform/shared";

export interface RecommendationLike {
  title: string;
  description: string;
  factors: Array<{ label: string; detail: string; weight: number }>;
}

export interface InsightLike {
  title: string;
  description: string;
  severity: string;
  category?: string;
}
