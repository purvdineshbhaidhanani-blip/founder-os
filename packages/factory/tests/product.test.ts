import { describe, expect, it } from "vitest";
import { resolveEffectiveModules } from "../src/product/resolve-modules.js";
import { validateProductDefinition } from "../src/product/schema.js";
import type { ProductDefinition } from "../src/product/types.js";

const base: ProductDefinition = {
  name: "acme-billing",
  type: "saas",
  modules: ["notification"],
  authMode: "multi-user",
  billingMode: "subscription",
  aiEnabled: false,
  teamsEnabled: true,
  featureFlagsEnabled: false,
  storageEnabled: false,
};

describe("Product Definition System", () => {
  it("accepts a well-formed definition", () => {
    const result = validateProductDefinition(base);
    expect(result.valid).toBe(true);
  });

  it("rejects a non-kebab-case name", () => {
    const result = validateProductDefinition({ ...base, name: "Acme Billing" });
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate modules", () => {
    const result = validateProductDefinition({ ...base, modules: ["notification", "notification"] });
    expect(result.valid).toBe(false);
  });

  it("rejects billing without an auth mode", () => {
    const result = validateProductDefinition({ ...base, authMode: "none" });
    expect(result.valid).toBe(false);
  });

  it("resolveEffectiveModules unions explicit modules with implied ones from toggles", () => {
    const effective = resolveEffectiveModules(base);
    expect(effective).toEqual(expect.arrayContaining(["notification", "auth", "teams-roles"]));
    expect(effective).not.toContain("ai");
  });
});
