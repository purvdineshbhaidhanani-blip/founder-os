import { InProcessScheduler, type ScheduleHandle, type ScheduleSpec, type Scheduler } from "@platform/shared";
import { WorkflowEngine } from "./engine.js";
import type { WorkflowContext, WorkflowDefinition, WorkflowRunResult } from "./types.js";

export interface WorkflowSchedulerOptions {
  scheduler?: Scheduler;
  engine?: WorkflowEngine;
  onRunComplete?: (definitionId: string, result: WorkflowRunResult) => void;
  onRunError?: (definitionId: string, error: unknown) => void;
}

/**
 * Binds `WorkflowDefinition`s to a `Scheduler` so they run on a cron
 * expression, a fixed interval, or a one-off date. Depends only on the
 * `Scheduler` interface — swap `InProcessScheduler` for a distributed
 * implementation without touching this class.
 */
export class WorkflowScheduler {
  private readonly scheduler: Scheduler;
  private readonly engine: WorkflowEngine;

  constructor(private readonly options: WorkflowSchedulerOptions = {}) {
    this.scheduler = options.scheduler ?? new InProcessScheduler();
    this.engine = options.engine ?? new WorkflowEngine();
  }

  schedule<TContext extends WorkflowContext = WorkflowContext>(
    definition: WorkflowDefinition<TContext>,
    spec: ScheduleSpec,
  ): ScheduleHandle {
    return this.scheduler.schedule(spec, async () => {
      try {
        const result = await this.engine.run(definition);
        this.options.onRunComplete?.(definition.id, result);
      } catch (error) {
        this.options.onRunError?.(definition.id, error);
      }
    });
  }

  cancel(handleId: string): void {
    this.scheduler.cancel(handleId);
  }

  list(): ScheduleHandle[] {
    return this.scheduler.list();
  }
}
