import path from "node:path";
import type { GeneratedAgentFile } from "../../types/agent.js";
import type { ValidationIssue } from "../../types/validation.js";
import { splitSections } from "../sectionExtract.js";

const WRITE_TOOLS = ["Write", "Edit", "NotebookEdit"];
const SHELL_TOOLS = ["Bash"];
const NETWORK_TOOLS = ["WebFetch", "WebSearch"];

function parseToolList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);
}

function sectionValue(body: string, heading: string, label: string): string | undefined {
  const section = splitSections(body).get(heading);
  const line = section?.split("\n").find((entry) => entry.includes(`**${label}:**`));
  return line?.split(`**${label}:**`)[1]?.trim();
}

/**
 * Defense in depth: even if a `.claude/agents/*.md` file was hand-edited after
 * generation, it must still respect the platform's structural conventions —
 * lives directly under `.claude/agents/`, and its declared tools agree with
 * the permissions it claims to operate under.
 */
export function checkArchitectureCompliance(candidate: GeneratedAgentFile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parentDir = path.basename(path.dirname(candidate.filePath));
  const grandparentDir = path.basename(path.dirname(path.dirname(candidate.filePath)));

  if (parentDir !== "agents" || grandparentDir !== ".claude") {
    issues.push({
      code: "INVALID_LOCATION",
      severity: "error",
      message: `Agent file must live directly under ".claude/agents/", found "${path.dirname(candidate.filePath)}".`,
    });
  }

  const tools = parseToolList(candidate.frontmatter.tools);
  const filesystem = sectionValue(candidate.body, "Permissions", "Filesystem");
  const shell = sectionValue(candidate.body, "Permissions", "Shell");
  const network = sectionValue(candidate.body, "Permissions", "Network");

  if (filesystem && filesystem !== "read-write" && tools.some((tool) => WRITE_TOOLS.includes(tool))) {
    issues.push({
      code: "ARCHITECTURE_PERMISSION_DRIFT",
      severity: "error",
      message: `Tools include a write-capable tool but Permissions states Filesystem: ${filesystem}.`,
      path: "section:Permissions",
    });
  }

  if (shell === "none" && tools.some((tool) => SHELL_TOOLS.includes(tool))) {
    issues.push({
      code: "ARCHITECTURE_PERMISSION_DRIFT",
      severity: "error",
      message: "Tools include Bash but Permissions states Shell: none.",
      path: "section:Permissions",
    });
  }

  if (network === "none" && tools.some((tool) => NETWORK_TOOLS.includes(tool))) {
    issues.push({
      code: "ARCHITECTURE_PERMISSION_DRIFT",
      severity: "error",
      message: "Tools include a network tool but Permissions states Network: none.",
      path: "section:Permissions",
    });
  }

  return issues;
}
