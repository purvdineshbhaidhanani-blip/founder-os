import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BUILTIN_INTELLIGENCE_MODULES } from "../src/registry/catalog.js";
import { IntelligenceRegistry } from "../src/registry/registry.js";
import { compareSemVer, satisfiesMinVersion } from "../src/registry/semver.js";

describe("Intelligence Registry", () => {
  it("built-in catalog has no missing dependencies or cycles", () => {
    const registry = IntelligenceRegistry.withBuiltins();
    expect(registry.validateAll().valid).toBe(true);
  });

  it("registers, enables, and disables modules", () => {
    const registry = IntelligenceRegistry.withBuiltins();
    registry.enable("recommendation");
    expect(registry.isEnabled("recommendation")).toBe(true);
    registry.disable("recommendation");
    expect(registry.isEnabled("recommendation")).toBe(false);
    expect(() => registry.enable("unknown")).toThrow();
  });

  it("detects a cycle between two custom modules", () => {
    const registry = new IntelligenceRegistry([
      { id: "a", name: "A", description: "", version: "1.0.0", category: "diagnostics", dependsOn: ["b"] },
      { id: "b", name: "B", description: "", version: "1.0.0", category: "diagnostics", dependsOn: ["a"] },
    ]);
    expect(registry.validateAll().valid).toBe(false);
  });

  it("checks version compatibility", () => {
    const registry = IntelligenceRegistry.withBuiltins();
    expect(registry.isVersionCompatible("recommendation", "1.0.0")).toBe(true);
    expect(registry.isVersionCompatible("recommendation", "2.0.0")).toBe(false);
    expect(registry.isVersionCompatible("unknown", "1.0.0")).toBe(false);
  });

  it("semver comparison and minimum-version satisfaction", () => {
    expect(compareSemVer("1.2.0", "1.10.0")).toBeLessThan(0);
    expect(satisfiesMinVersion("1.10.0", "1.2.0")).toBe(true);
    expect(satisfiesMinVersion("1.0.0", "1.0.1")).toBe(false);
  });

  it("built-in catalog matches the eight documented module ids", () => {
    expect(BUILTIN_INTELLIGENCE_MODULES.map((m) => m.id).sort()).toEqual(
      [
        "ai-layer",
        "decision",
        "diagnostics",
        "feature-intelligence",
        "insights",
        "optimization",
        "product-intelligence",
        "recommendation",
      ].sort(),
    );
  });

  describe("discover()", () => {
    let root: string;

    beforeEach(async () => {
      root = await mkdtemp(path.join(tmpdir(), "intel-discovery-"));
      const dir = path.join(root, "packages", "intelligence", "src", "custom-module");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "index.ts"), "export const x = 1;\n");
    });

    afterEach(async () => {
      await rm(root, { recursive: true, force: true });
    });

    it("auto-registers an on-disk module directory not in the catalog", () => {
      const registry = new IntelligenceRegistry();
      const added = registry.discover(root);
      expect(added.map((m) => m.id)).toContain("custom-module");
      expect(registry.get("custom-module")?.discovered).toBe(true);
    });
  });
});
