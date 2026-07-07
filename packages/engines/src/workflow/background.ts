import { WorkflowEngine, type WorkflowEngineOptions } from "./engine.js";
import type { WorkflowContext, WorkflowDefinition, WorkflowRunResult } from "./types.js";

export type BackgroundRunStatus = "running" | "completed" | "failed";

export interface BackgroundRunHandle<TContext extends WorkflowContext = WorkflowContext> {
  runId: string;
  status: BackgroundRunStatus;
  result?: WorkflowRunResult<TContext>;
  error?: Error;
  /** Resolves once the run finishes, whatever the outcome. */
  completion: Promise<WorkflowRunResult<TContext>>;
}

/**
 * Runs workflows off the caller's await chain — the caller gets a handle back
 * immediately and can poll `status` or await `completion`. This is what lets
 * an API request kick off a long workflow and return a 202 instead of
 * blocking on it.
 */
export class BackgroundWorkflowRunner {
  private readonly handles = new Map<string, BackgroundRunHandle<WorkflowContext>>();
  private readonly engine: WorkflowEngine;
  private counter = 0;

  constructor(engine: WorkflowEngine = new WorkflowEngine()) {
    this.engine = engine;
  }

  private generateRunId(): string {
    this.counter += 1;
    return `run_${Date.now()}_${this.counter}`;
  }

  start<TContext extends WorkflowContext = WorkflowContext>(
    definition: WorkflowDefinition<TContext>,
    options?: WorkflowEngineOptions,
  ): BackgroundRunHandle<TContext> {
    const runId = this.generateRunId();
    const handle: BackgroundRunHandle<TContext> = {
      runId,
      status: "running",
      completion: undefined as unknown as Promise<WorkflowRunResult<TContext>>,
    };

    handle.completion = this.engine.run(definition, options).then(
      (result) => {
        handle.status = result.status === "failed" ? "failed" : "completed";
        handle.result = result;
        return result;
      },
      (error: unknown) => {
        handle.status = "failed";
        handle.error = error instanceof Error ? error : new Error(String(error));
        throw error;
      },
    );

    this.handles.set(runId, handle as unknown as BackgroundRunHandle<WorkflowContext>);
    return handle;
  }

  get<TContext extends WorkflowContext = WorkflowContext>(
    runId: string,
  ): BackgroundRunHandle<TContext> | undefined {
    return this.handles.get(runId) as BackgroundRunHandle<TContext> | undefined;
  }

  list(): BackgroundRunHandle<WorkflowContext>[] {
    return [...this.handles.values()];
  }
}
