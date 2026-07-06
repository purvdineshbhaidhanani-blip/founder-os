/**
 * Types mirroring the real Founder OS server response shapes.
 * Sourced directly from:
 *   - src/server/routes/auth.ts
 *   - src/server/routes/dashboard.ts
 *   - src/server/routes/connectors.ts
 *   - src/server/routes/research.ts
 *   - src/command-center/backend.ts (FounderDashboardView)
 *   - src/research/types.ts (ResearchSession, FounderReport, ResearchProgressEvent)
 * Do not add fields that do not exist in those files.
 */

export interface AuthUser {
  email: string;
  /** Which login method produced the current session ("founder" or "google"). Optional/additive — purely informational. */
  provider?: "founder" | "google";
}

export interface LoginResponse {
  user: AuthUser;
}

/** /api/auth/me always responds 200; `user` is null when there is no active session. */
export interface MeResponse {
  user: AuthUser | null;
}

export interface ApiErrorBody {
  error: string;
  missing?: string[];
}

/** src/connectors/types.ts ConnectorStatus */
export type ConnectorStatus = "configured" | "missing-credentials" | "error" | "disabled";

/** src/server/routes/connectors.ts ConnectorStatusView */
export interface ConnectorStatusView {
  id: string;
  name: string;
  status: ConnectorStatus | string;
  missingEnv: string[];
  required: boolean;
}

/** src/runtime/dashboard/types.ts RuntimeMetrics */
export interface RuntimeMetrics {
  totalEvents: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  workflowsByStatus: Record<string, number>;
  agentsByStatus: Record<string, number>;
  taskSuccessRate: number;
  meanTaskDurationMs: number;
}

/** src/runtime/dashboard/types.ts DashboardSnapshot (fields used by the UI are typed loosely as unknown[]) */
export interface DashboardSnapshot {
  takenAt: string;
  activeWorkflows: unknown[];
  queued: unknown[];
  running: unknown[];
  completed: unknown[];
  failed: unknown[];
  deadLetter: unknown[];
  runningAgents: unknown[];
  metrics: RuntimeMetrics;
}

/** src/command-center/backend.ts Notification */
export interface Notification {
  id: string;
  level: "info" | "warn" | "alert";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

/** src/runtime/approval/types.ts ApprovalRequest */
export interface ApprovalRequest {
  id: string;
  reason: string;
  payload: unknown;
  workflowStateId?: string;
  taskId?: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt?: string;
  status: "pending" | "approved" | "rejected" | "expired" | string;
  decidedAt?: string;
  decidedBy?: string;
  note?: string;
}

/** src/learning/engine.ts ImprovementProposal */
export interface ImprovementProposal {
  id: string;
  target: string;
  subject: string;
  recommendation: string;
  rationale: string;
  evidenceCount: number;
  confidence: "low" | "medium" | "high";
  createdAt: string;
  status: "pending" | "applied" | "rejected";
}

/** src/cost/optimizer.ts OptimizationRecommendation */
export interface OptimizationRecommendation {
  kind: "downgrade-model" | "enable-cache" | "shrink-context" | "parallelize" | "agent-investigation";
  target: string;
  rationale: string;
  estimatedSavingsCents?: number;
}

export interface CostSummary {
  totalCents: number;
  totalTokens: number;
}

/** src/org/rituals.ts CalendarEvent */
export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  participants: string[];
  kind: "meeting" | "milestone" | "deadline" | "release" | "block";
  payload?: unknown;
}

/** src/command-center/backend.ts FounderDashboardView */
export interface FounderDashboardView {
  takenAt: string;
  runtime: DashboardSnapshot;
  health: { ok: boolean; failing: string[] };
  notifications: Notification[];
  pendingApprovals: ApprovalRequest[];
  proposals: ImprovementProposal[];
  costRecommendations: OptimizationRecommendation[];
  costSummary: CostSummary;
  upcomingEvents: CalendarEvent[];
}

/** src/research/types.ts RawResearchItem */
export interface RawResearchItem {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  sourceId: string;
}

/** src/research/types.ts Opportunity */
export interface Opportunity {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  supportingItems: RawResearchItem[];
  sourceIds: string[];
}

/** src/intelligence/types.ts Insight<unknown> — kept loose, only rendered generically */
export interface Insight {
  id?: string;
  summary?: string;
  [key: string]: unknown;
}

/** src/research/types.ts SourceFailureReason */
export type SourceFailureReason =
  | "no-results"
  | "network-failure"
  | "authentication-failure"
  | "api-limit"
  | "parsing-failure"
  | "unknown-error";

/** src/research/types.ts FounderReport */
export interface FounderReport {
  topOpportunities: Opportunity[];
  evidence: Insight[];
  confidenceScore: {
    band: "low" | "medium" | "high";
    numericScore: number;
  };
  sourceCoverage: {
    used: string[];
    failed: string[];
    skipped: string[];
    ratio: number;
    failedReasons?: Array<{ id: string; reason: SourceFailureReason }>;
    partial?: Array<{ id: string; reason: SourceFailureReason; detail: string }>;
  };
  generatedAt: string;
}

/** src/research/types.ts ResearchSession */
export interface ResearchSession {
  id: string;
  windowDays: number;
  topic?: string;
  startedAt: string;
  completedAt?: string;
  sourcesUsed: string[];
  sourcesFailed: Array<{ id: string; error: string; reason: SourceFailureReason }>;
  sourcesSkipped: Array<{ id: string; reason: string }>;
  sourcesPartial: Array<{ id: string; reason: SourceFailureReason; detail: string }>;
  opportunities: Opportunity[];
  report: FounderReport;
  artifactId?: string;
}

/** src/research/types.ts ResearchProgressEvent (discriminated union) */
export type ResearchProgressEvent =
  | { type: "source.start"; sourceId: string }
  | {
      type: "source.done";
      sourceId: string;
      itemCount: number;
      partialFailure?: { reason: SourceFailureReason; detail: string };
    }
  | { type: "source.failed"; sourceId: string; error: string; reason?: SourceFailureReason }
  | { type: "progress"; percent: number; message: string }
  | { type: "complete"; session: ResearchSession }
  | { type: "error"; message: string; missing?: string[] };

/** POST /api/research/run 202 response */
export interface RunResearchAccepted {
  sessionId: string;
}

/** POST /api/research/run 422 response (MissingKeysError) */
export interface RunResearchMissingKeys {
  error: string;
  missing: string[];
}

/** GET /api/research/sessions list item — src/server/routes/research.ts */
export interface ResearchSessionSummary {
  sessionId: string;
  windowDays?: number;
  artifactId: string;
  createdAt: string;
}

/**
 * Opportunity pipeline types, mirroring:
 *   - src/server/routes/opportunities.ts (PipelineProgressEvent, route shapes)
 *   - src/opportunities/types.ts (FounderOpportunityReport, TopOpportunitiesReport)
 * Do not add fields that do not exist in those files.
 */

/** POST /api/pipeline/run 202 response */
export interface RunPipelineAccepted {
  pipelineId: string;
}

/** POST /api/pipeline/run 422 response (MissingKeysError) */
export interface RunPipelineMissingKeys {
  error: string;
  missing: string[];
}

export type PipelineStage = "research" | "problems" | "opportunities" | "complete";

/** src/server/routes/opportunities.ts PipelineProgressEvent (discriminated union) */
export type PipelineProgressEvent =
  | ({ stage: "research" } & ResearchProgressEvent)
  | { stage: "problems"; type: "progress"; percent: number; message: string }
  | { stage: "opportunities"; type: "progress"; percent: number; message: string }
  | { stage: "complete"; type: "complete"; topOpportunitiesReportId: string; pipelineId: string }
  | { stage: PipelineStage; type: "error"; message: string; missing?: string[] };

/** src/opportunities/types.ts BuyingIntentResult */
export interface BuyingIntentResult {
  score: number;
  matchingItemCount: number;
  totalItemCount: number;
  explanation: string;
}

/** src/opportunities/types.ts CompetitorMention */
export interface CompetitorMention {
  name: string;
  mentionCount: number;
  evidenceUrls: string[];
}

/** src/opportunities/types.ts CompetitionResult */
export interface CompetitionResult {
  competitors: CompetitorMention[];
  competitionScore: number;
  explanation: string;
}

export type BuildDifficultyTier = "low" | "medium" | "high";

/** src/opportunities/types.ts BuildDifficultyResult */
export interface BuildDifficultyResult {
  tier: BuildDifficultyTier;
  matchedSignals: string[];
  explanation: string;
}

/** src/opportunities/types.ts PricingSignal */
export interface PricingSignal {
  extractedPrices: number[];
  suggestedPriceText: string;
}

/** src/opportunities/types.ts OpportunityScoreBreakdown */
export interface OpportunityScoreBreakdown {
  painFrequency: number;
  sourceDiversity: number;
  authorDiversity: number;
  buyingIntent: number;
  engagement: number;
  growth: number;
  competition: number;
  confidence: number;
  weightedTotal: number;
  explanation: string;
}

export type FounderRecommendationVerdict = "BUILD" | "WAIT" | "IGNORE";

/** src/opportunities/types.ts FounderRecommendation */
export interface FounderRecommendation {
  verdict: FounderRecommendationVerdict;
  whyBuild: string[];
  whyNotBuild: string[];
  risk: string[];
  explanation: string;
}

/**
 * Loop 3 Founder Decision layer types, mirroring src/opportunities/types.ts.
 * Do not add fields that do not exist there.
 */

/** src/opportunities/types.ts IntentDistributionEntry */
export interface IntentDistributionEntry {
  intent: string;
  count: number;
  fraction: number;
}

export type DecisionFreshness = "fresh" | "aging" | "stale" | "unknown";

/** src/opportunities/types.ts DecisionEvidence */
export interface DecisionEvidence {
  evidenceCount: number;
  uniqueSources: number;
  uniqueAuthors: number;
  freshness: DecisionFreshness;
  crossSourceAgreement: number;
  echoChamber: boolean;
  explanation: string;
}

/** src/opportunities/types.ts DecisionReasoning */
export interface DecisionReasoning {
  whyThisMatters: string;
  whyNow: string;
  whoExperiences: string;
  whatEvidence: string;
  whyFoundersPay: string;
  biggestUncertainty: string;
  biggestImplementationRisk: string;
}

/** src/opportunities/types.ts DecisionConfidenceContributor */
export interface DecisionConfidenceContributor {
  name: string;
  points: number;
  reason: string;
}

/** src/opportunities/types.ts DecisionConfidence */
export interface DecisionConfidence {
  score: number;
  band: "high" | "medium" | "low";
  contributors: DecisionConfidenceContributor[];
  weaknesses: string[];
}

/** src/opportunities/types.ts DecisionQualityGate */
export interface DecisionQualityGate {
  name: string;
  fired: boolean;
  reason: string;
}

export type FounderDecisionVerdict = "BUILD" | "WATCH" | "IGNORE";

/** src/opportunities/types.ts DecisionRecommendation */
export interface DecisionRecommendation {
  verdict: FounderDecisionVerdict;
  justification: string;
  primaryRisk: string;
  primaryOpportunity: string;
}

/** src/opportunities/types.ts FounderDecision */
export interface FounderDecision {
  intentDistribution: IntentDistributionEntry[];
  evidence: DecisionEvidence;
  reasoning: DecisionReasoning;
  confidence: DecisionConfidence;
  recommendation: DecisionRecommendation;
  qualityGates: DecisionQualityGate[];
}

/** src/opportunities/types.ts FoisDimension */
export interface FoisDimension {
  name: string;
  raw: number;
  weight: number;
  weighted: number;
  reason: string;
  evidence: string[];
}

/** src/opportunities/types.ts FoisPenalty */
export interface FoisPenalty {
  reason: string;
  points: number;
}

/**
 * src/opportunities/types.ts FoisBreakdown — the Founder Opportunity
 * Intelligence Score. `fois.overall` is the report's real ranking key
 * (opportunities are sorted by it descending), replacing
 * scoreBreakdown.weightedTotal as the headline score.
 */
export interface FoisBreakdown {
  overall: number;
  dimensions: FoisDimension[];
  reasons: string[];
  weaknesses: string[];
  penalties: FoisPenalty[];
}

/* ---------------------------------------------------------------------- */
/* Founder Intelligence (src/opportunities/founder-intelligence.ts)       */
/* ---------------------------------------------------------------------- */

export type MarketMaturityLabel = "emerging" | "growing" | "crowded" | "saturated" | "declining";
export interface MarketMaturityResult {
  maturity: MarketMaturityLabel;
  reasons: string[];
}

export type OpenSourceVsSaas = "open-source" | "saas" | "mixed" | "unknown";
export type EnterpriseVsSmb = "enterprise" | "smb" | "mixed" | "unknown";
export type CompetitorConfidence = "high" | "medium" | "low" | "unknown";
export interface CompetitorIntelligence {
  primaryCompetitors: string[];
  competitorCategory: string;
  marketMaturity: MarketMaturityLabel;
  openSourceVsSaas: OpenSourceVsSaas;
  enterpriseVsSmb: EnterpriseVsSmb;
  soloFounderFriendlyCompetitors: string[];
  pricingEvidence: PricingSignal | null;
  competitorConfidence: CompetitorConfidence;
  competitorEvidence: string[];
  explanation: string;
}

export type MarketGapName =
  | "Missing Features"
  | "Expensive Pricing"
  | "Complex UX"
  | "Missing AI"
  | "Poor Automation"
  | "Poor Mobile Experience"
  | "Slow Support"
  | "Weak Integrations"
  | "Missing API"
  | "Poor Onboarding"
  | "Weak Documentation"
  | "Manual Workflow";
export interface MarketGap {
  gap: MarketGapName;
  evidenceCount: number;
  exampleConceptIds: string[];
  confidence: "high" | "medium" | "low";
}

export type CompetitionPressureLabel = "very-low" | "low" | "medium" | "high" | "very-high";
export interface CompetitionPressureResult {
  pressure: CompetitionPressureLabel;
  explanation: string;
}

export type FounderPricingModel = "subscription" | "one-time" | "usage" | "freemium" | "enterprise";
export type FounderMvpComplexity = "low" | "medium" | "high";
export type SoloFounderSuitability = "high" | "medium" | "low";
export interface FounderOpportunitySynthesis {
  shouldBuild: boolean;
  why: string[];
  whyNot: string[];
  bestCustomer: string;
  whyThisCustomer: string;
  bestPricingModel: FounderPricingModel;
  expectedBuildDifficulty: BuildDifficultyTier;
  expectedMvpComplexity: FounderMvpComplexity;
  soloFounderSuitability: SoloFounderSuitability;
}

export type DifferentiationStrategyName =
  | "AI-first"
  | "Automation-first"
  | "Vertical SaaS"
  | "Lower Pricing"
  | "Faster UX"
  | "Developer-first"
  | "No-code"
  | "Privacy-first"
  | "Offline-first";
export interface DifferentiationStrategy {
  strategy: DifferentiationStrategyName;
  evidenceReason: string;
}

export type FounderRiskName =
  | "Market Risk"
  | "Execution Risk"
  | "Technical Risk"
  | "Pricing Risk"
  | "Competition Risk"
  | "Customer Risk"
  | "Platform Risk"
  | "Regulation Risk";
export interface FounderIntelligenceRisk {
  risk: FounderRiskName;
  severity: "low" | "medium" | "high";
  explanation: string;
}

export interface FounderIntelligence {
  competitorIntelligence: CompetitorIntelligence;
  marketGaps: MarketGap[];
  marketMaturity: MarketMaturityResult;
  founderOpportunity: FounderOpportunitySynthesis;
  competitionPressure: CompetitionPressureResult;
  differentiationStrategies: DifferentiationStrategy[];
  risks: FounderIntelligenceRisk[];
}

/* ---------------------------------------------------------------------- */
/* AI Decision Validation (src/opportunities/ai-decision-validation.ts)   */
/* ---------------------------------------------------------------------- */

export interface AiDecisionReasoning {
  actualBusinessProblem: string;
  whyExists: string;
  whyCurrentSolutionsFailing: string;
  evidenceSupporting: string[];
  evidenceWeakening: string[];
  painTemporaryOrRecurring: "temporary" | "recurring" | "unknown";
}
export interface AiCounterEvidenceClaim {
  claim:
    | "problem is exaggerated"
    | "market already saturated"
    | "users solved it manually"
    | "competitors already dominate"
    | "demand may be temporary";
  fired: boolean;
  reason: string;
}
export interface AiValidationResult {
  validatedRecommendation: FounderDecisionVerdict;
  validationReason: string;
  confidenceAdjustment: number;
}
export type AiFounderRiskName =
  | "Market Risk"
  | "Competition Risk"
  | "Execution Risk"
  | "Technical Risk"
  | "Distribution Risk"
  | "Monetization Risk"
  | "Timing Risk"
  | "Platform Risk";
export interface AiFounderRisk {
  risk: AiFounderRiskName;
  score: number;
  reason: string;
  supportingEvidence: string[];
}
export interface AiFounderOpportunityProfile {
  idealCustomerProfile: string;
  whoShouldNotBeTargeted: string;
  earlyAdopterProfile: string;
  corePain: string;
  topMvpFeatures: string[];
  featuresToAvoid: string[];
  suggestedLaunchStrategy: string;
}
export type PricingConfidence = "high" | "medium" | "low" | "not-verified";
export type MonetizationSupportLabel = "supported" | "unsupported" | "not-verified";
export interface AiMonetizationReasoning {
  possiblePricing: string;
  pricingConfidence: PricingConfidence;
  pricingAssumptions: string[];
  subscriptionViability: MonetizationSupportLabel;
  enterprisePotential: MonetizationSupportLabel;
}
export interface AiConfidenceReview {
  originalScore: number;
  adjustedScore: number;
  adjustment: number;
  verdict: "justified" | "reduced";
  reason: string;
}
export interface AiDecisionExplainability {
  whyBuild: string;
  whyWait: string;
  whyIgnore: string;
  evidenceThatMattersMost: string;
  evidenceMissing: string;
  whatCouldChangeThis: string;
}
export interface FinalFounderRecommendation {
  executiveSummary: string;
  recommendedAction: FounderDecisionVerdict;
  evidenceSummary: string;
  businessOpportunity: string;
  risks: AiFounderRisk[];
  recommendedMvp: string[];
  suggestedPricingDirection: string;
  goToMarketDirection: string;
  unknowns: string[];
  nextValidationSteps: string[];
}
export interface AiSelfReviewCheck {
  check: string;
  consistent: boolean;
  detail: string;
}
export interface AiSelfReview {
  checks: AiSelfReviewCheck[];
  internallyConsistent: boolean;
}
export interface AiDecisionValidation {
  decisionReasoning: AiDecisionReasoning;
  counterEvidence: AiCounterEvidenceClaim[];
  validation: AiValidationResult;
  risks: AiFounderRisk[];
  founderOpportunity: AiFounderOpportunityProfile;
  monetization: AiMonetizationReasoning;
  reviewedConfidence: AiConfidenceReview;
  explainability: AiDecisionExplainability;
  finalRecommendation: FinalFounderRecommendation;
  selfReview: AiSelfReview;
}

/* ---------------------------------------------------------------------- */
/* Business Intelligence (src/opportunities/business-intelligence.ts)     */
/* ---------------------------------------------------------------------- */

export type RevenueModelLabel = "recurring" | "usage-based" | "one-time";
export type B2bVsB2c = "B2B" | "B2C" | "unknown";
export type CompanySizeBand = "smb" | "enterprise" | "mixed" | "unknown";
export type BudgetConfidence = "high" | "medium" | "low" | "not-verified";
export type UrgencyBand = "high" | "medium" | "low";
export type SwitchingDifficulty = "high" | "medium" | "low" | "unknown";
export interface BusinessIntelligenceResult {
  businessModel: string;
  businessModelReason: string;
  pricingModel: FounderPricingModel;
  revenueModel: RevenueModelLabel;
  revenueModelReason: string;
  b2bVsB2c: B2bVsB2c;
  b2bVsB2cReason: string;
  idealCustomerProfile: string;
  companySize: CompanySizeBand;
  companySizeReason: string;
  primaryBuyer: string;
  primaryBuyerReason: string;
  decisionMaker: string;
  decisionMakerReason: string;
  budgetEstimate: string;
  budgetConfidence: BudgetConfidence;
  budgetReason: string;
  urgency: UrgencyBand;
  urgencyReason: string;
  switchingDifficulty: SwitchingDifficulty;
  switchingDifficultyReason: string;
  expansionPotential: MonetizationSupportLabel;
  expansionPotentialReason: string;
}

/* ---------------------------------------------------------------------- */
/* Market Intelligence (src/opportunities/market-intelligence.ts)         */
/* ---------------------------------------------------------------------- */

export type GrowthStageLabel = "early" | "growing" | "plateauing" | "declining" | "insufficient-data";
export type ConfidenceBand = "high" | "medium" | "low";
export type SaturationLabel = "low" | "medium" | "high";
export type OpportunityWindowLabel = "opening" | "steady" | "narrow" | "closing" | "unclear";
export interface MarketIntelligenceResult {
  marketMaturity: MarketMaturityLabel;
  marketMaturityReasons: string[];
  growthStage: GrowthStageLabel;
  growthStageReason: string;
  geoConcentration: "UNKNOWN";
  geoConcentrationReason: string;
  industryConcentration: "UNKNOWN";
  industryConcentrationReason: string;
  searchConfidence: ConfidenceBand;
  searchConfidenceReason: string;
  adoptionConfidence: ConfidenceBand;
  adoptionConfidenceReason: string;
  saturation: SaturationLabel;
  saturationReason: string;
  competitionPressure: CompetitionPressureLabel;
  opportunityWindow: OpportunityWindowLabel;
  opportunityWindowReason: string;
}

/* ---------------------------------------------------------------------- */
/* Revenue Intelligence (src/opportunities/revenue-intelligence.ts)       */
/* ---------------------------------------------------------------------- */

export type RevenueBand = "high" | "medium" | "low" | "NOT VERIFIED";
export type ExpansionBand = "high" | "medium" | "low" | "not-verified";
export interface RevenueIntelligenceResult {
  revenuePotential: RevenueBand;
  revenuePotentialReason: string;
  pricingConfidence: PricingConfidence;
  possiblePricing: string;
  revenueModel: FounderPricingModel;
  revenueModelDescription: string;
  subscriptionViability: MonetizationSupportLabel;
  expansionPotential: MonetizationSupportLabel;
  upsellPotential: ExpansionBand;
  upsellPotentialReason: string;
  crossSellPotential: ExpansionBand;
  crossSellPotentialReason: string;
}

/* ---------------------------------------------------------------------- */
/* MVP Scope (src/opportunities/mvp-generator.ts)                         */
/* ---------------------------------------------------------------------- */

export interface MvpPhase {
  phase: string;
  features: string[];
  reason: string;
}
export interface MvpScopeResult {
  recommendedMvp: string;
  estimatedTimeToMvp: string;
  buildDifficulty: BuildDifficultyTier;
  buildDifficultyExplanation: string;
  coreFeatures: string[];
  featuresToAvoidAtLaunch: string[];
  featuresToAvoidReason: string;
  phasedRoadmap: MvpPhase[];
  launchReadinessCriteria: string[];
  scopeSummary: string;
}

/* ---------------------------------------------------------------------- */
/* Go-To-Market (src/opportunities/go-to-market.ts)                       */
/* ---------------------------------------------------------------------- */

export interface GtmChannel {
  channel: string;
  reason: string;
}
export interface GtmLaunchStep {
  step: number;
  action: string;
  reason: string;
}
export interface GoToMarketResult {
  launchStrategy: string;
  goToMarketDirection: string;
  bestCustomer: string;
  whyThisCustomer: string;
  earlyAdopterProfile: string;
  recommendedChannels: GtmChannel[];
  positioningStatement: string;
  positioningBasis: DifferentiationStrategyName[] | "NOT VERIFIED";
  launchSequence: GtmLaunchStep[];
}

/* ---------------------------------------------------------------------- */
/* Technical Blueprint (src/opportunities/technical-blueprint.ts)         */
/* ---------------------------------------------------------------------- */

export interface TechnicalBlueprintResult {
  buildDifficulty: BuildDifficultyTier;
  expectedMvpComplexity: FounderMvpComplexity;
  architectureAdvice: string;
  architectureAdviceReason: string;
  databaseAdvice: string;
  databaseAdviceReason: string;
  apiAdvice: string;
  apiAdviceReason: string;
  authAdvice: string;
  authAdviceReason: string;
  aiLayerAdvice: string;
  aiLayerAdviceReason: string;
  hostingAdvice: string;
  hostingAdviceReason: string;
  storageAdvice: string;
  storageAdviceReason: string;
  advisoryDisclaimer: string;
}

/* ---------------------------------------------------------------------- */
/* Knowledge Links (src/opportunities/knowledge-links.ts)                 */
/* ---------------------------------------------------------------------- */

export type KnowledgeNodeType =
  | "problem"
  | "competitor"
  | "customer"
  | "market"
  | "revenue"
  | "execution"
  | "monitoring-capability";
export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  reason: string;
}
export type KnowledgeRelation =
  | "threatens"
  | "affects"
  | "competes-for-attention-of"
  | "operates-in"
  | "shapes-monetization-of"
  | "funds-scope-of"
  | "sequenced-before"
  | "could-be-watched-by";
export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: KnowledgeRelation;
  reason: string;
}
export interface KnowledgeLinksResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

/** src/opportunities/types.ts FounderOpportunityReport */
export interface FounderOpportunityReport {
  id: string;
  clusterId: string;
  category: string;
  problem: string;
  summary: string;
  painScore: number;
  buyingIntent: BuyingIntentResult;
  competition: CompetitionResult;
  confidence: { band: string; score: number };
  scoreBreakdown: OpportunityScoreBreakdown;
  /**
   * Founder Opportunity Intelligence Score. Backend ranks every report by
   * `fois.overall` descending (see src/opportunities/engine.ts), so this — not
   * scoreBreakdown.weightedTotal — is the number the UI shows as "Score".
   */
  fois: FoisBreakdown;
  supportingEvidence: { evidenceCount: number; sourceBreakdown: Record<string, number>; urls: string[] };
  representativeQuotes: Array<{ text: string; url: string; source: string }>;
  recommendedMvp: string;
  suggestedPricing: PricingSignal;
  targetUsers: string;
  buildDifficulty: BuildDifficultyResult;
  estimatedTimeToMvp: string;
  recommendation: FounderRecommendation;
  createdAt: string;
  sourceSessionId: string;
  sourceProblemReportId: string;
  /** Loop 3 Founder Decision layer — see FounderDecision above. */
  decision: FounderDecision;
  /** Loop 7 Founder Intelligence bundle — competitor intel, market gaps, differentiation, risks. */
  founderIntelligence: FounderIntelligence;
  /** Loop 8 AI Decision Validation bundle — adversarial review, counter-evidence, final recommendation. */
  aiDecisionValidation: AiDecisionValidation;
  /** Business Intelligence bundle — business/revenue model, buyer, budget, urgency, switching. */
  businessIntelligence: BusinessIntelligenceResult;
  /** Market Intelligence bundle — growth stage, saturation, opportunity window. */
  marketIntelligence: MarketIntelligenceResult;
  /** Revenue Intelligence bundle — revenue potential, model, upsell/cross-sell. */
  revenueIntelligence: RevenueIntelligenceResult;
  /** MVP Scope bundle — phased roadmap, launch-readiness, deferred features. */
  mvpPlan: MvpScopeResult;
  /** Go-To-Market bundle — channels, positioning, launch sequence. */
  goToMarket: GoToMarketResult;
  /** Technical Blueprint bundle — advisory architecture/DB/API/auth/hosting guidance. */
  technicalBlueprint: TechnicalBlueprintResult;
  /** Knowledge Links bundle — typed node/edge reference set across report sections. */
  knowledgeLinks: KnowledgeLinksResult;
}

/* ---------------------------------------------------------------------- */
/* Opportunity Selection (src/opportunities/opportunity-selection.ts)      */
/* ---------------------------------------------------------------------- */

export type QualificationGateStatus = "PASS" | "FAIL" | "UNKNOWN";
export interface QualificationGate {
  gate: string;
  status: QualificationGateStatus;
  evidence: string[];
  reason: string;
}
export interface EliminationVerdict {
  rejected: boolean;
  reasons: string[];
}
export interface DifferentiationEngineResult {
  currentSolution: string;
  whyUsersStillUseIt: string;
  biggestComplaints: string[];
  missingFeatures: string[];
  pricingComplaints: string[];
  manualWorkarounds: string[];
  aiOpportunities: string[];
  automationOpportunities: string[];
  uxOpportunities: string[];
  workflowOpportunities: string[];
  whyUsersWouldSwitch: string;
}
export type FrictionTier = "low" | "medium" | "high" | "unknown";
export interface MarketReplacementAnalysis {
  switchFriction: FrictionTier;
  switchFrictionReason: string;
  migrationDifficulty: FrictionTier;
  migrationDifficultyReason: string;
  integrationDependency: FrictionTier;
  integrationDependencyReason: string;
  learningCurve: FrictionTier;
  learningCurveReason: string;
  lockInRisk: FrictionTier;
  lockInRiskReason: string;
  replacementFeasibility: "high" | "medium" | "low" | "unknown";
  replacementFeasibilityReason: string;
}
export interface HighConvictionScoreDimension {
  name: string;
  raw: number;
  weight: number;
  weighted: number;
  reason: string;
}
export interface HighConvictionScore {
  overall: number;
  dimensions: HighConvictionScoreDimension[];
}
export interface SelfCritique {
  reasonsToBuild: string[];
  reasonsNotToBuild: string[];
  strongestRisk: { risk: string; score: number; reason: string };
  strongestUnknown: string;
  evidenceStillMissing: string[];
  customerInterviewsRequired: string[];
}
export interface OpportunitySelectionSurvivor {
  report: FounderOpportunityReport;
  highConvictionScore: HighConvictionScore;
  whySurvived: string;
  selfCritique: SelfCritique;
}
export interface OpportunitySelectionRejected {
  reportId: string;
  whyRejected: string[];
}
export interface OpportunitySelectionResult {
  survivors: OpportunitySelectionSurvivor[];
  rejected: OpportunitySelectionRejected[];
}

/** src/opportunities/types.ts TopOpportunitiesReport — GET /api/pipeline/:id/opportunities response */
export interface TopOpportunitiesReport {
  id: string;
  sourceSessionId: string;
  sourceProblemReportId: string;
  opportunities: FounderOpportunityReport[];
  totalClustersConsidered: number;
  generatedAt: string;
  artifactId?: string;
  /** Final elimination/survivor-ranking layer — see OpportunitySelectionResult. */
  opportunitySelection: OpportunitySelectionResult;
}
