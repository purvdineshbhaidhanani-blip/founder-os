import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";
import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { EventBus } from "../runtime/events/bus.js";
import type { TaskQueue } from "../runtime/queue/queue.js";
import type { TaskRecord } from "../runtime/queue/types.js";
import type { WorkflowEngine } from "../runtime/workflow/engine.js";

export interface RecoveryReport {
  id: string;
  reason: string;
  attemptedAt: Timestamp;
  outcome: "resumed" | "reassigned" | "fell-back" | "escalated" | "no-op";
  details: Record<string, unknown>;
}

export interface FailureRecoveryOptions {
  queue: TaskQueue;
  workflowEngine: WorkflowEngine;
  agents: AgentRuntime;
  events?: EventBus;
  /** Returns a fallback agent name for a failed task. */
  fallbackResolver?: (record: TaskRecord) => string | undefined;
}

/**
 * Failure Recovery Engine — given a failed task or workflow, picks one of
 * {resume-from-checkpoint, reassign-to-fallback, escalate-to-human} and
 * records the attempt for later learning (the Learning Engine reads
 * `history()` to detect chronic failure patterns).
 */
export class FailureRecoveryEngine {
  private reports: RecoveryReport[] = [];

  constructor(private opts: FailureRecoveryOptions) {}

  async recoverTask(taskId: string, reason: string): Promise<RecoveryReport> {
    const record = this.opts.queue.get(taskId);
    if (!record) {
      return this.report({ reason, outcome: "no-op", details: { taskId, error: "unknown task" } });
    }

    if (record.status !== "failed" && record.status !== "dead") {
      return this.report({ reason, outcome: "no-op", details: { taskId, status: record.status } });
    }

    if (record.attempts < record.retry.maxAttempts) {
      record.status = "queued";
      record.scheduledFor = undefined;
      return this.report({ reason, outcome: "resumed", details: { taskId } });
    }

    const fallback = this.opts.fallbackResolver?.(record);
    if (fallback) {
      const fresh = this.opts.queue.enqueue({
        id: `${taskId}:fallback-${generateId("r").slice(0, 8)}`,
        kind: record.kind,
        payload: { ...(record.payload as object), agent: fallback },
        priority: record.priority + 1,
        dependencies: record.dependencies,
      });
      return this.report({
        reason,
        outcome: "reassigned",
        details: { taskId, fallbackTaskId: fresh.id, agent: fallback },
      });
    }

    return this.report({ reason, outcome: "escalated", details: { taskId } });
  }

  resumeWorkflow(stateId: string, checkpointId?: string): RecoveryReport {
    try {
      this.opts.workflowEngine.resume(stateId, checkpointId);
      return this.report({
        reason: "workflow.failed",
        outcome: "resumed",
        details: { stateId, checkpointId },
      });
    } catch (error) {
      return this.report({
        reason: "workflow.failed",
        outcome: "escalated",
        details: { stateId, error: (error as Error).message },
      });
    }
  }

  history(): RecoveryReport[] { return [...this.reports]; }

  private report(input: Omit<RecoveryReport, "id" | "attemptedAt">): RecoveryReport {
    const report: RecoveryReport = { id: generateId("rec"), attemptedAt: nowIso(), ...input };
    this.reports.push(report);
    void this.opts.events?.publish({ name: "recovery.attempted" as never, payload: report });
    return report;
  }
}
