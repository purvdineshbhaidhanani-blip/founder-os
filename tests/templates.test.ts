import { describe, expect, it } from "vitest";
import { AGENT_CATEGORIES } from "../src/constants/categories.js";
import { getTemplate, listTemplates, getTemplateByName } from "../src/templates/registry.js";
import { validateBlueprint } from "../src/blueprint/validate.js";

describe("template library", () => {
  it("exposes one template per category", () => {
    expect(listTemplates()).toHaveLength(AGENT_CATEGORIES.length);
    for (const category of AGENT_CATEGORIES) {
      const template = getTemplate(category);
      expect(template.category).toBe(category);
    }
  });

  it("each template builds a valid blueprint", () => {
    for (const category of AGENT_CATEGORIES) {
      const template = getTemplate(category);
      const blueprint = template.build({
        name: `demo-${category}`,
        displayName: `Demo ${category}`,
        owner: "platform-team",
      });
      const result = validateBlueprint(blueprint);
      expect(result.ok, `Template ${category} produced invalid blueprint`).toBe(true);
    }
  });

  it("looks up templates by name", () => {
    expect(getTemplateByName("engineering-default")?.category).toBe("engineering");
    expect(getTemplateByName("does-not-exist")).toBeUndefined();
  });
});
