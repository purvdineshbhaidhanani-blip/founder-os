import type { GeneratedAgentFile } from "../../types/agent.js";
import type { ValidationIssue } from "../../types/validation.js";

/** Structural Markdown/formatting hygiene that would otherwise silently break re-parsing or rendering. */
export function checkFormatting(candidate: GeneratedAgentFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { raw, body } = candidate;

  if (!raw.startsWith("---\n")) {
    issues.push({
      code: "FRONTMATTER_NOT_LEADING",
      severity: "error",
      message: "File must begin with a YAML frontmatter block (`---` on the first line).",
    });
  }

  const topLevelHeadings = body.split("\n").filter((line) => /^#\s+/.test(line));
  if (topLevelHeadings.length === 0) {
    issues.push({
      code: "MISSING_TITLE",
      severity: "error",
      message: "Body is missing a top-level `# Title` heading.",
    });
  } else if (topLevelHeadings.length > 1) {
    issues.push({
      code: "MULTIPLE_TITLES",
      severity: "error",
      message: `Body has ${topLevelHeadings.length} top-level "# " headings; exactly one is allowed.`,
    });
  }

  if (/\t/.test(raw)) {
    issues.push({
      code: "TAB_CHARACTER",
      severity: "warning",
      message: "File contains tab characters; use spaces for consistency.",
    });
  }

  const linesWithTrailingWhitespace = raw.split("\n").filter((line) => /\s+$/.test(line)).length;
  if (linesWithTrailingWhitespace > 0) {
    issues.push({
      code: "TRAILING_WHITESPACE",
      severity: "warning",
      message: `${linesWithTrailingWhitespace} line(s) have trailing whitespace.`,
    });
  }

  if (!raw.endsWith("\n") || raw.endsWith("\n\n\n")) {
    issues.push({
      code: "TRAILING_NEWLINE",
      severity: "warning",
      message: "File should end with exactly one trailing newline.",
    });
  }

  return issues;
}
