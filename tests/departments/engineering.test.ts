import { describe, expect, it } from "vitest";
import { validateBlueprint } from "../../src/blueprint/validate.js";
import {
  ENGINEERING_DEPARTMENT,
  buildDepartmentBlueprint,
  loadEngineeringDepartment,
} from "../../src/departments/index.js";
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

describe("Engineering Department", () => {
  it("defines 37 unique agents", () => {
    expect(ENGINEERING_DEPARTMENT).toHaveLength(37);
    const names = new Set(ENGINEERING_DEPARTMENT.map((spec) => spec.name));
    expect(names.size).toBe(37);
  });

  it("every spec builds a schema- and semantics-valid blueprint", () => {
    for (const spec of ENGINEERING_DEPARTMENT) {
      const result = validateBlueprint(buildDepartmentBlueprint(spec));
      expect(result.ok, `${spec.name} produced an invalid blueprint`).toBe(true);
    }
  });

  it("never lists itself as a collaborator", () => {
    for (const spec of ENGINEERING_DEPARTMENT) {
      const bp = buildDepartmentBlueprint(spec);
      expect(bp.communicationProtocol.collaboratesWith).not.toContain(spec.name);
    }
  });

  it("encodes runtime collaboration in every communication protocol", () => {
    const bp = buildDepartmentBlueprint(ENGINEERING_DEPARTMENT[5]!);
    expect(bp.communicationProtocol.inputFormat).toMatch(/task queue/i);
    expect(bp.communicationProtocol.outputFormat).toMatch(/Artifact Manager/);
    expect(bp.communicationProtocol.escalationPath).toMatch(/Event Bus|Approval System/);
  });

  it("wires the whole department into the runtime in one call", () => {
    const events = new EventBus();
    const runtime = new AgentRuntime({ bus: events });
    const descriptors = loadEngineeringDepartment(runtime);
    expect(descriptors).toHaveLength(37);
    expect(runtime.list().every((agent) => agent.status === "active")).toBe(true);
    // Registration/activation emit events on the shared bus.
    expect(events.history({ name: "agent.registered" })).toHaveLength(37);
  });

  it("lets the Master Orchestrator plan across the department", async () => {
    const events = new EventBus();
    const runtime = new AgentRuntime({ bus: events });
    loadEngineeringDepartment(runtime);

    const orchestrator = new MasterOrchestrator({
      memory: new MemoryEngine(),
      events,
      queue: new TaskQueue(),
      workflowEngine: new WorkflowEngine(),
      agents: runtime,
      artifacts: new ArtifactManager({ storage: new StubStorage(), bus: events }),
    });

    const plan = await orchestrator.receive({ goal: "ship the billing service" });
    // Default planner walks planning → engineering → qa → review → documentation,
    // each of which the department staffs.
    expect(plan.subtasks.length).toBeGreaterThanOrEqual(5);
    const assigned = new Set(plan.subtasks.map((subtask) => subtask.assignedAgent));
    expect(assigned.size).toBe(plan.subtasks.length);
  });

  it("supports capability discovery for orchestrator routing", () => {
    const runtime = new AgentRuntime();
    loadEngineeringDepartment(runtime);
    expect(runtime.findByCapability("migrations").map((d) => d.name)).toContain("database-engineer");
    expect(runtime.discover({ category: "devops", status: "active" }).length).toBeGreaterThanOrEqual(6);
  });
});
