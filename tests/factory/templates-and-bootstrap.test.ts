import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProductBootstrapper } from "../../src/factory/bootstrap/planner.js";
import { FsProjectWriter } from "../../src/factory/bootstrap/writer.js";
import { ModuleRegistry } from "../../src/factory/modules/registry.js";
import { BUILTIN_MODULES } from "../../src/factory/modules/catalog.js";
import { applyTemplate } from "../../src/factory/templates/apply.js";
import { PROJECT_TEMPLATES } from "../../src/factory/templates/catalog.js";

describe("Project Templates", () => {
  it("provides all five required templates", () => {
    expect(Object.keys(PROJECT_TEMPLATES).sort()).toEqual(
      ["admin-portal", "ai-application", "api-service", "internal-tool", "saas"].sort(),
    );
  });

  it("applyTemplate merges defaults with overrides into a valid ProductDefinition", () => {
    const result = applyTemplate("ai-application", { name: "my-ai-app" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value.aiEnabled).toBe(true);
      expect(result.value.name).toBe("my-ai-app");
    }
  });
});

describe("Product Bootstrap System", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "bootstrap-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("plans a project reusing existing platform modules, resolved in dependency order", () => {
    const registry = new ModuleRegistry(BUILTIN_MODULES);
    const definition = applyTemplate("ai-application", { name: "my-ai-app" });
    expect(definition.valid).toBe(true);
    if (!definition.valid) return;

    const plan = new ProductBootstrapper().plan(definition.value, registry);
    expect(plan.valid).toBe(true);
    if (!plan.valid) return;

    expect(plan.value.moduleOrder).toContain("ai");
    expect(plan.value.moduleOrder.indexOf("ai")).toBeLessThan(plan.value.moduleOrder.indexOf("knowledge"));
    expect(plan.value.files.map((f) => f.path)).toEqual(
      expect.arrayContaining(["package.json", "README.md", ".env.example", "src/index.ts", "platform-modules.json"]),
    );
  });

  it("fails to plan when a required module cannot be resolved", () => {
    const registry = new ModuleRegistry(); // empty — nothing registered
    const definition = applyTemplate("saas", { name: "no-modules" });
    expect(definition.valid).toBe(true);
    if (!definition.valid) return;

    const plan = new ProductBootstrapper().plan(definition.value, registry);
    expect(plan.valid).toBe(false);
  });

  it("FsProjectWriter materializes a plan to disk", async () => {
    const registry = new ModuleRegistry(BUILTIN_MODULES);
    const definition = applyTemplate("internal-tool", { name: "ops-console" });
    expect(definition.valid).toBe(true);
    if (!definition.valid) return;

    const plan = new ProductBootstrapper().plan(definition.value, registry);
    expect(plan.valid).toBe(true);
    if (!plan.valid) return;

    await new FsProjectWriter().write(plan.value, root);
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf-8"));
    expect(pkg.name).toBe("ops-console");
    const indexTs = await readFile(path.join(root, "src", "index.ts"), "utf-8");
    expect(indexTs).toContain("@platform/engines");
  });
});
