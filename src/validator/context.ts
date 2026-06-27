import path from "node:path";
import type { GeneratedAgentFile } from "../types/agent.js";
import { PATHS } from "../constants/paths.js";
import { listFilesWithExtension, readTextFile } from "../utils/fs.js";
import { parseGeneratedAgentFile } from "./parse.js";

export interface ValidatorContext {
  /** Every other already-on-disk agent, used for duplicate name/responsibility checks. */
  otherAgents: GeneratedAgentFile[];
  /** Repository root, used to resolve and check relative documentation links. */
  repoRoot: string;
}

export interface LoadValidatorContextOptions {
  agentsDir?: string;
  repoRoot?: string;
  /** Excludes an agent file with this frontmatter `name` (the one currently being (re)validated). */
  excludeName?: string;
}

/** Scans `.claude/agents/*.md` off disk to build the context the validator's duplicate/reference rules need. */
export async function loadValidatorContext(
  options: LoadValidatorContextOptions = {},
): Promise<ValidatorContext> {
  const agentsDir = options.agentsDir ?? PATHS.agentsOutputDir;
  const repoRoot = options.repoRoot ?? PATHS.root;

  const files = await listFilesWithExtension(agentsDir, ".md");
  const parsed = await Promise.all(
    files.map(async (filePath) => {
      const raw = await readTextFile(filePath);
      return parseGeneratedAgentFile(filePath, raw);
    }),
  );

  const otherAgents = parsed.filter((agent) => agent.frontmatter.name !== options.excludeName);

  return { otherAgents, repoRoot };
}

export function resolveDocLink(repoRoot: string, link: string): string {
  const clean = link.replace(/^\//, "");
  return path.join(repoRoot, clean);
}
