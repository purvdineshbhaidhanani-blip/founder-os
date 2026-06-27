import type { Timestamp } from "../../types/common.js";
import type { Artifact } from "../artifacts/types.js";
import type { TaskRecord } from "../queue/types.js";
import type { WorkflowState } from "../workflow/types.js";

export interface FounderRequest {
  id?: string;
  goal: string;
  constraints?: string[];
  /** Optional explicit category preferences for the planner. */
  preferredCategories?: string[];
}

export interface PlannedSubtask {
  id: string;
  title: string;
  description: string;
  assignedAgent: string;
  dependsOn: string[];
  priority?: number;
  payload?: unknown;
}

export interface ExecutionPlan {
  id: string;
  requestId: string;
  goal: string;
  workflowStateId: string;
  subtasks: PlannedSubtask[];
  createdAt: Timestamp;
}

export interface PlanProgress {
  planId: string;
  workflow: WorkflowState;
  tasks: TaskRecord[];
  artifacts: Artifact[];
  /** 0..1; ratio of succeeded subtasks. */
  completion: number;
}

export interface FinalReport {
  planId: string;
  goal: string;
  status: "completed" | "failed" | "rolled-back";
  startedAt: Timestamp;
  endedAt: Timestamp;
  succeededSubtasks: PlannedSubtask[];
  failedSubtasks: PlannedSubtask[];
  artifacts: Artifact[];
  notes?: string;
}
