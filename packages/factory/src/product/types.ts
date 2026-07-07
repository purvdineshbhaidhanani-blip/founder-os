export const PRODUCT_TYPES = [
  "saas",
  "internal-tool",
  "api-service",
  "ai-application",
  "admin-portal",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const AUTH_MODES = ["none", "single-user", "multi-user", "oauth", "sso"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const BILLING_MODES = ["none", "subscription", "usage-based", "one-time"] as const;
export type BillingMode = (typeof BILLING_MODES)[number];

/**
 * The single source of truth for "what is this product." Every other part
 * of the factory (module registry, bootstrap, config engine, docs
 * generator) consumes a `ProductDefinition` — nothing else describes a
 * product's shape.
 */
export interface ProductDefinition {
  name: string;
  description?: string;
  type: ProductType;
  /** Ids of platform modules this product requires, resolved against the Module Registry. */
  modules: string[];
  authMode: AuthMode;
  billingMode: BillingMode;
  aiEnabled: boolean;
  teamsEnabled: boolean;
  featureFlagsEnabled: boolean;
  storageEnabled: boolean;
}
