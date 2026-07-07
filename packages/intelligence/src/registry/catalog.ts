import type { IntelligenceModuleDescriptor } from "./types.js";

/** The eight built-in intelligence modules this loop ships, as data — the registry is what makes them queryable/toggleable/versioned. */
export const BUILTIN_INTELLIGENCE_MODULES: IntelligenceModuleDescriptor[] = [
  {
    id: "recommendation",
    name: "Recommendation Engine",
    description: "Rule-based and AI-powered recommendations with confidence scoring, explanations, and priority ranking.",
    version: "1.0.0",
    category: "recommendation",
    sourcePath: "packages/intelligence/src/recommendation",
  },
  {
    id: "insights",
    name: "Insights Engine",
    description: "Usage, growth, adoption, retention, and error insight collection over generic time-series data.",
    version: "1.0.0",
    category: "insights",
    sourcePath: "packages/intelligence/src/insights",
  },
  {
    id: "decision",
    name: "Decision Engine",
    description: "Multi-factor weighted scoring, rule evaluation, thresholds, confidence levels, and decision history.",
    version: "1.0.0",
    category: "decision",
    sourcePath: "packages/intelligence/src/decision",
  },
  {
    id: "feature-intelligence",
    name: "Feature Intelligence",
    description: "Feature adoption, usage, success scoring, and retirement-candidate detection.",
    version: "1.0.0",
    category: "feature-intelligence",
    sourcePath: "packages/intelligence/src/feature-intelligence",
  },
  {
    id: "product-intelligence",
    name: "Product Intelligence",
    description: "Product health, module health, configuration validation, and dependency health.",
    version: "1.0.0",
    category: "product-intelligence",
    sourcePath: "packages/intelligence/src/product-intelligence",
  },
  {
    id: "ai-layer",
    name: "AI Recommendation Layer",
    description: "Provider-independent AI text generation interface for explaining recommendations, summarizing insights, and generating action items.",
    version: "1.0.0",
    category: "ai-layer",
    sourcePath: "packages/intelligence/src/ai-layer",
  },
  {
    id: "diagnostics",
    name: "Health & Diagnostics",
    description: "Missing configuration, broken dependencies, invalid modules, and performance warning checks.",
    version: "1.0.0",
    category: "diagnostics",
    sourcePath: "packages/intelligence/src/diagnostics",
  },
  {
    id: "optimization",
    name: "Optimization Engine",
    description: "Module selection, performance, cost, and simplification suggestions, ranked by impact and confidence.",
    version: "1.0.0",
    category: "optimization",
    sourcePath: "packages/intelligence/src/optimization",
  },
];
