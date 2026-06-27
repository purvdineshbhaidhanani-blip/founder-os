import type { GeneratedAgentFile } from "../../types/agent.js";
import type { ValidationIssue } from "../../types/validation.js";
import type { ValidatorContext } from "../context.js";
import { resolveDocLink } from "../context.js";
import { pathExists } from "../../utils/fs.js";
import { splitSections } from "../sectionExtract.js";

const MARKDOWN_LINK = /\[([^\]]+)]\(([^)]+)\)/g;

function isExternalLink(link: string): boolean {
  return /^[a-z]+:\/\//i.test(link) || link.startsWith("mailto:");
}

/** Verifies every relative documentation link in the "## Documentation" section resolves to a real file. */
export async function checkReferences(
  candidate: GeneratedAgentFile,
  context: ValidatorContext,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const docsSection = splitSections(candidate.body).get("Documentation") ?? "";
  const links = Array.from(docsSection.matchAll(MARKDOWN_LINK)).map((match) => match[2]!.trim());

  for (const link of links) {
    if (isExternalLink(link)) continue;
    const resolved = resolveDocLink(context.repoRoot, link);
    if (!(await pathExists(resolved))) {
      issues.push({
        code: "BROKEN_DOC_REFERENCE",
        severity: "error",
        message: `Documentation link "${link}" does not resolve to an existing file.`,
        path: "section:Documentation",
      });
    }
  }

  const collaboratesLine = splitSections(candidate.body)
    .get("Communication Protocol")
    ?.split("\n")
    .find((line) => line.includes("**Collaborates with:**"));

  if (collaboratesLine) {
    const value = collaboratesLine.split("**Collaborates with:**")[1]?.trim();
    if (value && value !== "None") {
      const knownNames = new Set(context.otherAgents.map((agent) => agent.frontmatter.name));
      for (const name of value.split(",").map((entry) => entry.trim())) {
        if (name && !knownNames.has(name)) {
          issues.push({
            code: "UNKNOWN_COLLABORATOR",
            severity: "warning",
            message: `Lists "${name}" as a collaborator, but no agent with that name currently exists in the registry.`,
            path: "section:Communication Protocol",
          });
        }
      }
    }
  }

  return issues;
}
