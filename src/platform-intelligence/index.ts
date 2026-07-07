/**
 * Universal Platform Intelligence — the reusable decision-support layer on
 * top of the Loop 2 engines and Loop 3 factory. Every module here is
 * provider-independent and product-agnostic: recommendations, insights,
 * decisions, feature/product health, and optimization all operate on
 * generic context objects and structural interfaces, never on a specific
 * product's business logic.
 */
export * as recommendation from "./recommendation/index.js";
export * as insights from "./insights/index.js";
export * as decision from "./decision/index.js";
export * as registry from "./registry/index.js";
export * as featureIntelligence from "./feature-intelligence/index.js";
export * as productIntelligence from "./product-intelligence/index.js";
export * as aiLayer from "./ai-layer/index.js";
export * as diagnostics from "./diagnostics/index.js";
export * as optimization from "./optimization/index.js";
export * as api from "./api/index.js";
export * as shared from "./shared/index.js";
