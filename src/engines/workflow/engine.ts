import { withRetry, DEFAULT_RETRY_POLICY } from "../shared/retry.js";
import type {
  StepDefinition,
  StepOutcome,
  StepStatus,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowRunResult,
} from "./types.js";

export interface WorkflowEngineOptions {
  onStepStart?: (stepId: string) => void;
  onStepComplete?: (outcome: StepOutcome) => void;
}

/**
 * Executes a `WorkflowDefinition` as a DAG: steps run once every entry in
 * `dependsOn` has succeeded, conditions gate whether a step runs at all, and
 * a failed/skipped dependency cascades a `skipped` status downstream instead
 * of silently running steps out of order.
 */
export class WorkflowEngine {
  async run<TContext extends WorkflowContext = WorkflowContext>(
    definition: WorkflowDefinition<TContext>,
    options: WorkflowEngineOptions = {},
  ): Promise<WorkflowRunResult<TContext>> {
    const startedAt = new Date().toISOString();
    const context = { ...(definition.initialContext ?? ({} as TContext)) };
    const results = ((context as WorkflowContext).results ?? {}) as Record<string, unknown>;
    (context as WorkflowContext).results = results;

    const statuses = new Map<string, StepStatus>(definition.steps.map((s) => [s.id, "pending"]));
    const outcomes = new Map<string, StepOutcome>();

    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const step of definition.steps) {
        if (statuses.get(step.id) !== "pending") continue;
        const deps = step.dependsOn ?? [];
        const depStatuses = deps.map((id) => statuses.get(id));
        if (depStatuses.some((s) => s === undefined || s === "pending")) continue;

        progressed = true;
        if (depStatuses.some((s) => s === "failed" || s === "skipped")) {
          statuses.set(step.id, "skipped");
          const outcome: StepOutcome = { stepId: step.id, status: "skipped", attempts: 0 };
          outcomes.set(step.id, outcome);
          options.onStepComplete?.(outcome);
          continue;
        }

        options.onStepStart?.(step.id);
        const outcome = await this.runStep(step, context as TContext);
        statuses.set(step.id, outcome.status);
        outcomes.set(step.id, outcome);
        if (outcome.status === "succeeded") results[step.id] = outcome.result;
        options.onStepComplete?.(outcome);
      }
    }

    for (const step of definition.steps) {
      if (statuses.get(step.id) === "pending") {
        const outcome: StepOutcome = {
          stepId: step.id,
          status: "skipped",
          attempts: 0,
          error: { message: "Unresolved dependency (cycle or missing step id)." },
        };
        statuses.set(step.id, "skipped");
        outcomes.set(step.id, outcome);
      }
    }

    const steps = definition.steps.map((s) => outcomes.get(s.id)!);
    const status = steps.some((s) => s.status === "failed") ? "failed" : "completed";

    return {
      workflowId: definition.id,
      status,
      context: context as TContext,
      steps,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  private async runStep<TContext extends WorkflowContext>(
    step: StepDefinition<TContext>,
    context: TContext,
  ): Promise<StepOutcome> {
    const startedAt = new Date().toISOString();
    if (step.condition && !(await step.condition(context))) {
      return { stepId: step.id, status: "skipped", attempts: 0, startedAt, completedAt: new Date().toISOString() };
    }

    let attempts = 0;
    try {
      const result = await withRetry(
        async (attempt) => {
          attempts = attempt;
          return step.run(context);
        },
        step.retry ?? { ...DEFAULT_RETRY_POLICY, maxAttempts: 1 },
      );
      return {
        stepId: step.id,
        status: "succeeded",
        result,
        attempts,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        stepId: step.id,
        status: "failed",
        attempts,
        error: { message: error instanceof Error ? error.message : String(error) },
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }
  }
}
