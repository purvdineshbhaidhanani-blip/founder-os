import { describe, expect, it } from "vitest";
import { WorkflowEngine } from "../../src/runtime/workflow/index.js";

describe("WorkflowEngine", () => {
  it("starts a DAG and marks roots ready", () => {
    const engine = new WorkflowEngine();
    engine.define({
      id: "wf",
      name: "demo",
      nodes: [
        { id: "a", kind: "step" },
        { id: "b", kind: "step", dependsOn: ["a"] },
        { id: "c", kind: "step", dependsOn: ["a"] },
        { id: "d", kind: "step", dependsOn: ["b", "c"] },
      ],
    });
    const state = engine.start("wf");
    expect(engine.readyNodes(state.id)).toEqual(["a"]);
  });

  it("walks the graph until completion", () => {
    const engine = new WorkflowEngine();
    engine.define({
      id: "wf",
      name: "demo",
      nodes: [
        { id: "a", kind: "step" },
        { id: "b", kind: "step", dependsOn: ["a"] },
      ],
    });
    const state = engine.start("wf");
    engine.completeNode(state.id, "a", { status: "succeeded" });
    engine.completeNode(state.id, "b", { status: "succeeded" });
    expect(state.status).toBe("completed");
  });

  it("skips non-selected branches", () => {
    const engine = new WorkflowEngine();
    engine.define({
      id: "wf",
      name: "branchy",
      nodes: [
        { id: "decide", kind: "branch", branch: (ctx) => ctx.go as string },
        { id: "left", kind: "step", dependsOn: ["decide"] },
        { id: "right", kind: "step", dependsOn: ["decide"] },
      ],
    });
    const state = engine.start("wf", { go: "right" });
    engine.completeNode(state.id, "decide", { status: "succeeded" });
    expect(state.nodes.left?.status).toBe("skipped");
    expect(state.nodes.right?.status).toBe("ready");
  });

  it("supports checkpoint and rollback", () => {
    const engine = new WorkflowEngine();
    engine.define({
      id: "wf",
      name: "demo",
      nodes: [
        { id: "a", kind: "step" },
        { id: "b", kind: "step", dependsOn: ["a"] },
      ],
    });
    const state = engine.start("wf");
    engine.completeNode(state.id, "a", { status: "succeeded", contextUpdate: { x: 1 } });
    const cp = engine.checkpoint(state.id, "after-a");
    engine.completeNode(state.id, "b", { status: "succeeded", contextUpdate: { x: 2 } });
    engine.rollback(state.id, cp.id);
    const after = engine.getState(state.id)!;
    expect(after.context.x).toBe(1);
    expect(after.nodes.b?.status).toBe("ready");
  });

  it("rejects cycles", () => {
    const engine = new WorkflowEngine();
    expect(() =>
      engine.define({
        id: "bad",
        name: "cycle",
        nodes: [
          { id: "a", kind: "step", dependsOn: ["b"] },
          { id: "b", kind: "step", dependsOn: ["a"] },
        ],
      }),
    ).toThrow(/cycle/i);
  });
});
