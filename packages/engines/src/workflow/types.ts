import type { RetryPolicy } from "@platform/shared";

export type WorkflowContext = Record<string, unknown>;

export type StepStatus = "pending" | "skipped" | "succeeded" | "failed";

export interface StepDefinition<TContext extends WorkflowContext = WorkflowContext> {
  id: string;
  name?: string;
  /** Ids of steps that must have `succeeded` before this one is eligible to run. */
  dependsOn?: string[];
  /** Skips the step (marked `skipped`) when this returns false. Defaults to always-run. */
  condition?: (context: TContext) => boolean | Promise<boolean>;
  /** The unit of work. Return value is merged into context under `results[step.id]`. */
  run: (context: TContext) => Promise<unknown> | unknown;
  retry?: RetryPolicy;
}

export interface WorkflowDefinition<TContext extends WorkflowContext = WorkflowContext> {
  id: string;
  name: string;
  steps: StepDefinition<TContext>[];
  initialContext?: TContext;
}

export interface StepOutcome {
  stepId: string;
  status: StepStatus;
  result?: unknown;
  error?: { message: string };
  attempts: number;
  startedAt?: string;
  completedAt?: string;
}

export type WorkflowRunStatus = "completed" | "failed";

export interface WorkflowRunResult<TContext extends WorkflowContext = WorkflowContext> {
  workflowId: string;
  status: WorkflowRunStatus;
  context: TContext;
  steps: StepOutcome[];
  startedAt: string;
  completedAt: string;
}
