import type { BlueprintContext, CostBreakdown, DevelopmentCost, InfrastructureCost, APICost, AICost } from "./types.js";
import type { ContentCategory } from "../types.js";

// ---------------------------------------------------------------------------
// Cost Engine
// Estimates development, infrastructure, API, and AI costs.
// ---------------------------------------------------------------------------

const MONTHLY_ENGINEER_COST = 12000;  // blended: salary + benefits + tooling

const CATEGORY_INFRA: Partial<Record<ContentCategory, { hosting: number; db: number; notes: string }>> = {
  "ai": { hosting: 400, db: 150, notes: "GPU inference via API — no owned hardware" },
  "automation": { hosting: 200, db: 80, notes: "Event-driven — compute bursty, scale with Celery/queues" },
  "developer-tools": { hosting: 150, db: 60, notes: "Primarily compute for code analysis jobs" },
  "saas": { hosting: 200, db: 100, notes: "Standard web + background worker architecture" },
  "finance": { hosting: 300, db: 200, notes: "High availability required, multi-region recommended" },
  "healthcare-tech": { hosting: 500, db: 300, notes: "HIPAA-compliant hosting (AWS GovCloud / Azure Government)" },
  "enterprise": { hosting: 400, db: 200, notes: "On-prem option may be required — increases ops cost" },
  "cybersecurity": { hosting: 350, db: 150, notes: "Air-gapped or isolated environments may be needed" },
};

const CATEGORY_AI_COST: Partial<Record<ContentCategory, number>> = {
  "ai": 600, "automation": 400, "developer-tools": 500, "saas": 200,
  "productivity": 300, "marketing": 350, "sales": 300, "hr": 200, "finance": 250,
  "legal-tech": 400, "healthcare-tech": 300, "operations": 200,
};

const CATEGORY_API_COST: Partial<Record<ContentCategory, Array<{ name: string; estimatedMonthlyCost: number }>>> = {
  "automation": [{ name: "Zapier / Make API usage (testing)", estimatedMonthlyCost: 50 }, { name: "Third-party connector APIs", estimatedMonthlyCost: 100 }],
  "finance": [{ name: "Stripe / payment processing", estimatedMonthlyCost: 80 }, { name: "Plaid / open banking", estimatedMonthlyCost: 150 }],
  "sales": [{ name: "Salesforce API", estimatedMonthlyCost: 100 }, { name: "Email enrichment (Apollo/Hunter)", estimatedMonthlyCost: 80 }],
  "marketing": [{ name: "Ad platform APIs (Meta/Google)", estimatedMonthlyCost: 50 }, { name: "Email service provider", estimatedMonthlyCost: 80 }],
  "hr": [{ name: "ATS integrations (Greenhouse/Lever)", estimatedMonthlyCost: 75 }, { name: "HRIS connectors", estimatedMonthlyCost: 100 }],
};

export function estimateCosts(ctx: BlueprintContext): CostBreakdown {
  const { intelligence: intel } = ctx;
  const feasibility = intel.technicalFeasibilityScore;

  const teamSize = feasibility.estimatedTeamSize;
  const monthsToMVP = parseMonths(feasibility.estimatedTimeToMVP);

  // Development cost
  const devCost = teamSize * monthsToMVP * MONTHLY_ENGINEER_COST;
  const designCost = Math.round(devCost * 0.12);
  const toolingCost = Math.round(devCost * 0.05);

  const development: DevelopmentCost = {
    teamSize,
    avgMonthlySalaryPerEngineer: MONTHLY_ENGINEER_COST,
    monthsToMVP,
    totalDevelopmentCost: devCost,
    designCost,
    toolingCost,
  };

  // Infrastructure
  const infraTemplate = CATEGORY_INFRA[intel.category] ?? { hosting: 200, db: 100, notes: "Standard cloud hosting" };
  const infrastructure: InfrastructureCost = {
    monthlyHosting: infraTemplate.hosting,
    monthlyDatabase: infraTemplate.db,
    monthlyMonitoring: 80,
    monthlyBackups: 30,
    totalMonthlyInfra: infraTemplate.hosting + infraTemplate.db + 110,
    notes: infraTemplate.notes,
  };

  // API costs
  const apiServices = CATEGORY_API_COST[intel.category] ?? [
    { name: "Third-party API integrations", estimatedMonthlyCost: 100 },
    { name: "Email / notification service", estimatedMonthlyCost: 50 },
  ];
  const api: APICost = {
    services: apiServices,
    totalMonthlyAPICost: apiServices.reduce((s, a) => s + a.estimatedMonthlyCost, 0),
  };

  // AI costs
  const baseAICost = CATEGORY_AI_COST[intel.category] ?? 200;
  const aiCostMultiplier = Math.max(1, intel.aiReadinessScore.score * 2);
  const monthlyAI = Math.round(baseAICost * aiCostMultiplier);
  const ai: AICost = {
    models: [
      { name: "Claude (primary LLM)", estimatedMonthlyCost: Math.round(monthlyAI * 0.7), usage: "Core AI features" },
      { name: "Embedding model", estimatedMonthlyCost: Math.round(monthlyAI * 0.3), usage: "Search + retrieval" },
    ],
    totalMonthlyAICost: monthlyAI,
  };

  const monthlyOperationsCost = Math.round((infrastructure.totalMonthlyInfra + api.totalMonthlyAPICost + ai.totalMonthlyAICost) * 0.15);
  const totalMonthlyBurn = infrastructure.totalMonthlyInfra + api.totalMonthlyAPICost + ai.totalMonthlyAICost + monthlyOperationsCost;
  const totalPreLaunchCost = devCost + designCost + toolingCost;

  return { development, infrastructure, api, ai, monthlyOperationsCost, totalMonthlyBurn, totalPreLaunchCost };
}

function parseMonths(timeToMVP: string): number {
  // e.g. "2-4 months" → 3
  const match = timeToMVP.match(/(\d+)-(\d+)/);
  if (match) return Math.round((parseInt(match[1]!) + parseInt(match[2]!)) / 2);
  const single = timeToMVP.match(/(\d+)/);
  return single ? parseInt(single[1]!) : 4;
}
