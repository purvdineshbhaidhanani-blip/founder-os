import type { Timestamp } from "../../types/common.js";

export type WorkflowStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "rolled-back";

export type NodeStatus = "pending" | "ready" | "running" | "succeeded" | "failed" | "skipped";

export interface WorkflowNode {
  id: string;
  kind: string;
  /** Node payload — the orchestrator/execution engine decides how to interpret it. */
  payload?: unknown;
  /** Node ids this node depends on (must be `succeeded` before this can run). */
  dependsOn?: string[];
  /**
   * Optional branch selector. If returns a string, only the matching successor
   * is followed (others are marked `skipped`). If returns null/undefined, all
   * successors run normally — the default "merge" semantics.
   */
  branch?: (context: WorkflowContext) => string | null | undefined;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  /** Optional initial context seeded into the first state. */
  initialContext?: WorkflowContext;
}

export type WorkflowContext = Record<string, unknown>;

export interface NodeOutcome {
  nodeId: string;
  status: NodeStatus;
  result?: unknown;
  error?: { message: string; code?: string };
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface Checkpoint {
  id: string;
  workflowStateId: string;
  createdAt: Timestamp;
  nodes: Record<string, NodeOutcome>;
  context: WorkflowContext;
  label?: string;
}

export interface WorkflowState {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  context: WorkflowContext;
  nodes: Record<string, NodeOutcome>;
  checkpoints: Checkpoint[];
  startedAt: Timestamp;
  updatedAt: Timestamp;
}
