import { nowIso } from "../../utils/id.js";
import type { AgentRuntime } from "../agents/runtime.js";
import type { EventBus } from "../events/bus.js";
import type { EventFilter, RuntimeEvent } from "../events/types.js";
import type { TaskQueue } from "../queue/queue.js";
import type { TaskRecord } from "../queue/types.js";
import type { WorkflowEngine } from "../workflow/engine.js";
import type { WorkflowState } from "../workflow/types.js";
import type {
  DashboardSnapshot,
  ExecutionHistoryEntry,
  RuntimeMetrics,
} from "./types.js";

export interface DashboardBackendOptions {
  events: EventBus;
  queue: TaskQueue;
  workflowEngine: WorkflowEngine;
  agents: AgentRuntime;
  /** Workflow state ids the backend should treat as "tracked". */
  trackedWorkflowStateIds?: () => string[];
}

/**
 * Phase 12 surface — read-only views over every other runtime layer.
 * Frontends consume `snapshot()` / `history()` / `metrics()`; no UI logic
 * lives here.
 */
export class DashboardBackend {
  private readonly events: EventBus;
  private readonly queue: TaskQueue;
  private readonly workflowEngine: WorkflowEngine;
  private readonly agents: AgentRuntime;
  private readonly trackedWorkflowStateIds: () => string[];

  constructor(options: DashboardBackendOptions) {
    this.events = options.events;
    this.queue = options.queue;
    this.workflowEngine = options.workflowEngine;
    this.agents = options.agents;
    this.trackedWorkflowStateIds = options.trackedWorkflowStateIds ?? (() => []);
  }

  activeWorkflows(): WorkflowState[] {
    return this.trackedWorkflowStateIds()
      .map((id) => this.workflowEngine.getState(id))
      .filter((state): state is WorkflowState => Boolean(state))
      .filter((state) => state.status === "running" || state.status === "paused");
  }

  queued(): TaskRecord[] {
    return this.queue.list({ statuses: ["queued", "scheduled"] });
  }

  running(): TaskRecord[] {
    return this.queue.list({ status: "running" });
  }

  completed(): TaskRecord[] {
    return this.queue.list({ status: "succeeded" });
  }

  failed(): TaskRecord[] {
    return this.queue.list({ statuses: ["failed", "cancelled"] });
  }

  deadLetter(): TaskRecord[] {
    return this.queue.deadLetter();
  }

  runningAgents(): ReturnType<AgentRuntime["list"]> {
    return this.agents.list().filter((agent) => agent.status === "active");
  }

  history(filter: EventFilter = {}): ExecutionHistoryEntry[] {
    return this.events.history(filter).map((event) => ({ event }));
  }

  metrics(): RuntimeMetrics {
    const allTasks = this.queue.list();
    const tasksByStatus = countBy(allTasks, (task) => task.status);
    const workflows = this.trackedWorkflowStateIds()
      .map((id) => this.workflowEngine.getState(id))
      .filter((state): state is WorkflowState => Boolean(state));
    const workflowsByStatus = countBy(workflows, (state) => state.status);
    const agents = this.agents.list();
    const agentsByStatus = countBy(agents, (descriptor) => descriptor.status);

    const succeeded = tasksByStatus.succeeded ?? 0;
    const terminal =
      (tasksByStatus.succeeded ?? 0) +
      (tasksByStatus.failed ?? 0) +
      (tasksByStatus.cancelled ?? 0) +
      (tasksByStatus.dead ?? 0);

    const completedRecords = allTasks.filter(
      (task) => task.completedAt && task.startedAt && task.status === "succeeded",
    );
    const meanDurationMs = completedRecords.length
      ? completedRecords.reduce(
          (sum, task) => sum + (Date.parse(task.completedAt!) - Date.parse(task.startedAt!)),
          0,
        ) / completedRecords.length
      : 0;

    return {
      totalEvents: this.events.history().length,
      totalTasks: allTasks.length,
      tasksByStatus,
      workflowsByStatus,
      agentsByStatus,
      taskSuccessRate: terminal === 0 ? 0 : succeeded / terminal,
      meanTaskDurationMs: meanDurationMs,
    };
  }

  snapshot(): DashboardSnapshot {
    return {
      takenAt: nowIso(),
      activeWorkflows: this.activeWorkflows(),
      queued: this.queued(),
      running: this.running(),
      completed: this.completed(),
      failed: this.failed(),
      deadLetter: this.deadLetter(),
      runningAgents: this.runningAgents(),
      metrics: this.metrics(),
    };
  }

  /** Convenience accessor for the unfiltered event log (matches Phase 12 "execution history"). */
  recentEvents(limit = 100): RuntimeEvent[] {
    return this.events.history().slice(-limit);
  }
}

function countBy<T>(items: T[], pick: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = pick(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
