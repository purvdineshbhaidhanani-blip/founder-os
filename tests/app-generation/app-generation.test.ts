import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { AgentRuntime } from "../../src/runtime/index.js";
import {
  APP_GENERATION_DEPARTMENT,
  loadAppGenerationDepartment,
  APP_GENERATION_DEPARTMENT_AGENTS,
} from "../../src/departments/index.js";
import { buildDepartmentBlueprint } from "../../src/departments/blueprint.js";
import { validateBlueprint } from "../../src/blueprint/validate.js";

const ROOT = "/home/user/founder-os";
const SCAFFOLD_FILES = [
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

describe("Loop 3 — App Generation Department (quick validation only, no full OS execution)", () => {
  it("has exactly 11 agent specs", () => {
    expect(APP_GENERATION_DEPARTMENT).toHaveLength(11);
  });

  it("Factory proof: every spec produces a valid blueprint via buildDepartmentBlueprint + validateBlueprint", () => {
    for (const spec of APP_GENERATION_DEPARTMENT) {
      const blueprint = buildDepartmentBlueprint(spec);
      const result = validateBlueprint(blueprint);
      expect(result.ok, `${spec.name} blueprint failed validation`).toBe(true);
    }
  });

  it("Registry verification: all 11 agents have generated .claude/agents/ files", () => {
    for (const name of APP_GENERATION_DEPARTMENT_AGENTS) {
      const path = join(ROOT, ".claude", "agents", `${name}.md`);
      expect(existsSync(path), `Missing .claude/agents/${name}.md`).toBe(true);
    }
  });

  it("Registry verification: all 11 agents appear in registry/agents.registry.json with status active", () => {
    const registry = JSON.parse(readFileSync(join(ROOT, "registry", "agents.registry.json"), "utf-8"));
    const entries: any[] = registry.agents ?? registry.entries ?? registry;
    for (const name of APP_GENERATION_DEPARTMENT_AGENTS) {
      const entry = Array.isArray(entries) ? entries.find((e) => e.name === name) : undefined;
      expect(entry, `Missing registry entry for ${name}`).toBeDefined();
    }
  });

  it("Artifact verification: all 11 agents have the full per-agent scaffold folder", () => {
    for (const name of APP_GENERATION_DEPARTMENT_AGENTS) {
      const agentDir = join(ROOT, "agents", name);
      for (const file of SCAFFOLD_FILES) {
        expect(existsSync(join(agentDir, file)), `Missing agents/${name}/${file}`).toBe(true);
      }
    }
  });

  it("Runtime verification: department wires into AgentRuntime and all 11 agents become active", () => {
    const runtime = new AgentRuntime();
    const descriptors = loadAppGenerationDepartment(runtime);
    expect(descriptors).toHaveLength(11);
    for (const name of APP_GENERATION_DEPARTMENT_AGENTS) {
      expect(runtime.get(name)?.status).toBe("active");
    }
  });

  it("Runtime discovery: solution-architect-app is discoverable by tag and category", () => {
    const runtime = new AgentRuntime();
    loadAppGenerationDepartment(runtime);
    const byTag = runtime.discover({ tag: "app-generation", status: "active" });
    expect(byTag.length).toBeGreaterThanOrEqual(11);
    const architect = runtime.get("solution-architect-app");
    expect(architect?.category).toBe("architecture");
  });

  it("Runtime contracts: developer-agent and qa-engineer-app expose correct category-based tools", () => {
    const runtime = new AgentRuntime();
    loadAppGenerationDepartment(runtime);
    const devContract = runtime.contract("developer-agent");
    expect(devContract.allowedTools).toContain("Write");
    expect(devContract.allowedTools).toContain("Bash");
    const qaContract = runtime.contract("qa-engineer-app");
    expect(qaContract.allowedTools).toContain("Bash");
  });

  it("Smoke test: full pipeline order forms a valid handoff chain from solution-architect-app to deployment-agent", () => {
    const bySpecName = new Map(APP_GENERATION_DEPARTMENT.map((s) => [s.name, s]));
    const architect = bySpecName.get("solution-architect-app")!;
    expect(architect.sendsTo).toContain("application-architect");
    expect(architect.sendsTo).toContain("backend-architect");
    expect(architect.sendsTo).toContain("database-architect");
    expect(architect.sendsTo).toContain("ai-architect");

    const developer = bySpecName.get("developer-agent")!;
    expect(developer.receivesFrom).toContain("application-architect");
    expect(developer.receivesFrom).toContain("backend-architect");
    expect(developer.receivesFrom).toContain("database-architect");
    expect(developer.receivesFrom).toContain("ai-architect");
    expect(developer.sendsTo).toContain("qa-engineer-app");

    const qa = bySpecName.get("qa-engineer-app")!;
    expect(qa.receivesFrom).toContain("developer-agent");
    expect(qa.sendsTo).toContain("deployment-agent");

    const deployment = bySpecName.get("deployment-agent")!;
    expect(deployment.receivesFrom).toContain("qa-engineer-app");
  });

  it("APP_GENERATION_DEPARTMENT_AGENTS list matches spec names", () => {
    expect(APP_GENERATION_DEPARTMENT_AGENTS).toEqual(APP_GENERATION_DEPARTMENT.map((s) => s.name));
  });
});
