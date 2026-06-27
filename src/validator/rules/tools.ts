import type { GeneratedAgentFile } from "../../types/agent.js";
import type { ValidationIssue } from "../../types/validation.js";
import { isKnownTool } from "../../constants/tools.js";

/** Validates every tool listed in frontmatter against the platform's tool whitelist. */
export function checkTools(candidate: GeneratedAgentFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const raw = candidate.frontmatter.tools;
  if (!raw) return issues;

  const tools = raw
    .split(",")
    .map((tool) => tool.trim())
    .filter((tool) => tool.length > 0);

  if (tools.length === 0) {
    issues.push({
      code: "NO_TOOLS_DECLARED",
      severity: "error",
      message: "Frontmatter `tools` did not resolve to any tool names.",
      path: "frontmatter.tools",
    });
  }

  const seen = new Set<string>();
  for (const tool of tools) {
    if (!isKnownTool(tool)) {
      issues.push({
        code: "INVALID_TOOL",
        severity: "error",
        message: `"${tool}" is not a recognized tool (core tool, "*", or "mcp__" namespaced).`,
        path: "frontmatter.tools",
      });
    }
    if (seen.has(tool)) {
      issues.push({
        code: "DUPLICATE_TOOL",
        severity: "warning",
        message: `Tool "${tool}" is listed more than once.`,
        path: "frontmatter.tools",
      });
    }
    seen.add(tool);
  }

  return issues;
}
