import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { AgentRuntime, EventBus } from "../../src/runtime/index.js";
import { FOUNDATION_DEPARTMENT, loadFoundationDepartment, FOUNDATION_DEPARTMENT_AGENTS } from "../../src/departments/index.js";
import { buildDepartmentBlueprint } from "../../src/departments/blueprint.js";
import { validateBlueprint } from "../../src/blueprint/validate.js";

const ROOT = "/home/user/founder-os";
const AGENT_FILES = [
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

describe("Foundation Department", () => {
  it("has exactly 16 agent specs", () => {
    expect(FOUNDATION_DEPARTMENT).toHaveLength(16);
  });

  it("all specs produce valid blueprints", () => {
    for (const spec of FOUNDATION_DEPARTMENT) {
      const blueprint = buildDepartmentBlueprint(spec);
      const result = validateBlueprint(blueprint);
      expect(result.ok, `${spec.name} blueprint failed validation`).toBe(true);
    }
  });

  it("all 16 agents have generated .claude/agents/ files", () => {
    for (const name of FOUNDATION_DEPARTMENT_AGENTS) {
      const path = join(ROOT, ".claude", "agents", `${name}.md`);
      expect(existsSync(path), `Missing .claude/agents/${name}.md`).toBe(true);
    }
  });

  it("all 16 agents have the full per-agent folder structure", () => {
    for (const name of FOUNDATION_DEPARTMENT_AGENTS) {
      const agentDir = join(ROOT, "agents", name);
      for (const file of AGENT_FILES) {
        const path = join(agentDir, file);
        expect(existsSync(path), `Missing agents/${name}/${file}`).toBe(true);
      }
    }
  });

  it("CONFIG.json files are valid JSON with required keys", () => {
    for (const name of FOUNDATION_DEPARTMENT_AGENTS) {
      const path = join(ROOT, "agents", name, "CONFIG.json");
      const raw = readFileSync(path, "utf-8");
      const config = JSON.parse(raw) as Record<string, unknown>;
      expect(config.name).toBe(name);
      expect(config.status).toBe("active");
      expect(config.modelRouting).toBeDefined();
      expect(config.memory).toBeDefined();
      expect(config.retry).toBeDefined();
    }
  });

  it("INPUT_SCHEMA.json files are valid JSON Schema objects", () => {
    for (const name of FOUNDATION_DEPARTMENT_AGENTS) {
      const path = join(ROOT, "agents", name, "INPUT_SCHEMA.json");
      const raw = readFileSync(path, "utf-8");
      const schema = JSON.parse(raw) as Record<string, unknown>;
      expect(schema.type).toBe("object");
      expect(Array.isArray(schema.required)).toBe(true);
      expect((schema.required as string[]).includes("taskId")).toBe(true);
      expect((schema.required as string[]).includes("goal")).toBe(true);
    }
  });

  it("Foundation department wires into runtime and all agents become active", () => {
    const bus = new EventBus();
    const runtime = new AgentRuntime({ bus });
    const descriptors = loadFoundationDepartment(runtime);
    expect(descriptors).toHaveLength(16);
    const active = runtime.discover({ tag: "foundation", status: "active" });
    expect(active.length).toBeGreaterThanOrEqual(16);
  });

  it("orchestrator-agent is registered and active", () => {
    const runtime = new AgentRuntime();
    loadFoundationDepartment(runtime);
    const agent = runtime.get("orchestrator-agent");
    expect(agent).toBeDefined();
    expect(agent!.status).toBe("active");
  });

  it("Foundation agents expose correct category-based tools via contract", () => {
    const runtime = new AgentRuntime();
    loadFoundationDepartment(runtime);
    const contract = runtime.contract("quality-controller");
    expect(contract).toBeDefined();
    expect(contract.allowedTools).toContain("Bash");
  });

  it("FOUNDATION_DEPARTMENT_AGENTS list matches spec names", () => {
    const fromSpecs = FOUNDATION_DEPARTMENT.map((s) => s.name);
    expect(FOUNDATION_DEPARTMENT_AGENTS).toEqual(fromSpecs);
  });
});
