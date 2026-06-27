/**
 * Whitelist of tool names the Agent Factory recognizes when validating a
 * blueprint's `allowedTools` field or a generated agent's `tools` frontmatter.
 *
 * This list mirrors the built-in Claude Code tool surface. It is intentionally
 * centralized here so that adding/removing a tool the platform supports is a
 * one-line change instead of a hunt through generator/validator code.
 */
export const CORE_TOOLS = [
  "Agent",
  "AskUserQuestion",
  "Bash",
  "Edit",
  "Glob",
  "Grep",
  "Read",
  "Write",
  "NotebookEdit",
  "Skill",
  "ToolSearch",
  "ScheduleWakeup",
  "SendUserFile",
  "WebFetch",
  "WebSearch",
  "EnterPlanMode",
  "ExitPlanMode",
  "EnterWorktree",
  "ExitWorktree",
  "Monitor",
  "PushNotification",
  "SendMessage",
  "DesignSync",
  "CronCreate",
  "CronDelete",
  "CronList",
  "TaskCreate",
  "TaskUpdate",
  "TaskGet",
  "TaskList",
  "TaskOutput",
  "TaskStop",
] as const;

export type CoreTool = (typeof CORE_TOOLS)[number];

/** Sentinel meaning "grant every built-in tool" (used by orchestrator-style agents). */
export const WILDCARD_TOOL = "*";

/** MCP-provided tools are namespaced `mcp__<server>__<tool>` and aren't statically known. */
export const MCP_TOOL_PREFIX = "mcp__";

/**
 * Returns true if `tool` is something the Agent Factory will accept inside
 * `allowedTools` / frontmatter `tools`: a known core tool, the wildcard, or an
 * MCP-namespaced tool reference.
 */
export function isKnownTool(tool: string): boolean {
  if (tool === WILDCARD_TOOL) return true;
  if (tool.startsWith(MCP_TOOL_PREFIX)) return true;
  return (CORE_TOOLS as readonly string[]).includes(tool);
}
