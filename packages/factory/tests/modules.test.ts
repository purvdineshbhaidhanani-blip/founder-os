import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModuleRegistry } from "../src/modules/registry.js";
import { BUILTIN_MODULES } from "../src/modules/catalog.js";

describe("Module Registry", () => {
  it("built-in catalog has no missing dependencies or cycles", () => {
    const registry = new ModuleRegistry(BUILTIN_MODULES);
    const validation = registry.validateAll();
    expect(validation.valid).toBe(true);
  });

  it("enable/disable tracks state and rejects unknown modules", () => {
    const registry = new ModuleRegistry(BUILTIN_MODULES);
    registry.enable("ai");
    expect(registry.isEnabled("ai")).toBe(true);
    registry.disable("ai");
    expect(registry.isEnabled("ai")).toBe(false);
    expect(() => registry.enable("does-not-exist")).toThrow();
  });

  it("validateEnabled flags a dependent enabled without its dependency", () => {
    const registry = new ModuleRegistry(BUILTIN_MODULES);
    registry.enable("knowledge"); // depends on "ai", which is not enabled
    const validation = registry.validateEnabled();
    expect(validation.valid).toBe(false);
    expect(validation.issues[0]!.type).toBe("disabled-dependency");
  });

  it("resolveRequired expands transitive dependencies in dependency-first order", () => {
    const registry = new ModuleRegistry(BUILTIN_MODULES);
    const { order, validation } = registry.resolveRequired(["knowledge"]);
    expect(validation.valid).toBe(true);
    expect(order.indexOf("ai")).toBeLessThan(order.indexOf("knowledge"));
  });

  it("resolveRequired reports a missing module as invalid", () => {
    const registry = new ModuleRegistry(BUILTIN_MODULES);
    const { validation } = registry.resolveRequired(["not-a-real-module"]);
    expect(validation.valid).toBe(false);
  });

  it("detects a dependency cycle", () => {
    const registry = new ModuleRegistry([
      { id: "a", name: "A", description: "", category: "core", dependsOn: ["b"] },
      { id: "b", name: "B", description: "", category: "core", dependsOn: ["a"] },
    ]);
    const validation = registry.validateAll();
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((i) => i.type === "cycle")).toBe(true);
  });

  describe("discover()", () => {
    let root: string;

    beforeEach(async () => {
      root = await mkdtemp(path.join(tmpdir(), "module-discovery-"));
      const enginesDir = path.join(root, "packages", "engines", "src", "widgets");
      await mkdir(enginesDir, { recursive: true });
      await writeFile(path.join(enginesDir, "index.ts"), "export const widgets = true;\n");
    });

    afterEach(async () => {
      await rm(root, { recursive: true, force: true });
    });

    it("auto-registers a real on-disk engine directory not in the built-in catalog", () => {
      const registry = new ModuleRegistry();
      const added = registry.discover(root);
      expect(added.map((m) => m.id)).toContain("widgets");
      expect(registry.get("widgets")?.discovered).toBe(true);
    });

    it("does not duplicate a module id already registered", () => {
      const registry = new ModuleRegistry([
        { id: "widgets", name: "Widgets", description: "custom", category: "core" },
      ]);
      const added = registry.discover(root);
      expect(added).toHaveLength(0);
      expect(registry.get("widgets")?.description).toBe("custom");
    });
  });
});
