import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";
import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { ApprovalRequest, ApprovalSystem } from "../runtime/approval/index.js";
import type { DashboardBackend } from "../runtime/dashboard/backend.js";
import type { DashboardSnapshot } from "../runtime/dashboard/types.js";
import type { AgentAnalytics } from "../analytics/agents.js";
import type { CapabilityDirectory, CapabilityProfile } from "../capability/directory.js";
import type { ObservabilityHub } from "../observability/monitor.js";
import type { CompanyOS, Project } from "../org/org.js";
import type { CompanyRituals, CalendarEvent, DecisionLogEntry } from "../org/rituals.js";
import type { MultiProjectScheduler, PortfolioSnapshot } from "../scheduling/scheduler.js";
import type { CostOptimizer, OptimizationRecommendation } from "../cost/optimizer.js";
import type { LearningEngine, ImprovementProposal } from "../learning/engine.js";

export interface Notification {
  id: string;
  level: "info" | "warn" | "alert";
  title: string;
  body: string;
  createdAt: Timestamp;
  read: boolean;
  link?: string;
}

export interface FounderDashboardView {
  takenAt: Timestamp;
  runtime: DashboardSnapshot;
  health: { ok: boolean; failing: string[] };
  notifications: Notification[];
  pendingApprovals: ApprovalRequest[];
  proposals: ImprovementProposal[];
  costRecommendations: OptimizationRecommendation[];
  costSummary: { totalCents: number; totalTokens: number };
  upcomingEvents: CalendarEvent[];
}

export interface CompanyDashboardView {
  takenAt: Timestamp;
  departmentCount: number;
  agentCount: number;
  activeAgents: number;
  projectCount: number;
  activeProjects: number;
  decisionsLast30Days: number;
  health: { ok: boolean; failing: string[] };
}

export interface PortfolioDashboardView {
  takenAt: Timestamp;
  portfolio: PortfolioSnapshot;
  projects: Project[];
  overdue: string[];
}

export interface ProjectDashboardView {
  takenAt: Timestamp;
  project: Project;
  decisions: DecisionLogEntry[];
  agents: CapabilityProfile[];
  milestones: ReturnType<CompanyOS["listMilestones"]>;
  sprints: ReturnType<CompanyOS["listSprints"]>;
  releases: ReturnType<CompanyOS["listReleases"]>;
}

export interface RoadmapEntry {
  projectId: string;
  name: string;
  milestones: ReturnType<CompanyOS["listMilestones"]>;
  targetDate?: Timestamp;
  status: Project["status"];
}

export interface ExecutiveMetrics {
  takenAt: Timestamp;
  totalAgents: number;
  activeAgents: number;
  averageSuccessRate: number;
  totalSpentCents: number;
  totalTokens: number;
  approvalsPending: number;
  proposalsPending: number;
}

export interface CommandCenterOptions {
  runtime: AgentRuntime;
  dashboard: DashboardBackend;
  approvals: ApprovalSystem;
  analytics: AgentAnalytics;
  directory: CapabilityDirectory;
  observability: ObservabilityHub;
  companyOS: CompanyOS;
  rituals: CompanyRituals;
  scheduler: MultiProjectScheduler;
  cost: CostOptimizer;
  learning: LearningEngine;
}

/**
 * Phase 1 surface — Founder Command Center backend. Composes every read-only
 * view a Founder UI needs: founder dashboard, company dashboard, portfolio,
 * per-project dashboard, roadmaps, reports, notifications, approvals, agent
 * health, execution timeline, executive metrics. No UI; just typed APIs.
 */
export class CommandCenterBackend {
  private notifications: Notification[] = [];
  constructor(private opts: CommandCenterOptions) {}

  notify(level: Notification["level"], title: string, body: string, link?: string): Notification {
    const note: Notification = { id: generateId("note"), level, title, body, link, createdAt: nowIso(), read: false };
    this.notifications.push(note);
    return note;
  }

  markRead(id: string): void {
    const note = this.notifications.find((entry) => entry.id === id);
    if (note) note.read = true;
  }

  listNotifications(unreadOnly = false, limit = 50): Notification[] {
    const all = [...this.notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return (unreadOnly ? all.filter((note) => !note.read) : all).slice(0, limit);
  }

  founderDashboard(): FounderDashboardView {
    return {
      takenAt: nowIso(),
      runtime: this.opts.dashboard.snapshot(),
      health: this.opts.observability.overallHealth(),
      notifications: this.listNotifications(true, 10),
      pendingApprovals: this.opts.approvals.list({ status: "pending" }),
      proposals: this.opts.learning.proposalsList({ status: "pending" }),
      costRecommendations: this.opts.cost.recommendations(),
      costSummary: this.opts.observability.costSummary(),
      upcomingEvents: this.opts.rituals.upcomingEvents(),
    };
  }

  companyDashboard(): CompanyDashboardView {
    const agents = this.opts.runtime.list();
    const projects = this.opts.companyOS.listProjects();
    const cutoff = Date.now() - 30 * 86_400_000;
    const decisionsLast30Days = this.opts.rituals
      .listDecisions()
      .filter((decision) => Date.parse(decision.decidedAt) >= cutoff).length;
    return {
      takenAt: nowIso(),
      departmentCount: this.opts.companyOS.listDepartments().length,
      agentCount: agents.length,
      activeAgents: agents.filter((agent) => agent.status === "active").length,
      projectCount: projects.length,
      activeProjects: projects.filter((project) => project.status === "active").length,
      decisionsLast30Days,
      health: this.opts.observability.overallHealth(),
    };
  }

  portfolioDashboard(): PortfolioDashboardView {
    const portfolio = this.opts.scheduler.snapshot();
    return {
      takenAt: nowIso(),
      portfolio,
      projects: this.opts.companyOS.listProjects(),
      overdue: portfolio.overdue,
    };
  }

  projectDashboard(projectId: string): ProjectDashboardView {
    const project = this.opts.companyOS.getProject(projectId);
    if (!project) throw new Error(`Unknown project "${projectId}"`);
    const decisions = this.opts.rituals.listDecisions({ projectId });
    const agents = this.opts.directory.list();
    return {
      takenAt: nowIso(),
      project,
      decisions,
      agents,
      milestones: this.opts.companyOS.listMilestones(projectId),
      sprints: this.opts.companyOS.listSprints(projectId),
      releases: this.opts.companyOS.listReleases(projectId),
    };
  }

  roadmap(): RoadmapEntry[] {
    return this.opts.companyOS.listProjects().map((project) => ({
      projectId: project.id,
      name: project.name,
      status: project.status,
      targetDate: project.targetDate,
      milestones: this.opts.companyOS.listMilestones(project.id),
    }));
  }

  reports(): {
    runtime: DashboardSnapshot;
    health: { ok: boolean; failing: string[] };
    recommendations: OptimizationRecommendation[];
    pendingApprovals: number;
  } {
    return {
      runtime: this.opts.dashboard.snapshot(),
      health: this.opts.observability.overallHealth(),
      recommendations: this.opts.cost.recommendations(),
      pendingApprovals: this.opts.approvals.list({ status: "pending" }).length,
    };
  }

  agentHealth(): Array<{ name: string; status: string; ok: boolean; lastHeartbeat?: string }> {
    return this.opts.runtime.list().map((agent) => ({
      name: agent.name,
      status: agent.status,
      ok: agent.health?.ok ?? agent.status === "active",
      lastHeartbeat: agent.lastHeartbeat,
    }));
  }

  executionTimeline(limit = 200): ReturnType<DashboardBackend["history"]> {
    return this.opts.dashboard.history({}).slice(-limit);
  }

  companyTimeline(limit = 100): DecisionLogEntry[] {
    return this.opts.rituals.listDecisions().slice(0, limit);
  }

  executiveMetrics(): ExecutiveMetrics {
    const views = this.opts.analytics.all();
    const successRate = views.length === 0
      ? 0
      : views.reduce((sum, view) => sum + view.successRate, 0) / views.length;
    const costSummary = this.opts.observability.costSummary();
    const agents = this.opts.runtime.list();
    return {
      takenAt: nowIso(),
      totalAgents: agents.length,
      activeAgents: agents.filter((agent) => agent.status === "active").length,
      averageSuccessRate: successRate,
      totalSpentCents: costSummary.totalCents,
      totalTokens: costSummary.totalTokens,
      approvalsPending: this.opts.approvals.list({ status: "pending" }).length,
      proposalsPending: this.opts.learning.proposalsList({ status: "pending" }).length,
    };
  }
}
