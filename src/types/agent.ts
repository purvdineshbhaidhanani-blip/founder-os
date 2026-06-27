/**
 * Representation of a generated Claude Code agent file, both in-memory
 * (produced by the Generator, Phase 3) and as parsed back off disk (consumed
 * by the Validator, Phase 4).
 */

export interface AgentFrontmatter {
  name: string;
  description: string;
  tools?: string;
  model?: string;
  [key: string]: unknown;
}

export interface GeneratedAgentFile {
  /** Absolute path the agent file was (or will be) written to. */
  filePath: string;
  frontmatter: AgentFrontmatter;
  body: string;
  /** Full file contents (frontmatter + body), as written/read. */
  raw: string;
}

/** The canonical section headings the Generator emits and the Validator checks for. */
export const REQUIRED_AGENT_SECTIONS = [
  "Role",
  "Responsibilities",
  "Objectives",
  "Inputs",
  "Outputs",
  "Workflow",
  "Permissions",
  "Communication Protocol",
  "Memory Access",
  "Execution Constraints",
  "Safety Rules",
  "Reporting Format",
  "Success Criteria",
  "Failure Behavior",
  "Validation Metadata",
  "Version Metadata",
  "Documentation",
] as const;

export type RequiredAgentSection = (typeof REQUIRED_AGENT_SECTIONS)[number];
