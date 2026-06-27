import { generateId, nowIso } from "../../utils/id.js";
import { buildGraph, type WorkflowGraph } from "./graph.js";
import type {
  Checkpoint,
  NodeOutcome,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowState,
} from "./types.js";

/** Result of completing a node — used to feed branch decisions back into the state. */
export interface NodeResult {
  status: "succeeded" | "failed" | "skipped";
  result?: unknown;
  error?: { message: string; code?: string };
  /** Optional context merge applied on success. */
  contextUpdate?: WorkflowContext;
}

/**
 * Phase 4 surface — workflow definition + state management. The engine does
 * not execute node payloads itself; it owns the DAG, checkpoints, branching,
 * and merge semantics. Execution is delegated to the Execution Engine
 * (Phase 9), which calls `markReady → markRunning → completeNode`.
 */
export class WorkflowEngine {
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly graphs = new Map<string, WorkflowGraph>();
  private readonly states = new Map<string, WorkflowState>();

  define(def: WorkflowDefinition): void {
    this.graphs.set(def.id, buildGraph(def));
    this.definitions.set(def.id, def);
  }

  getDefinition(workflowId: string): WorkflowDefinition | undefined {
    return this.definitions.get(workflowId);
  }

  start(workflowId: string, context: WorkflowContext = {}): WorkflowState {
    const def = this.definitions.get(workflowId);
    const graph = this.graphs.get(workflowId);
    if (!def || !graph) throw new Error(`Unknown workflow "${workflowId}".`);

    const now = nowIso();
    const nodes: Record<string, NodeOutcome> = {};
    for (const node of def.nodes) {
      nodes[node.id] = {
        nodeId: node.id,
        status: graph.roots.includes(node.id) ? "ready" : "pending",
      };
    }

    const state: WorkflowState = {
      id: generateId("wf"),
      workflowId,
      status: "running",
      context: { ...(def.initialContext ?? {}), ...context },
      nodes,
      checkpoints: [],
      startedAt: now,
      updatedAt: now,
    };
    this.states.set(state.id, state);
    return state;
  }

  getState(stateId: string): WorkflowState | undefined {
    return this.states.get(stateId);
  }

  /** Nodes whose dependencies are all `succeeded` (or `skipped` due to branching). */
  readyNodes(stateId: string): string[] {
    const state = this.requireState(stateId);
    return Object.values(state.nodes)
      .filter((node) => node.status === "ready")
      .map((node) => node.nodeId);
  }

  markRunning(stateId: string, nodeId: string): void {
    const state = this.requireState(stateId);
    const outcome = this.requireNode(state, nodeId);
    outcome.status = "running";
    outcome.startedAt = nowIso();
    state.updatedAt = nowIso();
  }

  completeNode(stateId: string, nodeId: string, result: NodeResult): WorkflowState {
    const state = this.requireState(stateId);
    const def = this.definitions.get(state.workflowId)!;
    const graph = this.graphs.get(state.workflowId)!;
    const outcome = this.requireNode(state, nodeId);

    outcome.status = result.status;
    outcome.result = result.result;
    outcome.error = result.error;
    outcome.completedAt = nowIso();

    if (result.status === "succeeded" && result.contextUpdate) {
      state.context = { ...state.context, ...result.contextUpdate };
    }

    if (result.status === "failed") {
      state.status = "failed";
      state.updatedAt = nowIso();
      return state;
    }

    if (result.status === "succeeded") {
      const node = graph.nodesById.get(nodeId)!;
      const selectedBranch = node.branch?.(state.context) ?? null;
      const successors = graph.successors.get(nodeId) ?? [];

      for (const succId of successors) {
        if (selectedBranch !== null && succId !== selectedBranch) {
          this.skipSubtree(state, graph, succId);
        }
      }

      for (const succId of successors) {
        const succOutcome = state.nodes[succId]!;
        if (succOutcome.status !== "pending") continue;
        const allDepsResolved = (graph.predecessors.get(succId) ?? []).every((depId) => {
          const dep = state.nodes[depId]!;
          return dep.status === "succeeded" || dep.status === "skipped";
        });
        if (!allDepsResolved) continue;
        const anyDepSucceeded = (graph.predecessors.get(succId) ?? []).some(
          (depId) => state.nodes[depId]!.status === "succeeded",
        );
        succOutcome.status = anyDepSucceeded ? "ready" : "skipped";
      }
    }

    const allDone = Object.values(state.nodes).every((node) =>
      ["succeeded", "skipped", "failed"].includes(node.status),
    );
    if (allDone && state.status === "running") {
      const anyFailed = Object.values(state.nodes).some((node) => node.status === "failed");
      state.status = anyFailed ? "failed" : "completed";
    }
    state.updatedAt = nowIso();
    void def;
    return state;
  }

  pause(stateId: string): WorkflowState {
    const state = this.requireState(stateId);
    if (state.status === "running") state.status = "paused";
    state.updatedAt = nowIso();
    return state;
  }

  checkpoint(stateId: string, label?: string): Checkpoint {
    const state = this.requireState(stateId);
    const cp: Checkpoint = {
      id: generateId("ckpt"),
      workflowStateId: stateId,
      createdAt: nowIso(),
      nodes: structuredClone(state.nodes),
      context: structuredClone(state.context),
      label,
    };
    state.checkpoints.push(cp);
    state.updatedAt = nowIso();
    return cp;
  }

  /** Resumes a paused or failed state, optionally rewinding to a checkpoint first. */
  resume(stateId: string, fromCheckpointId?: string): WorkflowState {
    const state = this.requireState(stateId);
    if (fromCheckpointId) {
      const cp = state.checkpoints.find((c) => c.id === fromCheckpointId);
      if (!cp) throw new Error(`Unknown checkpoint "${fromCheckpointId}" for state "${stateId}".`);
      state.nodes = structuredClone(cp.nodes);
      state.context = structuredClone(cp.context);
    }
    state.status = "running";
    state.updatedAt = nowIso();
    return state;
  }

  rollback(stateId: string, toCheckpointId: string): WorkflowState {
    const state = this.requireState(stateId);
    const cp = state.checkpoints.find((c) => c.id === toCheckpointId);
    if (!cp) throw new Error(`Unknown checkpoint "${toCheckpointId}" for state "${stateId}".`);
    state.nodes = structuredClone(cp.nodes);
    state.context = structuredClone(cp.context);
    state.status = "rolled-back";
    state.updatedAt = nowIso();
    return state;
  }

  private skipSubtree(state: WorkflowState, graph: WorkflowGraph, rootId: string): void {
    const queue = [rootId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const outcome = state.nodes[id]!;
      if (outcome.status !== "pending" && outcome.status !== "ready") continue;
      outcome.status = "skipped";
      outcome.completedAt = nowIso();
      for (const succId of graph.successors.get(id) ?? []) queue.push(succId);
    }
  }

  private requireState(id: string): WorkflowState {
    const state = this.states.get(id);
    if (!state) throw new Error(`Unknown workflow state "${id}".`);
    return state;
  }

  private requireNode(state: WorkflowState, nodeId: string): NodeOutcome {
    const outcome = state.nodes[nodeId];
    if (!outcome) throw new Error(`Unknown node "${nodeId}" in state "${state.id}".`);
    return outcome;
  }
}
