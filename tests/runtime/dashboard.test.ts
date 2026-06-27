import { describe, expect, it } from "vitest";
import {
  AgentRuntime,
  DashboardBackend,
  EventBus,
  TaskQueue,
  WorkflowEngine,
} from "../../src/runtime/index.js";
import { engineeringTemplate } from "../../src/templates/engineering.js";

describe("DashboardBackend", () => {
  it("produces a snapshot with task and agent stats", async () => {
    const events = new EventBus();
    const queue = new TaskQueue();
    const workflowEngine = new WorkflowEngine();
    const agents = new AgentRuntime({ bus: events });

    queue.enqueue({ id: "q1", kind: "demo", payload: 1 });
    queue.enqueue({ id: "q2", kind: "demo", payload: 2 });
    const running = queue.dequeue();
    queue.complete(running!.id, "ok");

    const blueprint = engineeringTemplate.build({
      name: "engineer-1",
      displayName: "Engineer 1",
      owner: "platform-team",
    });
    agents.register(blueprint);
    agents.activate("engineer-1");

    const dashboard = new DashboardBackend({ events, queue, workflowEngine, agents });
    const snapshot = dashboard.snapshot();
    expect(snapshot.queued.length).toBe(1);
    expect(snapshot.completed.length).toBe(1);
    expect(snapshot.runningAgents.length).toBe(1);
    expect(snapshot.metrics.totalTasks).toBe(2);
    expect(snapshot.metrics.taskSuccessRate).toBe(1);
  });
});
