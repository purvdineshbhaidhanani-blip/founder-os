import { describe, expect, it } from "vitest";
import { engineeringTemplate } from "../../src/templates/engineering.js";
import { planningTemplate } from "../../src/templates/planning.js";
import { documentationTemplate } from "../../src/templates/documentation.js";
import {
  AgentRuntime,
  ArtifactManager,
  EventBus,
  MasterOrchestrator,
  MemoryEngine,
  TaskQueue,
  WorkflowEngine,
} from "../../src/runtime/index.js";

class StubStorage {
  store = new Map<string, string>();
  async write(p: string, c: string) {
    this.store.set(p, c);
  }
  async read(p: string) {
    return this.store.get(p) ?? "";
  }
  async exists(p: string) {
    return this.store.has(p);
  }
}

function bootstrap() {
  const memory = new MemoryEngine();
  const events = new EventBus();
  const queue = new TaskQueue();
  const workflowEngine = new WorkflowEngine();
  const agents = new AgentRuntime({ bus: events });
  const artifacts = new ArtifactManager({ storage: new StubStorage(), bus: events });
  const orchestrator = new MasterOrchestrator({
    memory,
    events,
    queue,
    workflowEngine,
    agents,
    artifacts,
  });

  for (const template of [planningTemplate, engineeringTemplate, documentationTemplate]) {
    const blueprint = template.build({
      name: `${template.category}-1`,
      displayName: `${template.category}-1`,
      owner: "platform-team",
    });
    agents.register(blueprint);
    agents.activate(blueprint.identity.name);
  }

  return { memory, events, queue, workflowEngine, agents, artifacts, orchestrator };
}

describe("MasterOrchestrator", () => {
  it("plans a goal into subtasks across active agents", async () => {
    const { orchestrator } = bootstrap();
    const plan = await orchestrator.receive({ goal: "ship feature X" });
    expect(plan.subtasks.length).toBeGreaterThanOrEqual(2);
    expect(plan.subtasks[0]?.dependsOn).toEqual([]);
  });

  it("monitors progress as subtasks complete", async () => {
    const { orchestrator } = bootstrap();
    const plan = await orchestrator.receive({ goal: "ship feature Y" });
    for (const subtask of plan.subtasks) {
      await orchestrator.recordSubtaskResult(plan.id, subtask.id, { ok: true, result: "done" });
    }
    const progress = orchestrator.monitor(plan.id);
    expect(progress.completion).toBe(1);
    const report = orchestrator.report(plan.id);
    expect(report.status).toBe("completed");
    expect(report.succeededSubtasks).toHaveLength(plan.subtasks.length);
  });

  it("re-enqueues dead-lettered subtasks on retry", async () => {
    const { orchestrator, queue } = bootstrap();
    const plan = await orchestrator.receive({ goal: "ship feature Z" });
    const first = plan.subtasks[0]!;
    queue.dequeue();
    queue.fail(first.id, { message: "boom" });
    const retries = orchestrator.retryFailures(plan.id);
    expect(retries.length).toBeGreaterThan(0);
  });
});
