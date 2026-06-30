import type { Timestamp } from "../../types/common.js";
import type { ContentCategory, Opportunity } from "../types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { CourtDecision, CourtVerdict } from "../decision/types.js";
import type { BusinessBlueprint } from "../blueprint/types.js";

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export type ScheduleInterval = "10min" | "1hr" | "6hr" | "1day";

export interface ScheduledTask {
  id: string;
  name: string;
  interval: ScheduleInterval;
  lastRunAt: Timestamp | null;
  nextRunAt: Timestamp;
  runCount: number;
  failCount: number;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export type JobPriority = "critical" | "high" | "normal" | "low";
export type JobStatus = "pending" | "running" | "done" | "failed" | "retrying";

export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  priority: JobPriority;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  enqueuedAt: Timestamp;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export type PipelineStage = "collect" | "score" | "court" | "blueprint" | "archive";

export interface PipelineResult {
  runId: string;
  startedAt: Timestamp;
  completedAt: Timestamp;
  stage: PipelineStage;
  opportunitiesProcessed: number;
  opportunitiesCreated: number;
  opportunitiesUpdated: number;
  opportunitiesArchived: number;
  errors: string[];
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Champion Tournament
// ---------------------------------------------------------------------------

export interface ChampionRecord {
  opportunityId: string;
  intelligence: OpportunityIntelligence;
  decision: CourtDecision;
  blueprint: BusinessBlueprint;
  championSince: Timestamp;
  tournamentWins: number;
  score: number;
}

export interface TournamentMatch {
  challengerId: string;
  defenderId: string;
  challengerScore: number;
  defenderScore: number;
  winner: "challenger" | "defender";
  margin: number;
  rationale: string;
}

export interface TournamentResult {
  tournamentId: string;
  ranAt: Timestamp;
  participants: number;
  champion: ChampionRecord;
  previousChampionId: string | null;
  championChanged: boolean;
  matches: TournamentMatch[];
  rankings: Array<{ opportunityId: string; rank: number; score: number }>;
}

// ---------------------------------------------------------------------------
// Change Detection
// ---------------------------------------------------------------------------

export type ChangeType =
  | "growing-demand"
  | "declining-demand"
  | "new-competitor"
  | "competitor-improvement"
  | "price-change"
  | "technology-change"
  | "legal-change"
  | "api-change"
  | "customer-sentiment-change"
  | "market-saturation";

export interface ChangeEvent {
  id: string;
  opportunityId: string;
  changeType: ChangeType;
  description: string;
  impactScore: number;       // 0–1; how much this change affects the opportunity
  previousScore: number;
  newScore: number;
  detectedAt: Timestamp;
  requiresRescore: boolean;
}

// ---------------------------------------------------------------------------
// Learning
// ---------------------------------------------------------------------------

export interface LearningRecord {
  id: string;
  opportunityId: string;
  predictionMade: Timestamp;
  predictionVerdict: CourtVerdict;
  predictionConfidence: number;
  founderDecision: "approved" | "rejected" | "deferred" | null;
  founderDecidedAt: Timestamp | null;
  actualOutcome: "success" | "failure" | "abandoned" | null;
  actualOutcomeAt: Timestamp | null;
  accuracyScore: number | null;   // null until outcome known
}

export interface LearningCalibration {
  totalPredictions: number;
  resolvedPredictions: number;
  accuracyRate: number;
  precisionByVerdict: Record<CourtVerdict, number>;
  confidenceCalibrationError: number;   // lower is better
  lastUpdated: Timestamp;
}

// ---------------------------------------------------------------------------
// Prediction Validation
// ---------------------------------------------------------------------------

export interface PredictionRecord {
  id: string;
  opportunityId: string;
  scoredAt: Timestamp;
  predictedScore: number;
  predictedVerdict: CourtVerdict;
  validatedAt: Timestamp | null;
  validationScore: number | null;
  drift: number | null;   // validatedScore - predictedScore
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardState {
  generatedAt: Timestamp;
  champion: ChampionRecord | null;
  top10: ChampionRecord[];
  totalOpportunities: number;
  opportunitiesByVerdict: Record<CourtVerdict, number>;
  opportunitiesByCategory: Partial<Record<ContentCategory, number>>;
  newThisWeek: number;
  archivedThisWeek: number;
  averageConfidence: number;
  lastPipelineRun: Timestamp | null;
  runtimeHealth: HealthStatus;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportSection {
  title: string;
  content: string;
  highlights: string[];
}

export interface DailyReport {
  reportId: string;
  date: string;             // YYYY-MM-DD
  generatedAt: Timestamp;
  champion: ChampionRecord | null;
  top10: ChampionRecord[];
  newOpportunities: string[];
  lostOpportunities: string[];
  changedOpportunities: Array<{ opportunityId: string; changeType: ChangeType; summary: string }>;
  rejectedOpportunities: string[];
  highestGrowth: string[];
  highestRisk: string[];
  marketSummary: string;
  learningSummary: string;
  sections: ReportSection[];
}

export interface WeeklyReport {
  reportId: string;
  weekStartDate: string;
  weekEndDate: string;
  generatedAt: Timestamp;
  champion: ChampionRecord | null;
  top10: ChampionRecord[];
  pipelineRunCount: number;
  totalOpportunitiesEvaluated: number;
  totalOpportunitiesArchived: number;
  championChanges: number;
  topChangeEvents: ChangeEvent[];
  weekOverWeekGrowth: number;     // % change in average confidence
  marketTrends: string[];
  learningInsights: string[];
  sections: ReportSection[];
}

export interface MonthlyReport {
  reportId: string;
  monthYear: string;         // e.g. "2025-01"
  generatedAt: Timestamp;
  champion: ChampionRecord | null;
  top10: ChampionRecord[];
  totalPipelineRuns: number;
  totalSignalsProcessed: number;
  totalOpportunitiesEvaluated: number;
  totalBlueprints: number;
  championEvolution: Array<{ opportunityId: string; since: Timestamp }>;
  monthOverMonthGrowth: number;
  marketEvolution: string;
  learningProgress: LearningCalibration;
  sections: ReportSection[];
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationTrigger =
  | "new-champion"
  | "champion-replaced"
  | "confidence-changed-significantly"
  | "major-market-change"
  | "major-revenue-change"
  | "major-cost-change"
  | "major-competition-change"
  | "major-legal-change"
  | "opportunity-invalidated";

export interface Notification {
  id: string;
  trigger: NotificationTrigger;
  title: string;
  body: string;
  opportunityId: string | null;
  priority: "urgent" | "high" | "normal";
  sentAt: Timestamp;
  read: boolean;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface RuntimeMetrics {
  totalPipelineRuns: number;
  totalOpportunitiesProcessed: number;
  totalSignalsCollected: number;
  totalBlueprints: number;
  avgPipelineDurationMs: number;
  failureRate: number;       // 0–1
  retryRate: number;         // 0–1
  avgConfidence: number;
  championChanges: number;
  tournamentRuns: number;
  notificationsSent: number;
  lastUpdated: Timestamp;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type HealthStatusCode = "healthy" | "degraded" | "critical" | "unknown";

export interface ComponentHealth {
  name: string;
  status: HealthStatusCode;
  lastCheckedAt: Timestamp;
  message: string;
}

export interface HealthStatus {
  overall: HealthStatusCode;
  components: ComponentHealth[];
  checkedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditAction =
  | "pipeline-run"
  | "opportunity-created"
  | "opportunity-updated"
  | "opportunity-archived"
  | "champion-set"
  | "champion-replaced"
  | "tournament-run"
  | "change-detected"
  | "notification-sent"
  | "learning-updated"
  | "report-generated"
  | "failure-recovered"
  | "job-retried";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  entityId: string | null;
  entityType: string | null;
  details: Record<string, unknown>;
  timestamp: Timestamp;
}

// ---------------------------------------------------------------------------
// Runtime context — threaded through all components
// ---------------------------------------------------------------------------

export interface RuntimeContext {
  runId: string;
  startedAt: Timestamp;
  opportunities: Map<string, Opportunity>;
  intelligence: Map<string, OpportunityIntelligence>;
  decisions: Map<string, CourtDecision>;
  blueprints: Map<string, BusinessBlueprint>;
}
