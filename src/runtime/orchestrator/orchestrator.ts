import { generateId, nowIso } from "../../utils/id.js";
import { createLogger, type Logger } from "../../utils/logger.js";
import type { ArtifactManager } from "../artifacts/manager.js";
import type { AgentRuntime } from "../agents/runtime.js";
import type { EventBus } from "../events/bus.js";
import type { MemoryEngine } from "../memory/engine.js";
import type { TaskQueue } from "../queue/queue.js";
import type { TaskRecord } from "../queue/types.js";
import type { WorkflowEngine } from "../workflow/engine.js";
import type { WorkflowDefinition, WorkflowState } from "../workflow/types.js";
import type {
  ExecutionPlan,
  FinalReport,
  FounderRequest,
  PlanProgress,
  PlannedSubtask,
} from "./types.js";

export interface PlannerInput {
  request: FounderRequest;
  runtime: AgentRuntime;
}

/**
 * Pluggable planning function. Defaults to a category-rotation heuristic;
 * higher layers can swap in something smarter (e.g. an LLM planner) without
 * touching the orchestrator's wiring.
 */
export type Planner = (input: PlannerInput) => PlannedSubtask[];

export interface MasterOrchestratorOptions {
  memory: MemoryEngine;
  events: EventBus;
  queue: TaskQueue;
  workflowEngine: WorkflowEngine;
  agents: AgentRuntime;
  artifacts: ArtifactManager;
  planner?: Planner;
  logger?: Logger;
}

/**
 * Phase 5 surface — composes every other runtime layer to turn a founder
 * request into an executed, reported plan. The orchestrator owns no state
 * itself beyond the plan→workflow→task mapping; everything substantive
 * lives in the engines it coordinates.
 */
export class MasterOrchestrator {
  private readonly plans = new Map<string, ExecutionPlan>();
  private readonly requests = new Map<string, FounderRequest>();
  private readonly planStartedAt = new Map<string, string>();
  private readonly memory: MemoryEngine;
  private readonly events: EventBus;
  private readonly queue: TaskQueue;
  private readonly workflowEngine: WorkflowEngine;
  private readonly agents: AgentRuntime;
  private readonly artifacts: ArtifactManager;
  private readonly planner: Planner;
  private readonly logger: Logger;

  constructor(options: MasterOrchestratorOptions) {
    this.memory = options.memory;
    this.events = options.events;
    this.queue = options.queue;
    this.workflowEngine = options.workflowEngine;
    this.agents = options.agents;
    this.artifacts = options.artifacts;
    this.planner = options.planner ?? defaultPlanner;
    this.logger = options.logger ?? createLogger("runtime.orchestrator");
  }

  /**
   * One-shot entrypoint: store the founder request, plan it, register the
   * workflow with the workflow engine, enqueue the subtasks, and publish
   * `workflow.started`.
   */
  async receive(request: FounderRequest): Promise<ExecutionPlan> {
    const id = request.id ?? generateId("req");
    const stored: FounderRequest = { ...request, id };
    this.requests.set(id, stored);
    await this.memory.remember("project", `request:${id}`, stored, { tags: ["request"] });
    const plan = this.plan(stored);
    this.assign(plan);
    return plan;
  }

  plan(request: FounderRequest): ExecutionPlan {
    const requestId = request.id ?? generateId("req");
    const subtasks = this.planner({ request, runtime: this.agents });
    if (subtasks.length === 0) {
      throw new Error(`Planner produced no subtasks for goal "${request.goal}".`);
    }

    const def: WorkflowDefinition = {
      id: `wf:${requestId}`,
      name: `plan:${request.goal.slice(0, 80)}`,
      nodes: subtasks.map((subtask) => ({
        id: subtask.id,
        kind: "subtask",
        payload: subtask,
        dependsOn: subtask.dependsOn,
      })),
    };
    this.workflowEngine.define(def);
    const state = this.workflowEngine.start(def.id, { requestId, goal: request.goal });

    const plan: ExecutionPlan = {
      id: generateId("plan"),
      requestId,
      goal: request.goal,
      workflowStateId: state.id,
      subtasks,
      createdAt: nowIso(),
    };
    this.plans.set(plan.id, plan);
    this.planStartedAt.set(plan.id, plan.createdAt);

    void this.events.publish({
      name: "workflow.started",
      source: "orchestrator",
      correlationId: plan.id,
      payload: { planId: plan.id, workflowStateId: state.id, subtasks: subtasks.length },
    });

    return plan;
  }

  assign(plan: ExecutionPlan): TaskRecord[] {
    const records: TaskRecord[] = [];
    for (const subtask of plan.subtasks) {
      const record = this.queue.enqueue({
        id: subtask.id,
        kind: "agent.execute",
        payload: {
          planId: plan.id,
          subtask,
          agent: subtask.assignedAgent,
        },
        priority: subtask.priority ?? 0,
        dependencies: subtask.dependsOn,
      });
      records.push(record);
      void this.events.publish({
        name: "task.queued",
        source: "orchestrator",
        correlationId: plan.id,
        payload: { taskId: record.id, agent: subtask.assignedAgent },
      });
    }
    return records;
  }

  monitor(planId: string): PlanProgress {
    const plan = this.requirePlan(planId);
    const workflow = this.workflowEngine.getState(plan.workflowStateId);
    if (!workflow) throw new Error(`Plan ${planId} has no live workflow state.`);
    const tasks = plan.subtasks
      .map((subtask) => this.queue.get(subtask.id))
      .filter((record): record is TaskRecord => Boolean(record));
    const succeeded = tasks.filter((task) => task.status === "succeeded").length;
    const artifacts = this.artifacts.list({}).filter((a) => a.metadata.planId === plan.id);
    return {
      planId,
      workflow,
      tasks,
      artifacts,
      completion: plan.subtasks.length === 0 ? 0 : succeeded / plan.subtasks.length,
    };
  }

  /** Re-enqueues every failed subtask in `planId` whose retry budget is exhausted. */
  retryFailures(planId: string): TaskRecord[] {
    const plan = this.requirePlan(planId);
    const retried: TaskRecord[] = [];
    for (const subtask of plan.subtasks) {
      const existing = this.queue.get(subtask.id);
      if (!existing || (existing.status !== "dead" && existing.status !== "failed")) continue;
      const fresh = this.queue.enqueue({
        id: `${subtask.id}:retry-${generateId("r").slice(0, 8)}`,
        kind: "agent.execute",
        payload: { planId, subtask, agent: subtask.assignedAgent },
        priority: (subtask.priority ?? 0) + 1,
        dependencies: subtask.dependsOn,
      });
      retried.push(fresh);
      void this.events.publish({
        name: "task.queued",
        source: "orchestrator",
        correlationId: planId,
        payload: { taskId: fresh.id, retryOf: subtask.id },
      });
    }
    return retried;
  }

  /**
   * Records that a subtask completed with `result`. Updates the workflow,
   * marks the corresponding task succeeded, and writes the result to memory
   * keyed by the plan.
   */
  async recordSubtaskResult(
    planId: string,
    subtaskId: string,
    outcome: { ok: boolean; result?: unknown; error?: { message: string; code?: string } },
  ): Promise<void> {
    const plan = this.requirePlan(planId);
    const record = this.queue.get(subtaskId);
    if (record) {
      if (outcome.ok) this.queue.complete(subtaskId, outcome.result);
      else this.queue.fail(subtaskId, outcome.error ?? { message: "subtask failed" });
    }
    this.workflowEngine.completeNode(plan.workflowStateId, subtaskId, {
      status: outcome.ok ? "succeeded" : "failed",
      result: outcome.result,
      error: outcome.error,
    });
    await this.memory.remember(
      "task",
      `${planId}:${subtaskId}`,
      { ok: outcome.ok, result: outcome.result, error: outcome.error },
      { tags: ["subtask", planId] },
    );
    void this.events.publish({
      name: outcome.ok ? "task.completed" : "task.failed",
      source: "orchestrator",
      correlationId: planId,
      payload: { taskId: subtaskId, ok: outcome.ok },
    });
  }

  collectArtifacts(planId: string): ReturnType<ArtifactManager["list"]> {
    const plan = this.requirePlan(planId);
    return this.artifacts.list({}).filter((artifact) => artifact.metadata.planId === plan.id);
  }

  report(planId: string): FinalReport {
    const plan = this.requirePlan(planId);
    const workflow = this.workflowEngine.getState(plan.workflowStateId);
    if (!workflow) throw new Error(`Cannot report on plan ${planId}: workflow state missing.`);
    const tasksById = new Map(plan.subtasks.map((subtask) => [subtask.id, subtask]));
    const succeeded: PlannedSubtask[] = [];
    const failed: PlannedSubtask[] = [];
    for (const subtask of plan.subtasks) {
      const node = workflow.nodes[subtask.id];
      if (!node) continue;
      if (node.status === "succeeded") succeeded.push(subtask);
      else if (node.status === "failed") failed.push(subtask);
    }
    const status: FinalReport["status"] =
      workflow.status === "completed"
        ? "completed"
        : workflow.status === "rolled-back"
          ? "rolled-back"
          : "failed";
    const report: FinalReport = {
      planId,
      goal: plan.goal,
      status,
      startedAt: this.planStartedAt.get(planId) ?? plan.createdAt,
      endedAt: nowIso(),
      succeededSubtasks: succeeded,
      failedSubtasks: failed,
      artifacts: this.collectArtifacts(planId),
    };
    void tasksById;
    void this.events.publish({
      name: status === "completed" ? "workflow.completed" : "workflow.failed",
      source: "orchestrator",
      correlationId: planId,
      payload: { planId, status, succeeded: succeeded.length, failed: failed.length },
    });
    return report;
  }

  private requirePlan(id: string): ExecutionPlan {
    const plan = this.plans.get(id);
    if (!plan) throw new Error(`Unknown plan "${id}".`);
    return plan;
  }
}

/**
 * Default heuristic planner: scans active agents and assigns one subtask per
 * agent category in a fixed engineering order (planning → engineering → qa
 * → review → documentation). Skips categories with no active agent. Each
 * subtask depends on the previous one in this list.
 */
const DEFAULT_PIPELINE: string[] = ["planning", "engineering", "qa", "review", "documentation"];

const defaultPlanner: Planner = ({ request, runtime }) => {
  const preferred = request.preferredCategories ?? DEFAULT_PIPELINE;
  const subtasks: PlannedSubtask[] = [];
  let previousId: string | undefined;
  for (const category of preferred) {
    const candidate = runtime.discover({ category, status: "active" })[0];
    if (!candidate) continue;
    const id = `subtask:${category}:${generateId("st").slice(0, 8)}`;
    const subtask: PlannedSubtask = {
      id,
      title: `${category} step for: ${request.goal}`,
      description: `Have the ${category} agent (${candidate.name}) advance the goal: ${request.goal}.`,
      assignedAgent: candidate.name,
      dependsOn: previousId ? [previousId] : [],
      priority: DEFAULT_PIPELINE.length - DEFAULT_PIPELINE.indexOf(category),
    };
    subtasks.push(subtask);
    previousId = id;
  }
  return subtasks;
};
