import YAML from "yaml";

export interface ParsedFrontmatter<T = Record<string, unknown>> {
  data: T;
  body: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Renders a YAML frontmatter block + Markdown body, matching the format
 * Claude Code expects for `.claude/agents/*.md` files:
 *
 * ---
 * name: agent-name
 * description: ...
 * ---
 * <body>
 */
export function renderFrontmatter(data: Record<string, unknown>, body: string): string {
  const yamlBlock = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yamlBlock}\n---\n\n${body.trimStart()}\n`;
}

/** Parses a Markdown file with a leading YAML frontmatter block. Throws if the block is malformed. */
export function parseFrontmatter<T = Record<string, unknown>>(content: string): ParsedFrontmatter<T> {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) {
    throw new Error("No valid YAML frontmatter block found (expected leading --- ... --- block).");
  }
  const [, rawYaml, body] = match;
  const data = (YAML.parse(rawYaml ?? "") ?? {}) as T;
  return { data, body: (body ?? "").trimStart() };
}
