import type { Timestamp } from "../../types/common.js";
import type { ContentCategory } from "../types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { CourtDecision } from "../decision/types.js";

// ---------------------------------------------------------------------------
// Blueprint context — passed to every engine
// ---------------------------------------------------------------------------

export interface BlueprintContext {
  intelligence: OpportunityIntelligence;
  decision: CourtDecision;
}

// ---------------------------------------------------------------------------
// Customer Profile
// ---------------------------------------------------------------------------

export interface CustomerPersona {
  name: string;              // e.g. "The Overloaded Ops Manager"
  jobTitles: string[];
  companySize: string;       // e.g. "50–500 employees"
  industryVerticals: string[];
  dailyPains: string[];
  currentSolution: string;
  willingnessToPay: string;  // e.g. "$200–500/mo"
  adoptionBarriers: string[];
}

// ---------------------------------------------------------------------------
// Competitor Analysis
// ---------------------------------------------------------------------------

export interface Competitor {
  name: string;
  type: "direct" | "indirect" | "diy";
  strength: string;
  weakness: string;
  estimatedPricing: string;
}

export interface CompetitorAnalysis {
  competitors: Competitor[];
  competitiveGaps: string[];
  ourAdvantage: string;
  switchingTrigger: string;   // why users leave competitors
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export type FeaturePriority = "P0" | "P1" | "P2";
export type FeatureEffort = "S" | "M" | "L" | "XL";

export interface Feature {
  name: string;
  description: string;
  priority: FeaturePriority;
  effort: FeatureEffort;
  userValue: string;
}

export interface ProductVision {
  vision: string;
  uvp: string;              // unique value proposition
  tagline: string;
  coreFeatures: Feature[];
}

// ---------------------------------------------------------------------------
// MVP
// ---------------------------------------------------------------------------

export interface MVPPlan {
  name: string;
  scope: string[];           // what's in MVP
  outOfScope: string[];      // explicitly deferred
  successMetrics: string[];
  estimatedTimeline: string;
  targetEarlyAdopters: string;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export type PricingModel = "per-seat" | "usage-based" | "flat-fee" | "freemium+paid" | "enterprise-only";

export interface PricingTier {
  name: string;
  monthlyPrice: number;
  description: string;
  targetSegment: string;
}

export interface PricingRecommendation {
  model: PricingModel;
  tiers: PricingTier[];
  freeTrialDays: number;
  annualDiscount: number;    // e.g. 0.20 = 20% off annual
  rationale: string;
}

// ---------------------------------------------------------------------------
// Revenue Scenarios
// ---------------------------------------------------------------------------

export interface RevenueScenario {
  name: "conservative" | "base" | "optimistic";
  monthlyCustomersYear1: number[];   // 12 values
  avgRevenuePerCustomer: number;     // MRR per customer
  year1ARR: number;
  year2ARR: number;
  year3ARR: number;
  assumptions: string[];
}

// ---------------------------------------------------------------------------
// Cost Analysis
// ---------------------------------------------------------------------------

export interface DevelopmentCost {
  teamSize: number;
  avgMonthlySalaryPerEngineer: number;
  monthsToMVP: number;
  totalDevelopmentCost: number;
  designCost: number;
  toolingCost: number;
}

export interface InfrastructureCost {
  monthlyHosting: number;
  monthlyDatabase: number;
  monthlyMonitoring: number;
  monthlyBackups: number;
  totalMonthlyInfra: number;
  notes: string;
}

export interface APICost {
  services: Array<{ name: string; estimatedMonthlyCost: number }>;
  totalMonthlyAPICost: number;
}

export interface AICost {
  models: Array<{ name: string; estimatedMonthlyCost: number; usage: string }>;
  totalMonthlyAICost: number;
}

export interface CostBreakdown {
  development: DevelopmentCost;
  infrastructure: InfrastructureCost;
  api: APICost;
  ai: AICost;
  monthlyOperationsCost: number;    // support + misc
  totalMonthlyBurn: number;         // infra + api + ai + ops (post-launch)
  totalPreLaunchCost: number;       // development + tooling + design
}

// ---------------------------------------------------------------------------
// Tech Stack
// ---------------------------------------------------------------------------

export interface TechStack {
  frontend: string[];
  backend: string[];
  database: string[];
  infrastructure: string[];
  ai: string[];
  thirdParty: string[];
  rationale: string;
}

export interface ArchitectureSummary {
  pattern: string;           // e.g. "API-first SaaS, event-driven"
  keyComponents: string[];
  dataFlow: string;
  scalingApproach: string;
}

// ---------------------------------------------------------------------------
// API Plan
// ---------------------------------------------------------------------------

export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
}

export interface APIPlan {
  style: "REST" | "GraphQL" | "gRPC" | "REST+Webhooks";
  coreEndpoints: APIEndpoint[];
  webhooks: string[];
  authentication: string;
  rationale: string;
}

// ---------------------------------------------------------------------------
// AI Plan
// ---------------------------------------------------------------------------

export interface AIComponent {
  name: string;
  purpose: string;
  model: string;
  estimatedTokensPerDay: number;
}

export interface AIPlan {
  components: AIComponent[];
  primaryModel: string;
  fallbackModel: string;
  dataStrategy: string;
  privacyApproach: string;
}

// ---------------------------------------------------------------------------
// Risk Analysis
// ---------------------------------------------------------------------------

export type RiskSeverity = "low" | "medium" | "high";

export interface Risk {
  description: string;
  severity: RiskSeverity;
  probability: "low" | "medium" | "high";
  mitigation: string;
}

export interface RiskAnalysis {
  businessRisks: Risk[];
  technicalRisks: Risk[];
  legalRisks: Risk[];
  topRisk: string;
}

// ---------------------------------------------------------------------------
// Financial Analysis
// ---------------------------------------------------------------------------

export interface BudgetAnalysis {
  totalPreLaunchBudget: number;
  monthlyBurnPostLaunch: number;
  recommendedRunwayMonths: number;
  totalFundingNeeded: number;
  breakdown: string[];
}

export interface BreakevenAnalysis {
  monthsToBreakeven: number;
  customersNeeded: number;
  monthlyRevenueAtBreakeven: number;
  assumptions: string[];
}

export interface ROIAnalysis {
  totalInvestment: number;
  year1ARR: number;
  year2ARR: number;
  year3ARR: number;
  projectedROIPercent: number;     // (year3ARR - totalInvestment) / totalInvestment * 100
  paybackPeriodMonths: number;
}

// ---------------------------------------------------------------------------
// Founder Recommendation
// ---------------------------------------------------------------------------

export type BlueprintVerdict = "BUILD_NOW" | "BUILD_LATER" | "MONITOR" | "RESEARCH_MORE" | "REJECT";

export interface FounderRecommendation {
  verdict: BlueprintVerdict;
  summary: string;
  topReasonsFor: string[];
  topReasonsAgainst: string[];
  immediateActions: string[];
  keyRisks: string[];
  confidence: number;
  founderFitNotes: string;
}

// ---------------------------------------------------------------------------
// Full Business Blueprint
// ---------------------------------------------------------------------------

export interface BusinessBlueprint {
  opportunityId: string;
  problemSummary: string;
  evidenceSummary: string[];
  category: ContentCategory;

  // Market
  customerProfile: CustomerPersona;
  marketSummary: string;
  competitorAnalysis: CompetitorAnalysis;

  // Product
  productVision: ProductVision;
  mvpPlan: MVPPlan;

  // Pricing + Revenue
  pricingRecommendation: PricingRecommendation;
  revenueScenarios: RevenueScenario[];

  // Costs
  costBreakdown: CostBreakdown;

  // Tech
  techStack: TechStack;
  architectureSummary: ArchitectureSummary;
  apiPlan: APIPlan;
  aiPlan: AIPlan;
  developmentTimeline: string;

  // Risk + Finance
  riskAnalysis: RiskAnalysis;
  budgetAnalysis: BudgetAnalysis;
  breakevenAnalysis: BreakevenAnalysis;
  roiAnalysis: ROIAnalysis;

  // Verdict
  assumptions: string[];
  confidence: number;
  founderRecommendation: FounderRecommendation;

  generatedAt: Timestamp;
}
