import path from "node:path";
import type { GeneratedAgentFile } from "../../types/agent.js";
import type { ValidationIssue } from "../../types/validation.js";
import { isValidSlug } from "../../utils/slug.js";

/** Checks the minimum frontmatter fields Claude Code needs to even load this as a subagent. */
export function checkCompleteness(candidate: GeneratedAgentFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { frontmatter, filePath } = candidate;

  if (!frontmatter.name || frontmatter.name.trim().length === 0) {
    issues.push({
      code: "MISSING_NAME",
      severity: "error",
      message: "Frontmatter is missing a non-empty `name`.",
      path: "frontmatter.name",
    });
  } else if (!isValidSlug(frontmatter.name)) {
    issues.push({
      code: "INVALID_NAME_FORMAT",
      severity: "error",
      message: `Frontmatter name "${frontmatter.name}" is not a valid kebab-case slug.`,
      path: "frontmatter.name",
    });
  }

  if (!frontmatter.description || frontmatter.description.trim().length < 10) {
    issues.push({
      code: "MISSING_DESCRIPTION",
      severity: "error",
      message: "Frontmatter `description` is missing or too short (< 10 characters).",
      path: "frontmatter.description",
    });
  }

  if (!frontmatter.tools || frontmatter.tools.trim().length === 0) {
    issues.push({
      code: "MISSING_TOOLS",
      severity: "error",
      message: "Frontmatter `tools` is missing or empty.",
      path: "frontmatter.tools",
    });
  }

  const expectedBasename = `${frontmatter.name}.md`;
  if (frontmatter.name && path.basename(filePath) !== expectedBasename) {
    issues.push({
      code: "FILENAME_NAME_MISMATCH",
      severity: "error",
      message: `File "${path.basename(filePath)}" does not match frontmatter name "${frontmatter.name}" (expected "${expectedBasename}").`,
      path: "frontmatter.name",
    });
  }

  if (candidate.body.trim().length === 0) {
    issues.push({
      code: "EMPTY_BODY",
      severity: "error",
      message: "Agent body is empty.",
    });
  }

  return issues;
}
