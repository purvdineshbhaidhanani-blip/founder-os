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

export interface MeResponse {
  user: AuthUser;
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
  };
  generatedAt: string;
}

/** src/research/types.ts ResearchSession */
export interface ResearchSession {
  id: string;
  windowDays: number;
  startedAt: string;
  completedAt?: string;
  sourcesUsed: string[];
  sourcesFailed: Array<{ id: string; error: string }>;
  sourcesSkipped: Array<{ id: string; reason: string }>;
  opportunities: Opportunity[];
  report: FounderReport;
  artifactId?: string;
}

/** src/research/types.ts ResearchProgressEvent (discriminated union) */
export type ResearchProgressEvent =
  | { type: "source.start"; sourceId: string }
  | { type: "source.done"; sourceId: string; itemCount: number }
  | { type: "source.failed"; sourceId: string; error: string }
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
