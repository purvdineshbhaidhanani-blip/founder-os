import type { ProductType } from "../product/types.js";
import type { ProjectTemplate } from "./types.js";

/**
 * The five required starting points. Each is just a `ProductDefinition`
 * preset — no product-specific code, purely configuration — so creating a
 * new product from a template is choosing sensible defaults, not copying a
 * codebase.
 */
export const PROJECT_TEMPLATES: Record<ProductType, ProjectTemplate> = {
  saas: {
    id: "saas",
    name: "SaaS Product",
    description: "Multi-tenant subscription product with teams, notifications, and analytics.",
    defaults: {
      type: "saas",
      modules: ["notification", "analytics", "logging-monitoring", "search"],
      authMode: "multi-user",
      billingMode: "subscription",
      aiEnabled: false,
      teamsEnabled: true,
      featureFlagsEnabled: true,
      storageEnabled: true,
    },
  },
  "internal-tool": {
    id: "internal-tool",
    name: "Internal Tool",
    description: "Single-org internal utility with minimal auth and no billing.",
    defaults: {
      type: "internal-tool",
      modules: ["logging-monitoring"],
      authMode: "single-user",
      billingMode: "none",
      aiEnabled: false,
      teamsEnabled: false,
      featureFlagsEnabled: false,
      storageEnabled: false,
    },
  },
  "api-service": {
    id: "api-service",
    name: "API Service",
    description: "Headless, usage-billed API with connector-based integrations.",
    defaults: {
      type: "api-service",
      modules: ["integration", "logging-monitoring", "analytics"],
      authMode: "oauth",
      billingMode: "usage-based",
      aiEnabled: false,
      teamsEnabled: false,
      featureFlagsEnabled: true,
      storageEnabled: false,
    },
  },
  "ai-application": {
    id: "ai-application",
    name: "AI Application",
    description: "AI-native product with retrieval-augmented knowledge and usage-based billing.",
    defaults: {
      type: "ai-application",
      modules: ["ai", "knowledge", "logging-monitoring", "analytics"],
      authMode: "multi-user",
      billingMode: "usage-based",
      aiEnabled: true,
      teamsEnabled: false,
      featureFlagsEnabled: true,
      storageEnabled: true,
    },
  },
  "admin-portal": {
    id: "admin-portal",
    name: "Admin Portal",
    description: "Internal-facing administrative console with SSO and role-based access.",
    defaults: {
      type: "admin-portal",
      modules: ["teams-roles", "analytics", "logging-monitoring"],
      authMode: "sso",
      billingMode: "none",
      aiEnabled: false,
      teamsEnabled: true,
      featureFlagsEnabled: false,
      storageEnabled: false,
    },
  },
};

export function getProjectTemplate(type: ProductType): ProjectTemplate {
  return PROJECT_TEMPLATES[type];
}
