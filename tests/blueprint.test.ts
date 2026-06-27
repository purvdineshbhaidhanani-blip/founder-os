import { describe, expect, it } from "vitest";
import { validateBlueprint } from "../src/blueprint/validate.js";
import { engineeringTemplate } from "../src/templates/engineering.js";
import { researchTemplate } from "../src/templates/research.js";

function baseInput() {
  return {
    name: "test-agent",
    displayName: "Test Agent",
    owner: "platform-team",
  };
}

describe("blueprint validation", () => {
  it("accepts a template-built blueprint", () => {
    const blueprint = engineeringTemplate.build(baseInput());
    const result = validateBlueprint(blueprint);
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown category", () => {
    const blueprint = { ...engineeringTemplate.build(baseInput()) } as Record<string, unknown>;
    (blueprint.identity as Record<string, unknown>).category = "not-a-category";
    const result = validateBlueprint(blueprint);
    expect(result.ok).toBe(false);
  });

  it("flags Bash without shell access", () => {
    const blueprint = engineeringTemplate.build(baseInput());
    const mutated = { ...blueprint, permissions: { ...blueprint.permissions, shell: "none" as const } };
    const result = validateBlueprint(mutated);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.issues.some((issue) => issue.code === "TOOL_PERMISSION_MISMATCH")).toBe(true);
    }
  });

  it("flags Write without read-write filesystem", () => {
    const blueprint = engineeringTemplate.build(baseInput());
    const mutated = {
      ...blueprint,
      permissions: { ...blueprint.permissions, filesystem: "read-only" as const },
    };
    const result = validateBlueprint(mutated);
    expect(result.ok).toBe(false);
  });

  it("flags self-collaboration", () => {
    const blueprint = engineeringTemplate.build(baseInput());
    const mutated = {
      ...blueprint,
      communicationProtocol: {
        ...blueprint.communicationProtocol,
        collaboratesWith: [blueprint.identity.name],
      },
    };
    const result = validateBlueprint(mutated);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.issues.some((issue) => issue.code === "SELF_COLLABORATION")).toBe(true);
    }
  });

  it("flags non-sequential workflow ordering", () => {
    const blueprint = engineeringTemplate.build(baseInput());
    const mutated = {
      ...blueprint,
      workflow: [
        { order: 1, title: "A", description: "a" },
        { order: 3, title: "C", description: "c" },
      ],
    };
    const result = validateBlueprint(mutated);
    expect(result.ok).toBe(false);
  });

  it("accepts research template with WebSearch + outbound-only network", () => {
    const result = validateBlueprint(researchTemplate.build(baseInput()));
    expect(result.ok).toBe(true);
  });
});
