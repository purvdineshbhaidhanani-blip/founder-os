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
}
