export type { AITextGenerationOptions, AITextGenerator } from "../shared/ai-text-generator.js";

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
