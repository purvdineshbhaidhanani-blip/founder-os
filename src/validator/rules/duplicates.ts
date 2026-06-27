import type { GeneratedAgentFile } from "../../types/agent.js";
import type { ValidationIssue } from "../../types/validation.js";
import type { ValidatorContext } from "../context.js";
import { extractSectionBullets, jaccardSimilarity } from "../sectionExtract.js";

const RESPONSIBILITY_ERROR_THRESHOLD = 0.8;
const RESPONSIBILITY_WARNING_THRESHOLD = 0.5;

/** Checks for duplicate agent names and suspiciously overlapping responsibilities against the registry's other agents. */
export function checkDuplicates(
  candidate: GeneratedAgentFile,
  context: ValidatorContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const candidateResponsibilities = extractSectionBullets(candidate.body, "Responsibilities");

  for (const other of context.otherAgents) {
    if (other.frontmatter.name === candidate.frontmatter.name) {
      issues.push({
        code: "DUPLICATE_NAME",
        severity: "error",
        message: `Another agent file (${other.filePath}) already uses the name "${candidate.frontmatter.name}".`,
        path: "frontmatter.name",
      });
      continue;
    }

    const otherResponsibilities = extractSectionBullets(other.body, "Responsibilities");
    const similarity = jaccardSimilarity(candidateResponsibilities, otherResponsibilities);

    if (similarity >= RESPONSIBILITY_ERROR_THRESHOLD) {
      issues.push({
        code: "DUPLICATE_RESPONSIBILITIES",
        severity: "error",
        message: `Responsibilities are ${Math.round(similarity * 100)}% identical to "${other.frontmatter.name}". Differentiate scope or merge the two agents.`,
        path: "section:Responsibilities",
      });
    } else if (similarity >= RESPONSIBILITY_WARNING_THRESHOLD) {
      issues.push({
        code: "OVERLAPPING_RESPONSIBILITIES",
        severity: "warning",
        message: `Responsibilities overlap ${Math.round(similarity * 100)}% with "${other.frontmatter.name}". Confirm this is intentional.`,
        path: "section:Responsibilities",
      });
    }
  }

  return issues;
}
