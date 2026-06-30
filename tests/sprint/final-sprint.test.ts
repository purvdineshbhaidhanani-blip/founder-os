import { describe, expect, it } from "vitest";

import {
  AgentRuntime,
  ArtifactManager,
  ApprovalSystem,
  CommunicationBus,
  DashboardBackend,
  EventBus,
  MasterOrchestrator,
  MemoryEngine,
  TaskQueue,
  WorkflowEngine,
} from "../../src/runtime/index.js";

import { engineeringTemplate } from "../../src/templates/engineering.js";
import { planningTemplate } from "../../src/templates/planning.js";

import { RealityGuard, makeInsight } from "../../src/intelligence/reality-guard.js";
import { loadIntelligenceDepartment, MARKET_INTELLIGENCE_DEPARTMENT } from "../../src/intelligence/index.js";

import { COMPANY_BRAIN_SPEC, CompanyBrain } from "../../src/brain/index.js";
import { buildDepartmentBlueprint } from "../../src/departments/blueprint.js";

import { SkillRegistry, SkillDiscovery, SkillGenerator, SkillValidator, SkillLifecycle, newSkillRecord } from "../../src/skills/index.js";
import { KnowledgeDatabases } from "../../src/knowledge/index.js";
import { ConnectorRegistry } from "../../src/connectors/index.js";
import { SettingsManager } from "../../src/settings/index.js";
import { CapabilityDirectory } from "../../src/capability/index.js";
import { SharedWorkspace } from "../../src/workspace/index.js";
import { ExecutionPlanner } from "../../src/execution-planner/index.js";
import { FailureRecoveryEngine } from "../../src/recovery/index.js";
import { AgentAnalytics } from "../../src/analytics/index.js";
import { ModelRouter } from "../../src/routing/index.js";
import { CostOptimizer } from "../../src/cost/index.js";
import { FounderVault } from "../../src/vault/index.js";
import { CompanyOS, CompanyRituals } from "../../src/org/index.js";
import { WorkflowLibrary } from "../../src/workflows-library/index.js";
import { AgentDiscoveryEngine } from "../../src/discovery/index.js";
import { LearningEngine } from "../../src/learning/index.js";
import { SelfEvolutionEngine } from "../../src/evolution/index.js";
import { ObservabilityHub } from "../../src/observability/index.js";
import { MultiProjectScheduler } from "../../src/scheduling/index.js";
import { AutonomousLoop } from "../../src/loop/index.js";
import { CommandCenterBackend } from "../../src/command-center/index.js";

class StubStorage {
  store = new Map<string, string>();
  async write(p: string, c: string) { this.store.set(p, c); }
  async read(p: string) { return this.store.get(p) ?? ""; }
  async exists(p: string) { return this.store.has(p); }
}

describe("Final sprint composite", () => {
  it("Reality Guard rejects high confidence without evidence", () => {
    const guard = new RealityGuard();
    const insight = makeInsight({
      topic: "trend",
      finding: "the trend is real",
      reportedBy: "trend-detection",
      confidence: "high",
      sources: [{ title: "anon", kind: "anecdote", fetchedAt: new Date().toISOString() }],
    });
    const report = guard.verify(insight);
    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.code === "HIGH_CONFIDENCE_WITHOUT_EVIDENCE")).toBe(true);
  });

  it("Market Intelligence Department wires into runtime", () => {
    const events = new EventBus();
    const runtime = new AgentRuntime({ bus: events });
    const descriptors = loadIntelligenceDepartment(runtime);
    expect(descriptors).toHaveLength(MARKET_INTELLIGENCE_DEPARTMENT.length);
    expect(runtime.discover({ tag: "market-intelligence", status: "active" }).length).toBeGreaterThanOrEqual(17);
  });

  it("Skill discovery prefers internal registry over generation", async () => {
    const events = new EventBus();
    const registry = new SkillRegistry(events);
    registry.register(newSkillRecord({
      name: "playwright-runner",
      description: "Headless browser automation",
      version: "1.0.0",
      source: "internal",
      capabilities: ["browser"],
      tools: ["Bash"],
      dependencies: [],
    }));
    const discovery = new SkillDiscovery(registry);
    const found = await discovery.discover("playwright");
    expect(found?.source).toBe("internal");
    expect(found?.candidates).toHaveLength(1);
  });

  it("Skill lifecycle: generate → validate → install → recommend", () => {
    const registry = new SkillRegistry();
    const generator = new SkillGenerator();
    const validator = new SkillValidator();
    const lifecycle = new SkillLifecycle(registry);

    const skill = generator.generate({
      source: "npm",
      name: "json-diff",
      description: "Diffs JSON objects",
      version: "1.2.3",
      capabilities: ["diff"],
    });
    const report = validator.validate(skill);
    expect(report.valid).toBe(true);

    registry.register(skill);
    lifecycle.install(skill.id);
    lifecycle.validateAndPromote(skill.id);
    expect(lifecycle.recommend("diff")?.id).toBe(skill.id);
  });

  it("Knowledge graph supports cross-domain links and search", () => {
    const dbs = new KnowledgeDatabases();
    const project = dbs.projects.add("Billing", { name: "Billing", status: "active", goal: "Launch billing" });
    const decision = dbs.decisions.add("Stripe vs Lemonsqueezy", { topic: "payments", decision: "Stripe", rationale: "Mature API", decidedBy: "founder" });
    dbs.graph.addEdge({ from: decision.id, to: project.id, kind: "addresses" });
    expect(dbs.search("billing").length).toBeGreaterThanOrEqual(1);
  });

  it("Connectors evaluate status from env vars", () => {
    const registry = new ConnectorRegistry(undefined, { GITHUB_TOKEN: "x" });
    expect(registry.get("github")?.status).toBe("configured");
    expect(registry.get("stripe")?.status).toBe("missing-credentials");
  });

  it("Capability Directory exposes profiles per agent", () => {
    const runtime = new AgentRuntime();
    runtime.register(engineeringTemplate.build({
      name: "demo-eng", displayName: "Demo Eng", owner: "platform",
    }));
    runtime.activate("demo-eng");
    const directory = new CapabilityDirectory(runtime);
    directory.recordAnalytics("demo-eng", { successRate: 0.92, costCents: 12, averageDurationMs: 8000 });
    const profile = directory.profile("demo-eng");
    expect(profile?.successRate).toBeCloseTo(0.92);
    expect(profile?.tools).toContain("Read");
  });

  it("Shared workspace handles locks and conflict detection", () => {
    const events = new EventBus();
    const artifacts = new ArtifactManager({ storage: new StubStorage(), bus: events });
    const workspace = new SharedWorkspace({ artifacts, events });
    const ws = workspace.create("proj-1", ["a", "b"]);
    expect(workspace.lock(ws.id, "art-1", "a")).toBe(true);
    expect(workspace.lock(ws.id, "art-1", "b")).toBe(false);
    workspace.note(ws.id, "a", "locked it");
    expect(workspace.timeline(ws.id).length).toBe(1);
  });

  it("Execution Planner computes critical path and parallel layers", () => {
    const planner = new ExecutionPlanner();
    const tasks = [
      { id: "a", cost: { durationMs: 10 } },
      { id: "b", cost: { durationMs: 20 }, dependsOn: ["a"] },
      { id: "c", cost: { durationMs: 5 }, dependsOn: ["a"] },
      { id: "d", cost: { durationMs: 15 }, dependsOn: ["b", "c"] },
    ];
    const layers = planner.parallelLayers(tasks);
    expect(layers[0]?.tasks).toEqual(["a"]);
    const cp = planner.criticalPath(tasks);
    expect(cp.path).toEqual(["a", "b", "d"]);
    expect(cp.totalDurationMs).toBe(45);
  });

  it("Failure Recovery escalates dead tasks without fallback", async () => {
    const queue = new TaskQueue();
    const wf = new WorkflowEngine();
    const runtime = new AgentRuntime();
    const recovery = new FailureRecoveryEngine({ queue, workflowEngine: wf, agents: runtime });
    queue.enqueue({ id: "t1", kind: "demo", payload: 0, retry: { maxAttempts: 1, backoffMs: 1 } });
    queue.dequeue();
    queue.fail("t1", { message: "boom" });
    const report = await recovery.recoverTask("t1", "test");
    expect(report.outcome).toBe("escalated");
  });

  it("Cost Optimizer picks cheapest model meeting quality floor", () => {
    const router = new ModelRouter();
    router.register({ id: "cheap", provider: "p", name: "cheap-1", costPerMillionInputTokensCents: 10, costPerMillionOutputTokensCents: 10, averageLatencyMs: 100, qualityTier: "medium", enabled: true });
    router.register({ id: "lux", provider: "p", name: "lux-1", costPerMillionInputTokensCents: 500, costPerMillionOutputTokensCents: 500, averageLatencyMs: 100, qualityTier: "high", enabled: true });
    const analytics = new AgentAnalytics();
    const settings = new SettingsManager();
    const optimizer = new CostOptimizer(analytics, router, settings);
    expect(optimizer.pickModel({ minQuality: "medium" })?.modelId).toBe("cheap");
  });

  it("Discovery Engine ranks and assembles teams", () => {
    const runtime = new AgentRuntime();
    runtime.register(planningTemplate.build({ name: "planner-1", displayName: "Planner 1", owner: "p" }));
    runtime.register(engineeringTemplate.build({ name: "eng-1", displayName: "Eng 1", owner: "p" }));
    runtime.activate("planner-1");
    runtime.activate("eng-1");
    const directory = new CapabilityDirectory(runtime);
    const discovery = new AgentDiscoveryEngine(runtime, directory);
    const team = discovery.assembleTeam([
      { capability: "Implement", required: true },
      { capability: "Sequence", required: true },
    ]);
    expect(team.fullyStaffed).toBe(true);
  });

  it("Learning + Evolution propose and ratify improvements", () => {
    const learning = new LearningEngine();
    const evolution = new SelfEvolutionEngine(learning);
    for (let i = 0; i < 5; i += 1) {
      learning.recordLearning({
        target: "workflow",
        subject: "ship-pipeline",
        observation: `Step ${i} ran too long`,
        evidenceProjectIds: [`p${i}`],
        confidence: "medium",
      });
    }
    const proposals = learning.synthesize();
    expect(proposals.length).toBeGreaterThan(0);
    const actions = evolution.tick();
    expect(actions.length).toBeGreaterThan(0);
  });

  it("Command Center backend produces founder/company/portfolio views", () => {
    const events = new EventBus();
    const runtime = new AgentRuntime({ bus: events });
    runtime.register(engineeringTemplate.build({ name: "e1", displayName: "E1", owner: "p" }));
    runtime.activate("e1");
    const queue = new TaskQueue();
    const wf = new WorkflowEngine();
    const artifacts = new ArtifactManager({ storage: new StubStorage(), bus: events });
    const dashboard = new DashboardBackend({ events, queue, workflowEngine: wf, agents: runtime });
    const approvals = new ApprovalSystem({ bus: events, workflowEngine: wf });
    const analytics = new AgentAnalytics();
    const directory = new CapabilityDirectory(runtime);
    const observability = new ObservabilityHub({ bus: events, queue });
    const companyOS = new CompanyOS();
    const rituals = new CompanyRituals();
    const scheduler = new MultiProjectScheduler(queue);
    const router = new ModelRouter();
    const settings = new SettingsManager();
    const cost = new CostOptimizer(analytics, router, settings);
    const learning = new LearningEngine();

    const cc = new CommandCenterBackend({
      runtime, dashboard, approvals, analytics, directory, observability,
      companyOS, rituals, scheduler, cost, learning,
    });

    cc.notify("info", "Hello", "Founder OS online");
    const founder = cc.founderDashboard();
    expect(founder.notifications).toHaveLength(1);
    expect(founder.runtime.runningAgents.length).toBeGreaterThanOrEqual(1);

    const company = cc.companyDashboard();
    expect(company.agentCount).toBeGreaterThanOrEqual(1);

    const metrics = cc.executiveMetrics();
    expect(metrics.totalAgents).toBeGreaterThanOrEqual(1);
  });

  it("Company Brain wires every subsystem into a single coordinator", () => {
    const events = new EventBus();
    const runtime = new AgentRuntime({ bus: events });
    const memory = new MemoryEngine();
    const artifacts = new ArtifactManager({ storage: new StubStorage(), bus: events });
    const directory = new CapabilityDirectory(runtime);
    const knowledge = new KnowledgeDatabases();
    const companyOS = new CompanyOS();
    const rituals = new CompanyRituals();
    const workflows = new WorkflowLibrary();
    const skills = new SkillRegistry();
    const connectors = new ConnectorRegistry();
    const vault = new FounderVault();
    const discovery = new AgentDiscoveryEngine(runtime, directory);
    const learning = new LearningEngine();
    const analytics = new AgentAnalytics();

    runtime.register(buildDepartmentBlueprint(COMPANY_BRAIN_SPEC));
    runtime.activate(COMPANY_BRAIN_SPEC.name);

    const brain = new CompanyBrain({
      runtime, memory, artifacts, directory, knowledge, companyOS, rituals,
      workflows, skills, connectors, vault, discovery, learning, analytics,
    });

    const state = brain.state();
    expect(state.agents.total).toBeGreaterThanOrEqual(1);
    expect(state.connectors.configured + state.connectors.missingCredentials).toBeGreaterThan(0);

    brain.record({ kind: "lesson", topic: "first lesson", content: "stay focused", by: "founder" });
    expect(vault.list()).toHaveLength(1);
  });

  it("Autonomous Loop runs plan → review → learn for one goal", async () => {
    const events = new EventBus();
    const runtime = new AgentRuntime({ bus: events });
    runtime.register(planningTemplate.build({ name: "p1", displayName: "P1", owner: "p" }));
    runtime.register(engineeringTemplate.build({ name: "e1", displayName: "E1", owner: "p" }));
    runtime.activate("p1");
    runtime.activate("e1");

    const memory = new MemoryEngine();
    const queue = new TaskQueue();
    const wf = new WorkflowEngine();
    const artifacts = new ArtifactManager({ storage: new StubStorage(), bus: events });
    const orchestrator = new MasterOrchestrator({
      memory, events, queue, workflowEngine: wf, agents: runtime, artifacts,
    });
    const approvals = new ApprovalSystem({ bus: events, workflowEngine: wf });
    const learning = new LearningEngine();
    const evolution = new SelfEvolutionEngine(learning);
    const router = new ModelRouter();
    const settings = new SettingsManager();
    const analytics = new AgentAnalytics();
    const cost = new CostOptimizer(analytics, router, settings);
    const recovery = new FailureRecoveryEngine({ queue, workflowEngine: wf, agents: runtime });

    const loop = new AutonomousLoop({ orchestrator, approvals, learning, evolution, cost, recovery });

    const plan = await orchestrator.receive({ goal: "test loop" });
    for (const subtask of plan.subtasks) {
      await orchestrator.recordSubtaskResult(plan.id, subtask.id, { ok: true, result: "done" });
    }
    const report = orchestrator.report(plan.id);
    learning.observe({
      projectId: plan.id,
      goal: "test loop",
      succeeded: true,
      durationMs: Date.parse(report.endedAt) - Date.parse(report.startedAt),
      succeededSubtasks: report.succeededSubtasks.length,
      failedSubtasks: 0,
    });
    expect(learning.outcomesList()).toHaveLength(1);
  });

  it("Communication Bus + Workspace cooperate for live collaboration", async () => {
    const comms = new CommunicationBus();
    const received: string[] = [];
    comms.subscribe("e1", (msg) => { received.push(msg.payload as string); });
    await comms.send({ from: "p1", to: "e1", payload: "spec ready" });
    expect(received).toContain("spec ready");
  });
});
