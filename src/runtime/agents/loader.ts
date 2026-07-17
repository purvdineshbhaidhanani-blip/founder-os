import path from "node:path";
import { listFilesWithExtension, pathExists, readTextFile } from "../../utils/fs.js";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { PATHS } from "../../constants/paths.js";
import { loadRegistry, findByName } from "../../registry/index.js";
import type {
  ParsedAgentFile,
  ParsedAgentFrontmatter,
  ParsedAgentMemoryAccess,
  ParsedAgentPermissions,
  ParsedAgentVersion,
} from "./execution-types.js";

/**
 * Agent Loader (Loop 2) — discovers, reads, and parses `.claude/agents/*.md`
 * files EXACTLY as they exist on disk today. Reuses the existing
 * `parseFrontmatter` (utils/frontmatter.ts, already used by the Validator) for
 * the YAML block, and the existing Registry (`findByName`/`loadRegistry`) to
 * resolve an agent id to its file path when a registry entry exists — no
 * duplicate discovery/parsing logic.
 *
 * Body-section extraction (Category/Owner/Tags, Permissions, Memory Access,
 * Version Metadata) is genuinely new: nothing previously turned those prose
 * sections into structured data. Extraction is conservative — a field is
 * only ever populated when the exact "- **Label:** value" bullet is present;
 * nothing is guessed or defaulted.
 */

const HEADING_PATTERN = /^##\s+(.+?)\s*$/gm;
const BULLET_PATTERN = /^-\s+\*\*(.+?):\*\*\s*(.*)$/gm;

/** Splits the body into { preamble, sections } where sections are keyed by their "## Heading" text (case-sensitive, as written). */
function splitSections(body: string): { preamble: string; sections: Map<string, string> } {
  const headingMatches = [...body.matchAll(HEADING_PATTERN)];
  const firstHeadingIndex = headingMatches[0]?.index ?? body.length;
  const preamble = body.slice(0, firstHeadingIndex);

  const sections = new Map<string, string>();
  for (let i = 0; i < headingMatches.length; i += 1) {
    const match = headingMatches[i]!;
    const heading = match[1]!.trim();
    const start = match.index! + match[0].length;
    const end = headingMatches[i + 1]?.index ?? body.length;
    sections.set(heading, body.slice(start, end));
  }
  return { preamble, sections };
}

/** Parses every "- **Label:** value" bullet in a block into a lowercase-keyed map. */
function extractBullets(block: string): Map<string, string> {
  const bullets = new Map<string, string>();
  for (const match of block.matchAll(BULLET_PATTERN)) {
    const label = match[1]!.trim().toLowerCase();
    const value = match[2]!.trim();
    bullets.set(label, value);
  }
  return bullets;
}

/** Splits a comma-separated bullet value into trimmed items; treats the literal "none"/"not applicable" as an empty list (honest — not a real value). */
function splitList(value: string | undefined): string[] {
  if (!value) return [];
  const normalized = value.trim().toLowerCase();
  if (normalized === "none" || normalized === "not applicable" || normalized === "not limited") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Parses one `.claude/agents/*.md` file's raw contents into a `ParsedAgentFile`. Pure function — no I/O. */
export function parseAgentFile(filePath: string, raw: string): ParsedAgentFile {
  const { data, body } = parseFrontmatter<Record<string, unknown>>(raw);

  const frontmatter: ParsedAgentFrontmatter = {
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    ...(typeof data.tools === "string" ? { tools: data.tools } : {}),
    ...(typeof data.model === "string" ? { model: data.model } : {}),
  };
  const tools = splitList(frontmatter.tools);

  const { preamble, sections } = splitSections(body);
  const preambleBullets = extractBullets(preamble);

  const permissionsBlock = sections.get("Permissions");
  const permissions: ParsedAgentPermissions | undefined = permissionsBlock
    ? (() => {
        const bullets = extractBullets(permissionsBlock);
        const parsed: ParsedAgentPermissions = {};
        if (bullets.has("filesystem")) parsed.filesystem = bullets.get("filesystem");
        if (bullets.has("network")) parsed.network = bullets.get("network");
        if (bullets.has("shell")) parsed.shell = bullets.get("shell");
        if (bullets.has("sensitive data access")) parsed.sensitiveDataAccess = bullets.get("sensitive data access");
        if (bullets.has("allowed tools")) parsed.allowedTools = splitList(bullets.get("allowed tools"));
        return parsed;
      })()
    : undefined;

  const memoryBlock = sections.get("Memory Access");
  const memoryAccess: ParsedAgentMemoryAccess | undefined = memoryBlock
    ? (() => {
        const bullets = extractBullets(memoryBlock);
        const parsed: ParsedAgentMemoryAccess = {};
        if (bullets.has("scope")) parsed.scope = bullets.get("scope");
        if (bullets.has("persistent")) parsed.persistent = bullets.get("persistent");
        if (bullets.has("read paths")) parsed.readPaths = splitList(bullets.get("read paths"));
        if (bullets.has("write paths")) parsed.writePaths = splitList(bullets.get("write paths"));
        return parsed;
      })()
    : undefined;

  const versionBlock = sections.get("Version Metadata");
  const version: ParsedAgentVersion | undefined = versionBlock
    ? (() => {
        const bullets = extractBullets(versionBlock);
        const parsed: ParsedAgentVersion = {};
        if (bullets.has("agent version")) parsed.agentVersion = bullets.get("agent version");
        if (bullets.has("blueprint schema version")) parsed.blueprintSchemaVersion = bullets.get("blueprint schema version");
        if (bullets.has("agent factory version")) parsed.factoryVersion = bullets.get("agent factory version");
        return parsed;
      })()
    : undefined;

  return {
    filePath,
    frontmatter,
    tools,
    body,
    ...(preambleBullets.has("category") ? { category: preambleBullets.get("category") } : {}),
    ...(preambleBullets.has("owner") ? { owner: preambleBullets.get("owner") } : {}),
    tags: splitList(preambleBullets.get("tags")),
    ...(permissions ? { permissions } : {}),
    ...(memoryAccess ? { memoryAccess } : {}),
    ...(version ? { version } : {}),
  };
}

export interface AgentLoaderOptions {
  agentsDir?: string;
  registryFile?: string;
}

export class AgentNotFoundError extends Error {
  constructor(public readonly agentId: string) {
    super(`No agent found for id "${agentId}" (checked the registry and .claude/agents/${agentId}.md).`);
    this.name = "AgentNotFoundError";
  }
}

/**
 * Discovers and loads `.claude/agents/*.md` files. Resolution order for
 * `loadByName` mirrors the mission's Registry -> Agent Loader flow: the
 * Registry is checked first (its `filePath` is authoritative when the agent
 * has been registered); if there is no registry entry, it falls back to the
 * conventional `.claude/agents/<name>.md` path so the loader still works for
 * any file that matches the format exactly, registered or not.
 */
export class AgentLoader {
  private readonly agentsDir: string;
  private readonly registryFile: string;

  constructor(options: AgentLoaderOptions = {}) {
    this.agentsDir = options.agentsDir ?? PATHS.agentsOutputDir;
    this.registryFile = options.registryFile ?? PATHS.registryFile;
  }

  /** Every `.claude/agents/*.md` file path currently on disk. */
  async discover(): Promise<string[]> {
    return listFilesWithExtension(this.agentsDir, ".md");
  }

  async loadFromPath(filePath: string): Promise<ParsedAgentFile> {
    const raw = await readTextFile(filePath);
    return parseAgentFile(filePath, raw);
  }

  async loadByName(agentId: string): Promise<ParsedAgentFile> {
    const resolvedPath = await this.resolvePath(agentId);
    if (!resolvedPath) throw new AgentNotFoundError(agentId);
    return this.loadFromPath(resolvedPath);
  }

  /** Resolves an agent id to a file path via the Registry first, then the conventional path. Returns undefined if neither exists. */
  private async resolvePath(agentId: string): Promise<string | undefined> {
    if (await pathExists(this.registryFile)) {
      const registry = await loadRegistry(this.registryFile);
      const entry = findByName(registry, agentId);
      if (entry && (await pathExists(entry.filePath))) return entry.filePath;
    }
    const conventionalPath = path.join(this.agentsDir, `${agentId}.md`);
    if (await pathExists(conventionalPath)) return conventionalPath;
    return undefined;
  }

  /** Loads every discoverable agent file. Individual parse failures are collected, not thrown, so one bad file doesn't block discovery of the rest. */
  async loadAll(): Promise<{ agents: ParsedAgentFile[]; errors: Array<{ filePath: string; error: string }> }> {
    const filePaths = await this.discover();
    const agents: ParsedAgentFile[] = [];
    const errors: Array<{ filePath: string; error: string }> = [];
    for (const filePath of filePaths) {
      try {
        agents.push(await this.loadFromPath(filePath));
      } catch (error) {
        errors.push({ filePath, error: error instanceof Error ? error.message : "unknown parse error" });
      }
    }
    return { agents, errors };
  }
}
