import type { GeneratedAgentFile } from "../types/agent.js";
import type { ValidationReport } from "../types/validation.js";
import type { ValidatorContext } from "./context.js";
import { checkCompleteness } from "./rules/completeness.js";
import { checkSections } from "./rules/sections.js";
import { checkTools } from "./rules/tools.js";
import { checkDuplicates } from "./rules/duplicates.js";
import { checkReferences } from "./rules/references.js";
import { checkFormatting } from "./rules/formatting.js";
import { checkArchitectureCompliance } from "./rules/architecture.js";

/**
 * Runs every validation rule against a generated agent file. This is the
 * single gate between "the generator produced something" and "this agent is
 * allowed into the registry / `.claude/agents/`." Independent of the
 * generator's internals — it only ever looks at the rendered artifact, so it
 * catches drift introduced by hand-edits too.
 */
export async function validateAgent(
  candidate: GeneratedAgentFile,
  context: ValidatorContext,
): Promise<ValidationReport> {
  const issues = [
    ...checkCompleteness(candidate),
    ...checkSections(candidate),
    ...checkTools(candidate),
    ...checkDuplicates(candidate, context),
    ...(await checkReferences(candidate, context)),
    ...checkFormatting(candidate),
    ...checkArchitectureCompliance(candidate),
  ];

  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}
