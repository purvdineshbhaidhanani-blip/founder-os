import path from "node:path";
import { describe, expect, it } from "vitest";
import { engineeringTemplate } from "../src/templates/engineering.js";
import { documentationTemplate } from "../src/templates/documentation.js";
import { generateAgentFile } from "../src/generator/generateAgent.js";
import { parseGeneratedAgentFile } from "../src/validator/parse.js";
import { validateAgent } from "../src/validator/validateAgent.js";
import type { ValidatorContext } from "../src/validator/context.js";

const REPO_ROOT = path.resolve(__dirname, "..");

function ctx(others: ReturnType<typeof generateAgentFile>[] = []): ValidatorContext {
  return { otherAgents: others, repoRoot: REPO_ROOT };
}

describe("agent validator", () => {
  it("accepts a freshly generated agent", async () => {
    const blueprint = engineeringTemplate.build({
      name: "fresh-engineer",
      displayName: "Fresh Engineer",
      owner: "platform-team",
    });
    const file = generateAgentFile(blueprint);
    const report = await validateAgent(file, ctx());
    const errors = report.issues.filter((issue) => issue.severity === "error");
    expect(errors).toEqual([]);
  });

  it("detects duplicate agent names", async () => {
    const blueprint = documentationTemplate.build({
      name: "dup-doc",
      displayName: "Dup Doc",
      owner: "platform-team",
    });
    const a = generateAgentFile(blueprint);
    const b = generateAgentFile(blueprint);
    const report = await validateAgent(a, ctx([b]));
    expect(report.issues.some((issue) => issue.code === "DUPLICATE_NAME")).toBe(true);
    expect(report.valid).toBe(false);
  });

  it("flags missing required sections", async () => {
    const blueprint = engineeringTemplate.build({
      name: "broken-engineer",
      displayName: "Broken Engineer",
      owner: "platform-team",
    });
    const file = generateAgentFile(blueprint);
    const broken = {
      ...file,
      body: file.body.replace("## Workflow", "## NotWorkflow"),
    };
    broken.raw = `${file.raw.split("\n---\n")[0]}\n---\n${broken.body}\n`;
    const reparsed = parseGeneratedAgentFile(broken.filePath, broken.raw);
    const report = await validateAgent(reparsed, ctx());
    expect(report.issues.some((issue) => issue.code === "MISSING_SECTION")).toBe(true);
  });

  it("re-parses its own rendered output without losing fidelity", () => {
    const blueprint = engineeringTemplate.build({
      name: "roundtrip-engineer",
      displayName: "Roundtrip Engineer",
      owner: "platform-team",
    });
    const file = generateAgentFile(blueprint);
    const reparsed = parseGeneratedAgentFile(file.filePath, file.raw);
    expect(reparsed.frontmatter.name).toBe(blueprint.identity.name);
    expect(reparsed.body.trimEnd()).toBe(file.body.trimEnd());
  });
});
