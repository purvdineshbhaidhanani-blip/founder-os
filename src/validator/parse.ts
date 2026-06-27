import type { GeneratedAgentFile, AgentFrontmatter } from "../types/agent.js";
import { parseFrontmatter } from "../utils/frontmatter.js";

/** Re-parses a raw `.md` file's contents (frontmatter + body) into the same shape the Generator produces. */
export function parseGeneratedAgentFile(filePath: string, raw: string): GeneratedAgentFile {
  const { data, body } = parseFrontmatter<AgentFrontmatter>(raw);
  return { filePath, frontmatter: data, body, raw };
}
