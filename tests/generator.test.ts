import { describe, expect, it } from "vitest";
import { engineeringTemplate } from "../src/templates/engineering.js";
import { generateAgentFile } from "../src/generator/generateAgent.js";
import { REQUIRED_AGENT_SECTIONS } from "../src/types/agent.js";

const blueprint = engineeringTemplate.build({
  name: "test-engineer",
  displayName: "Test Engineer",
  owner: "platform-team",
});

describe("generator", () => {
  it("produces frontmatter with name, description, and tools", () => {
    const file = generateAgentFile(blueprint, { generatedAt: "2025-01-01T00:00:00Z" });
    expect(file.frontmatter.name).toBe("test-engineer");
    expect(file.frontmatter.description).toContain(blueprint.identity.summary);
    expect(file.frontmatter.tools).toContain("Read");
  });

  it("includes every required section in the body", () => {
    const file = generateAgentFile(blueprint);
    for (const section of REQUIRED_AGENT_SECTIONS) {
      expect(file.body, `missing section ${section}`).toContain(`## ${section}`);
    }
  });

  it("renders deterministic output for the same blueprint + timestamp", () => {
    const a = generateAgentFile(blueprint, { generatedAt: "2025-01-01T00:00:00Z" });
    const b = generateAgentFile(blueprint, { generatedAt: "2025-01-01T00:00:00Z" });
    expect(a.raw).toBe(b.raw);
  });

  it("puts frontmatter at the very top", () => {
    const file = generateAgentFile(blueprint);
    expect(file.raw.startsWith("---\n")).toBe(true);
  });
});
