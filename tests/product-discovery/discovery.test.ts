import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { AgentRuntime, EventBus } from "../../src/runtime/index.js";
import {
  PRODUCT_DISCOVERY_DEPARTMENT,
  loadProductDiscoveryDepartment,
  PRODUCT_DISCOVERY_DEPARTMENT_AGENTS,
} from "../../src/departments/index.js";
import { buildDepartmentBlueprint } from "../../src/departments/blueprint.js";
import { validateBlueprint } from "../../src/blueprint/validate.js";

const ROOT = "/home/user/founder-os";

describe("Product Discovery Department", () => {
  it("has exactly 16 agent specs", () => {
    expect(PRODUCT_DISCOVERY_DEPARTMENT).toHaveLength(16);
  });

  it("all specs produce valid blueprints", () => {
    for (const spec of PRODUCT_DISCOVERY_DEPARTMENT) {
      const blueprint = buildDepartmentBlueprint(spec);
      const result = validateBlueprint(blueprint);
      expect(result.ok, `${spec.name} blueprint failed`).toBe(true);
    }
  });

  it("all 16 agents have generated .claude/agents/ files", () => {
    for (const name of PRODUCT_DISCOVERY_DEPARTMENT_AGENTS) {
      const path = join(ROOT, ".claude", "agents", `${name}.md`);
      expect(existsSync(path), `Missing .claude/agents/${name}.md`).toBe(true);
    }
  });

  it("all 16 agents have per-agent folder structure", () => {
    const REQUIRED_FILES = [
      "README.md",
      "SYSTEM_PROMPT.md",
      "INPUT_SCHEMA.json",
      "OUTPUT_SCHEMA.json",
      "WORKFLOW.md",
      "MEMORY.md",
      "CHECKLIST.md",
      "VALIDATION.md",
      "CONFIG.json",
    ];
    for (const name of PRODUCT_DISCOVERY_DEPARTMENT_AGENTS) {
      for (const file of REQUIRED_FILES) {
        const path = join(ROOT, "agents", name, file);
        expect(existsSync(path), `Missing agents/${name}/${file}`).toBe(true);
      }
    }
  });

  it("Product Discovery department wires into runtime", () => {
    const bus = new EventBus();
    const runtime = new AgentRuntime({ bus });
    const descriptors = loadProductDiscoveryDepartment(runtime);
    expect(descriptors).toHaveLength(16);
    const active = runtime.discover({ tag: "product", status: "active" });
    expect(active.length).toBeGreaterThanOrEqual(16);
  });

  it("all agents are discoverable and active", () => {
    const runtime = new AgentRuntime();
    loadProductDiscoveryDepartment(runtime);
    for (const name of PRODUCT_DISCOVERY_DEPARTMENT_AGENTS) {
      const agent = runtime.get(name);
      expect(agent).toBeDefined();
      expect(agent!.status).toBe("active");
    }
  });

  it("research agents can contract outputs", () => {
    const runtime = new AgentRuntime();
    loadProductDiscoveryDepartment(runtime);
    const contract = runtime.contract("market-research-agent");
    expect(contract).toBeDefined();
    expect(contract.agentName).toBe("market-research-agent");
    expect(contract.allowedTools).toBeDefined();
  });

  it("PRODUCT_DISCOVERY_DEPARTMENT_AGENTS matches spec names", () => {
    const fromSpecs = PRODUCT_DISCOVERY_DEPARTMENT.map((s) => s.name);
    expect(PRODUCT_DISCOVERY_DEPARTMENT_AGENTS).toEqual(fromSpecs);
  });

  it("agents are sequenced in discovery workflow", () => {
    // Validate dependencies follow the discovery workflow
    const ideaValidator = PRODUCT_DISCOVERY_DEPARTMENT.find((s) => s.name === "idea-validator");
    expect(ideaValidator!.sendsTo).toContain("problem-discovery-agent");

    const problemDiscovery = PRODUCT_DISCOVERY_DEPARTMENT.find((s) => s.name === "problem-discovery-agent");
    expect(problemDiscovery!.sendsTo).toContain("target-audience-agent");

    const reportGen = PRODUCT_DISCOVERY_DEPARTMENT.find((s) => s.name === "product-discovery-report-generator");
    expect(reportGen!.receivesFrom).toContain("success-metrics-agent");
  });
});
