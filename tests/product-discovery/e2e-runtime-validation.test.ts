import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { AgentRuntime } from "../../src/runtime/agents/runtime.js";
import { EventBus } from "../../src/runtime/events/bus.js";
import { TaskQueue } from "../../src/runtime/queue/queue.js";
import { WorkflowEngine } from "../../src/runtime/workflow/engine.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import type { WorkflowNode } from "../../src/runtime/workflow/types.js";
import { loadProductDiscoveryDepartment, PRODUCT_DISCOVERY_DEPARTMENT_AGENTS } from "../../src/departments/index.js";

const IDEA_SLUG = "ai-expense-tracker-for-students";
const ARTIFACT_ROOT = path.join(process.cwd(), "artifacts", "product-discovery", IDEA_SLUG);
const RAW_DIR = path.join(ARTIFACT_ROOT, "raw");

const PIPELINE_ORDER = [
  "idea-validator",
  "problem-discovery-agent",
  "target-audience-agent",
  "market-research-agent",
  "competitor-intelligence-agent",
  "trend-intelligence-agent",
  "user-research-agent",
  "opportunity-discovery-agent",
  "pricing-strategy-agent",
  "business-model-agent",
  "product-strategy-agent",
  "feature-planning-agent",
  "mvp-planning-agent",
  "user-story-generator",
  "success-metrics-agent",
  "product-discovery-report-generator",
];

describe("Loop 2 validation: Product Discovery Department end-to-end on real runtime", () => {
  it("executes all 16 agents through AgentRuntime/WorkflowEngine/TaskQueue/ArtifactManager/MemoryEngine using real captured research output", async () => {
    const events = new EventBus();
    const runtime = new AgentRuntime({ bus: events });
    const queue = new TaskQueue();
    const workflow = new WorkflowEngine();
    const memory = new MemoryEngine();
    const artifacts = new ArtifactManager({ bus: events });

    const descriptors = loadProductDiscoveryDepartment(runtime);
    expect(descriptors).toHaveLength(16);
    for (const name of PRODUCT_DISCOVERY_DEPARTMENT_AGENTS) {
      expect(runtime.get(name)?.status).toBe("active");
    }

    const nodes: WorkflowNode[] = PIPELINE_ORDER.map((agent, i) => ({
      id: agent,
      kind: "product-discovery-stage",
      dependsOn: i === 0 ? [] : [PIPELINE_ORDER[i - 1]!],
    }));
    workflow.define({ id: "pd-e2e-test", name: "E2E test workflow", nodes });
    const wfState = workflow.start("pd-e2e-test");

    for (let i = 0; i < PIPELINE_ORDER.length; i++) {
      const agentName = PIPELINE_ORDER[i]!;
      const sourceFile =
        agentName === "product-discovery-report-generator"
          ? path.join(ARTIFACT_ROOT, "PRODUCT_DISCOVERY_PACKAGE.json")
          : path.join(RAW_DIR, `${agentName}.json`);
      const payload = JSON.parse(await readFile(sourceFile, "utf-8"));

      const task = queue.enqueue({ id: `test-task-${agentName}`, kind: "product-discovery-stage", payload: {} });
      queue.dequeue();
      workflow.markRunning(wfState.id, agentName);

      const artifact = await artifacts.register({
        name: `${agentName}-output`,
        kind: "report",
        owner: agentName,
        content: JSON.stringify(payload),
        metadata: { tags: [IDEA_SLUG] },
      });
      await memory.remember("agent", agentName, { output: payload, artifactId: artifact.id }, { tags: [IDEA_SLUG] });
      queue.complete(task.id, { artifactId: artifact.id });
      workflow.completeNode(wfState.id, agentName, { status: "succeeded", result: { artifactId: artifact.id } });
    }

    const finalState = workflow.getState(wfState.id)!;
    expect(finalState.status).toBe("completed");
    expect(Object.values(finalState.nodes).filter((n) => n.status === "succeeded")).toHaveLength(16);

    expect(artifacts.list({ tag: IDEA_SLUG })).toHaveLength(16);
    expect(await memory.recall({ namespace: "agent", tag: IDEA_SLUG })).toHaveLength(16);
    expect(queue.list({ kind: "product-discovery-stage", status: "succeeded" })).toHaveLength(16);

    const finalPackageEntry = (await memory.recall({ namespace: "agent", key: "product-discovery-report-generator" }))[0];
    const finalPackage = (finalPackageEntry?.data as { output?: { overallConfidence?: number } })?.output;
    expect(finalPackage?.overallConfidence).toBeLessThan(0.5);
  });

  it("final package overallConfidence is lower than every individual upstream confidence (compounds uncertainty, doesn't average it away)", async () => {
    const raw = await readFile(path.join(ARTIFACT_ROOT, "PRODUCT_DISCOVERY_PACKAGE.json"), "utf-8");
    const finalPackage = JSON.parse(raw);
    expect(finalPackage.overallConfidence).toBeLessThanOrEqual(0.48);
  });

  it("final package risk report preserves the anxiety-avoidance contradiction found by user-research-agent", async () => {
    const raw = await readFile(path.join(ARTIFACT_ROOT, "PRODUCT_DISCOVERY_PACKAGE.json"), "utf-8");
    const finalPackage = JSON.parse(raw);
    const riskText = JSON.stringify(finalPackage.riskReport).toLowerCase();
    expect(riskText).toContain("anxiety");
  });
});
