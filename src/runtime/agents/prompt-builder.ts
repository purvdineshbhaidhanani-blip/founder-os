import type { LlmMessage } from "../../llm/types.js";
import type { MemoryEngine } from "../memory/engine.js";
import type { AgentExecutionContext, ParsedAgentFile } from "./execution-types.js";

/**
 * Prompt Builder (Loop 2) — turns a loaded `.claude/agents/*.md` file plus a
 * caller's task into the `LlmMessage[]` the LLM Adapter expects. Builds
 * exactly three message roles:
 *
 *  1. `system`  — the agent's Markdown body VERBATIM (that body already IS
 *                 the system prompt in this repo's existing convention —
 *                 nothing is rewritten or reformatted).
 *  2. `user`    — the caller's task, plus any runtime context and recent
 *                 shared-memory entries, rendered as labeled JSON blocks so
 *                 the model can distinguish "the task" from "prior context"
 *                 from "shared memory".
 *
 * No LLM call happens here — this module only assembles messages.
 */

const DEFAULT_MEMORY_CONTEXT_LIMIT = 5;

export interface BuildPromptOptions {
  memory?: MemoryEngine;
  memoryContextLimit?: number;
}

/** Fetches the most recent shared-memory entries tagged with this agent's name, newest first. Returns [] when no memory engine is supplied or none match. */
async function loadMemoryContext(
  agentName: string,
  memory: MemoryEngine | undefined,
  limit: number,
): Promise<Array<{ key: string; data: unknown; updatedAt: string }>> {
  if (!memory || limit <= 0) return [];
  const entries = await memory.recall({ tag: agentName, limit });
  return entries.map((entry) => ({ key: entry.key, data: entry.data, updatedAt: entry.updatedAt }));
}

export async function buildAgentPrompt(
  agent: ParsedAgentFile,
  task: string,
  context: AgentExecutionContext = {},
  options: BuildPromptOptions = {},
): Promise<LlmMessage[]> {
  const memoryContext = await loadMemoryContext(
    agent.frontmatter.name,
    options.memory,
    options.memoryContextLimit ?? DEFAULT_MEMORY_CONTEXT_LIMIT,
  );

  const userSections: string[] = [`## Task\n\n${task}`];

  if (Object.keys(context).length > 0) {
    userSections.push(`## Runtime Context\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``);
  }

  if (memoryContext.length > 0) {
    userSections.push(
      `## Shared Memory (most recent ${memoryContext.length} entr${memoryContext.length === 1 ? "y" : "ies"} tagged "${agent.frontmatter.name}")\n\n\`\`\`json\n${JSON.stringify(memoryContext, null, 2)}\n\`\`\``,
    );
  }

  return [
    { role: "system", content: agent.body },
    { role: "user", content: userSections.join("\n\n") },
  ];
}
