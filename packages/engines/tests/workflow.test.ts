import { describe, expect, it } from "vitest";
import {
  BackgroundWorkflowRunner,
  WorkflowEngine,
  type WorkflowDefinition,
} from "../src/workflow/index.js";

describe("Workflow Engine", () => {
  it("runs steps in dependency order and merges results into context", async () => {
    const engine = new WorkflowEngine();
    const order: string[] = [];
    const definition: WorkflowDefinition = {
      id: "wf-1",
      name: "test",
      steps: [
        { id: "a", run: () => (order.push("a"), 1) },
        { id: "b", dependsOn: ["a"], run: (ctx) => (order.push("b"), (ctx.results as Record<string, unknown>).a) },
      ],
    };
    const result = await engine.run(definition);
    expect(order).toEqual(["a", "b"]);
    expect(result.status).toBe("completed");
    expect(result.steps.find((s) => s.stepId === "b")!.result).toBe(1);
  });

  it("cascades skip to steps depending on a failed step", async () => {
    const engine = new WorkflowEngine();
    const definition: WorkflowDefinition = {
      id: "wf-2",
      name: "test",
      steps: [
        {
          id: "a",
          run: () => {
            throw new Error("nope");
          },
        },
        { id: "b", dependsOn: ["a"], run: () => "unreachable" },
      ],
    };
    const result = await engine.run(definition);
    expect(result.status).toBe("failed");
    expect(result.steps.find((s) => s.stepId === "a")!.status).toBe("failed");
    expect(result.steps.find((s) => s.stepId === "b")!.status).toBe("skipped");
  });

  it("retries a step per its retry policy before failing", async () => {
    const engine = new WorkflowEngine();
    let attempts = 0;
    const definition: WorkflowDefinition = {
      id: "wf-3",
      name: "test",
      steps: [
        {
          id: "flaky",
          retry: { maxAttempts: 3, baseDelayMs: 1 },
          run: () => {
            attempts += 1;
            if (attempts < 3) throw new Error("retry me");
            return "ok";
          },
        },
      ],
    };
    const result = await engine.run(definition);
    expect(attempts).toBe(3);
    expect(result.status).toBe("completed");
  });

  it("skips a step whose condition returns false", async () => {
    const engine = new WorkflowEngine();
    const definition: WorkflowDefinition = {
      id: "wf-4",
      name: "test",
      steps: [{ id: "a", condition: () => false, run: () => "should not run" }],
    };
    const result = await engine.run(definition);
    expect(result.steps[0]!.status).toBe("skipped");
  });

  it("BackgroundWorkflowRunner returns a handle immediately and resolves later", async () => {
    const runner = new BackgroundWorkflowRunner();
    const definition: WorkflowDefinition = {
      id: "wf-5",
      name: "test",
      steps: [{ id: "a", run: async () => "done" }],
    };
    const handle = runner.start(definition);
    expect(handle.status).toBe("running");
    const result = await handle.completion;
    expect(result.status).toBe("completed");
    expect(handle.status).toBe("completed");
  });
});
