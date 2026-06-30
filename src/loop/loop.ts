import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";
import type { MasterOrchestrator } from "../runtime/orchestrator/orchestrator.js";
import type { ApprovalSystem } from "../runtime/approval/system.js";
import type { LearningEngine } from "../learning/engine.js";
import type { SelfEvolutionEngine } from "../evolution/evolution.js";
import type { CostOptimizer } from "../cost/optimizer.js";
import type { FailureRecoveryEngine } from "../recovery/recovery.js";
import type { FinalReport } from "../runtime/orchestrator/types.js";

export type ApprovalReason =
  | "budget-exceeded"
  | "external-credentials"
  | "high-risk-operation"
  | "destructive-action"
  | "legal-security";

export interface LoopTick {
  id: string;
  goal: string;
  phase: "plan" | "assign" | "execute" | "review" | "improve" | "learn" | "complete";
  startedAt: Timestamp;
  finishedAt?: Timestamp;
  report?: FinalReport;
  approvalIds: string[];
  notes?: string;
}

export interface AutonomousLoopOptions {
  orchestrator: MasterOrchestrator;
  approvals: ApprovalSystem;
  learning: LearningEngine;
  evolution: SelfEvolutionEngine;
  cost: CostOptimizer;
  recovery: FailureRecoveryEngine;
}

/**
 * Autonomous Execution Loop — Plan → Assign → Execute → Review → Improve →
 * Learn → Repeat. Drives the company on a single founder goal. Surfaces an
 * approval only when policy demands one (budget exceeded, external creds,
 * destructive action, etc.).
 */
export class AutonomousLoop {
  private ticks: LoopTick[] = [];
  private opts: AutonomousLoopOptions;

  constructor(options: AutonomousLoopOptions) {
    this.opts = options;
  }

  /** Run one full cycle for a goal. Returns the LoopTick recording the run. */
  async run(goal: string): Promise<LoopTick> {
    const tick: LoopTick = {
      id: generateId("loop"),
      goal,
      phase: "plan",
      startedAt: nowIso(),
      approvalIds: [],
    };
    this.ticks.push(tick);

    // Plan + Assign
    const plan = await this.opts.orchestrator.receive({ goal });
    tick.phase = "assign";

    // Pre-flight policy checks: surface approvals only when warranted.
    const budget = this.opts.cost.remainingBudget();
    if (budget.dailyCents <= 0) {
      const approval = this.opts.approvals.request({
        reason: "budget-exceeded",
        payload: { planId: plan.id, goal },
        requestedBy: "autonomous-loop",
      });
      tick.approvalIds.push(approval.id);
    }

    // Execute is left to the orchestrator + queue + execution engine. We
    // synthesize the result here using the orchestrator's report once it's
    // ready — callers can drive recordSubtaskResult between run() calls.
    tick.phase = "execute";

    try {
      tick.phase = "review";
      const report = this.opts.orchestrator.report(plan.id);
      tick.report = report;

      tick.phase = "improve";
      for (const failed of report.failedSubtasks) {
        await this.opts.recovery.recoverTask(failed.id, "loop.review");
      }

      tick.phase = "learn";
      this.opts.learning.observe({
        projectId: plan.id,
        goal,
        succeeded: report.status === "completed",
        durationMs: Date.parse(report.endedAt) - Date.parse(report.startedAt),
        succeededSubtasks: report.succeededSubtasks.length,
        failedSubtasks: report.failedSubtasks.length,
      });
      this.opts.learning.synthesize();
      this.opts.evolution.tick();
    } catch (error) {
      tick.notes = `loop error: ${(error as Error).message}`;
    }

    tick.phase = "complete";
    tick.finishedAt = nowIso();
    return tick;
  }

  /** Request an approval and pause until decided — wrapper around ApprovalSystem.await. */
  async pauseForApproval(reason: ApprovalReason, payload: unknown, requestedBy = "autonomous-loop") {
    const request = this.opts.approvals.request({ reason, payload, requestedBy });
    return this.opts.approvals.await(request.id);
  }

  history(): LoopTick[] { return [...this.ticks]; }
}
