import path from "node:path";
import type { AgentBlueprint } from "../types/blueprint.js";
import type { GeneratedAgentFile } from "../types/agent.js";
import { PATHS } from "../constants/paths.js";
import { contentHash } from "../utils/hash.js";
import { nowIso } from "../utils/id.js";
import { renderFrontmatter } from "../utils/frontmatter.js";
import { buildFrontmatter } from "./renderFrontmatter.js";
import { buildBody } from "./renderBody.js";

export interface GenerationOptions {
  /** Overrides the timestamp written into Validation Metadata. Primarily for deterministic tests. */
  generatedAt?: string;
  outputDir?: string;
}

/**
 * Pure transform: AgentBlueprint -> GeneratedAgentFile. No I/O. Callers
 * (the CLI's `generate` command) decide whether/when to validate and persist
 * the result — see src/validator and src/generator/writeAgent.ts.
 */
export function generateAgentFile(
  blueprint: AgentBlueprint,
  options: GenerationOptions = {},
): GeneratedAgentFile {
  const generatedAt = options.generatedAt ?? nowIso();
  const blueprintHash = contentHash(blueprint);

  const frontmatter = buildFrontmatter(blueprint);
  const body = buildBody(blueprint, { generatedAt, blueprintHash });
  const raw = renderFrontmatter(frontmatter, body);

  const outputDir = options.outputDir ?? PATHS.agentsOutputDir;
  const filePath = path.join(outputDir, `${blueprint.identity.name}.md`);

  return { filePath, frontmatter, body, raw };
}
