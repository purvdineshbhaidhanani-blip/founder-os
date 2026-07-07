export const INTELLIGENCE_MODULE_CATEGORIES = [
  "recommendation",
  "insights",
  "decision",
  "feature-intelligence",
  "product-intelligence",
  "ai-layer",
  "diagnostics",
  "optimization",
] as const;
export type IntelligenceModuleCategory = (typeof INTELLIGENCE_MODULE_CATEGORIES)[number];

export interface IntelligenceModuleDescriptor {
  id: string;
  name: string;
  description: string;
  /** Semver, e.g. "1.0.0". */
  version: string;
  category: IntelligenceModuleCategory;
  dependsOn?: string[];
  sourcePath?: string;
  discovered?: boolean;
}
