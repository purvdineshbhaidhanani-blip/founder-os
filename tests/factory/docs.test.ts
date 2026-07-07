import { describe, expect, it } from "vitest";
import { DocumentationGenerator } from "../../src/factory/docs/generator.js";
import { ModuleRegistry } from "../../src/factory/modules/registry.js";
import { BUILTIN_MODULES } from "../../src/factory/modules/catalog.js";
import { applyTemplate } from "../../src/factory/templates/apply.js";

describe("Documentation Generator", () => {
  const registry = new ModuleRegistry(BUILTIN_MODULES);
  const generator = new DocumentationGenerator();

  it("generates per-module docs including real exported symbols scanned from source", () => {
    const docs = generator.generateModuleDocs(registry, process.cwd());
    expect(docs.ai).toContain("# AI Engine");
    expect(docs.ai).toContain("ModelRouter");
    expect(docs.ai).toContain("Public API");
  });

  it("generates an API reference grouped by category", () => {
    const reference = generator.generateApiReference(registry, process.cwd());
    expect(reference).toContain("# API Reference");
    expect(reference).toContain("Workflow Engine");
  });

  it("generates a developer guide listing modules in dependency order for a product", () => {
    const definition = applyTemplate("ai-application", { name: "my-ai-app" });
    expect(definition.valid).toBe(true);
    if (!definition.valid) return;

    const guide = generator.generateDeveloperGuide(definition.value, registry);
    expect(guide).toContain("my-ai-app");
    expect(guide.indexOf("AI Engine")).toBeLessThan(guide.indexOf("Knowledge Engine"));
  });
});
