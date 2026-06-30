import type { BlueprintContext, ProductVision, Feature } from "./types.js";
import type { ContentCategory } from "../types.js";

// ---------------------------------------------------------------------------
// Product Designer
// Generates product vision, UVP, and prioritised feature list.
// ---------------------------------------------------------------------------

interface ProductTemplate {
  visionPrefix: string;
  taglineTemplate: string;
  uvpTemplate: string;
  coreFeatures: Array<Omit<Feature, "userValue">>;
}

const CATEGORY_PRODUCT: Partial<Record<ContentCategory, ProductTemplate>> = {
  "automation": {
    visionPrefix: "The workflow automation platform",
    taglineTemplate: "Automate the work your team hates",
    uvpTemplate: "Replace manual workflows with AI-driven automation — no code required",
    coreFeatures: [
      { name: "Visual Workflow Builder", description: "Drag-and-drop automation builder with conditional logic", priority: "P0", effort: "M" },
      { name: "Integration Hub", description: "Connect 50+ popular tools via pre-built connectors", priority: "P0", effort: "L" },
      { name: "AI Step Generator", description: "Describe a workflow in plain English, AI generates the steps", priority: "P0", effort: "M" },
      { name: "Error Handling & Retry", description: "Automatic retry with Slack/email alerts on failure", priority: "P1", effort: "S" },
      { name: "Execution Logs", description: "Full audit trail per workflow run with filtering", priority: "P1", effort: "S" },
      { name: "Team Workspaces", description: "Shared workflows, permission controls, version history", priority: "P1", effort: "M" },
      { name: "Marketplace Templates", description: "One-click install popular workflow templates", priority: "P2", effort: "L" },
    ],
  },
  "developer-tools": {
    visionPrefix: "The developer productivity platform",
    taglineTemplate: "Ship faster, break less",
    uvpTemplate: "AI-powered tooling that eliminates repetitive engineering tasks and reduces PR review time by 50%",
    coreFeatures: [
      { name: "AI Code Analysis", description: "Automated code review, bug detection, and suggestion", priority: "P0", effort: "L" },
      { name: "CLI Integration", description: "One-command setup with major IDEs and CI pipelines", priority: "P0", effort: "S" },
      { name: "PR Assistant", description: "Auto-generate PR descriptions, detect risky changes", priority: "P0", effort: "M" },
      { name: "Codebase Search", description: "Semantic search across entire repo history", priority: "P1", effort: "M" },
      { name: "Metrics Dashboard", description: "DORA metrics, deployment frequency, change failure rate", priority: "P1", effort: "M" },
      { name: "Slack / Teams Integration", description: "Notify team of critical issues, daily summaries", priority: "P1", effort: "S" },
      { name: "Custom Rules Engine", description: "Define org-specific code standards as enforced rules", priority: "P2", effort: "L" },
    ],
  },
  "saas": {
    visionPrefix: "The operational backbone",
    taglineTemplate: "Run your SaaS like a machine",
    uvpTemplate: "Single platform to automate recurring SaaS operations — from billing to churn prediction to customer success",
    coreFeatures: [
      { name: "Automated Data Sync", description: "Real-time sync across CRM, billing, product analytics", priority: "P0", effort: "M" },
      { name: "AI Reporting", description: "Ask questions in plain English, get instant business reports", priority: "P0", effort: "M" },
      { name: "Churn Risk Alerts", description: "ML model flags customers at risk 30 days before churn", priority: "P1", effort: "L" },
      { name: "Workflow Automation", description: "Trigger actions based on customer lifecycle events", priority: "P1", effort: "M" },
      { name: "Team Dashboard", description: "Unified view for CS, Sales, Finance from one screen", priority: "P0", effort: "S" },
      { name: "CSV / API Export", description: "Export any dataset on demand", priority: "P1", effort: "S" },
      { name: "Role-based Permissions", description: "Granular access control per team", priority: "P2", effort: "S" },
    ],
  },
};

const FALLBACK_PRODUCT: ProductTemplate = {
  visionPrefix: "The AI-powered solution",
  taglineTemplate: "Work smarter, not harder",
  uvpTemplate: "AI automation that eliminates manual processes and returns hours to your team every week",
  coreFeatures: [
    { name: "Core Problem Solver", description: "Primary feature directly addressing the identified pain", priority: "P0", effort: "L" },
    { name: "Dashboard & Reporting", description: "Real-time visibility into key metrics and outcomes", priority: "P0", effort: "M" },
    { name: "Integration Layer", description: "Connect to existing tools in the user's stack", priority: "P0", effort: "M" },
    { name: "AI Assistant", description: "Natural language interface for common tasks", priority: "P1", effort: "M" },
    { name: "Notifications & Alerts", description: "Proactive alerts via email/Slack on key events", priority: "P1", effort: "S" },
    { name: "Team Collaboration", description: "Multi-user workspaces with permissions", priority: "P1", effort: "M" },
    { name: "API Access", description: "REST API for custom integrations and automation", priority: "P2", effort: "L" },
  ],
};

export function designProduct(ctx: BlueprintContext): ProductVision {
  const { intelligence: intel } = ctx;
  const template = CATEGORY_PRODUCT[intel.category] ?? FALLBACK_PRODUCT;

  const problem = intel.problem;
  const marketTier = intel.marketSizeEstimate.tier;
  const aiScore = intel.aiReadinessScore.score;

  const features: Feature[] = template.coreFeatures.map((f) => ({
    ...f,
    userValue: buildUserValue(f.priority, intel.humanTimeSavedScore.estimatedHoursPerWeekPerUser),
  }));

  // Add AI feature if highly AI-ready but not already in template
  if (aiScore >= 0.75 && !features.some((f) => f.name.toLowerCase().includes("ai"))) {
    features.push({
      name: "AI Automation Layer",
      description: "AI processes repetitive tasks automatically — zero manual input required",
      priority: "P0",
      effort: "M",
      userValue: `Saves ${intel.humanTimeSavedScore.estimatedHoursPerWeekPerUser}h/week per user`,
    });
  }

  const uvp = `${template.uvpTemplate} — built for ${marketTier} market with ${Math.round(intel.overallConfidence * 100)}% signal confidence`;
  const vision = `${template.visionPrefix} that eliminates: ${problem}`;

  return {
    vision,
    uvp,
    tagline: template.taglineTemplate,
    coreFeatures: features,
  };
}

function buildUserValue(priority: string, hoursSaved: number): string {
  if (priority === "P0") return `Core value — directly saves ${hoursSaved}h/week`;
  if (priority === "P1") return "Multiplies adoption and retention";
  return "Differentiator for enterprise tier";
}
