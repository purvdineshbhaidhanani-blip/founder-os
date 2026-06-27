import type { Timestamp } from "../../types/common.js";
import type { AgentDescriptor } from "../agents/types.js";
import type { RuntimeEvent } from "../events/types.js";
import type { TaskRecord } from "../queue/types.js";
import type { WorkflowState } from "../workflow/types.js";

export interface DashboardSnapshot {
  takenAt: Timestamp;
  activeWorkflows: WorkflowState[];
  queued: TaskRecord[];
  running: TaskRecord[];
  completed: TaskRecord[];
  failed: TaskRecord[];
  deadLetter: TaskRecord[];
  runningAgents: AgentDescriptor[];
  metrics: RuntimeMetrics;
}

export interface RuntimeMetrics {
  totalEvents: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  workflowsByStatus: Record<string, number>;
  agentsByStatus: Record<string, number>;
  taskSuccessRate: number;
  meanTaskDurationMs: number;
}

export interface ExecutionHistoryEntry {
  event: RuntimeEvent;
}
