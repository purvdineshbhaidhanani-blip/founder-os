import type { AgentBlueprint } from "../types/blueprint.js";
import type { AgentFrontmatter } from "../types/agent.js";

/**
 * Builds the YAML frontmatter block Claude Code reads to discover a subagent:
 * `name`, `description`, `tools`, and (optionally) `model`. Anything else the
 * factory tracks (capabilities, dependencies, status, history) deliberately
 * stays out of frontmatter and lives in the Registry instead — see
 * docs/ARCHITECTURE.md#why-a-registry-separate-from-claudeagents.
 */
export function buildFrontmatter(blueprint: AgentBlueprint): AgentFrontmatter {
  const frontmatter: AgentFrontmatter = {
    name: blueprint.identity.name,
    description: blueprint.identity.summary,
    tools: blueprint.allowedTools.join(", "),
  };

  if (blueprint.model !== "inherit") {
    frontmatter.model = blueprint.model;
  }

  return frontmatter;
}
