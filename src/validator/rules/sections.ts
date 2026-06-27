import type { GeneratedAgentFile } from "../../types/agent.js";
import { REQUIRED_AGENT_SECTIONS } from "../../types/agent.js";
import type { ValidationIssue } from "../../types/validation.js";

const HEADING_PATTERN = /^##\s+(.+?)\s*$/gm;

function extractHeadings(body: string): string[] {
  return Array.from(body.matchAll(HEADING_PATTERN)).map((match) => match[1]!.trim());
}

/** Every section the Generator is contractually supposed to emit must be present exactly once. */
export function checkSections(candidate: GeneratedAgentFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const headings = extractHeadings(candidate.body);

  for (const required of REQUIRED_AGENT_SECTIONS) {
    const occurrences = headings.filter((heading) => heading === required).length;
    if (occurrences === 0) {
      issues.push({
        code: "MISSING_SECTION",
        severity: "error",
        message: `Required section "## ${required}" is missing.`,
        path: `section:${required}`,
      });
    } else if (occurrences > 1) {
      issues.push({
        code: "DUPLICATE_SECTION",
        severity: "error",
        message: `Section "## ${required}" appears ${occurrences} times; it must appear exactly once.`,
        path: `section:${required}`,
      });
    }
  }

  return issues;
}
