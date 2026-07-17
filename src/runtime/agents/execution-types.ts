import type { ToolExecutor } from "../tools/executor.js";

/**
 * Types for the agent EXECUTION layer (Loop 2) — loading, parsing, prompting,
 * and running a real `.claude/agents/*.md` file against the LLM Adapter.
 * Additive to `types.ts` (the existing blueprint-based descriptor/status
 * types); does not replace or alter anything there. Loop 3 adds the optional
 * `tools`/`toolWorkingDirectory`/`maxToolTurns` fields below for tool-calling.
 */

/** Strongly typed view of a `.claude/agents/*.md` file's YAML frontmatter block. Exactly the fields present in the real files — nothing invented. */
export interface ParsedAgentFrontmatter {
  name: string;
  description: string;
  /** Raw comma-separated tool list as written in frontmatter (e.g. "Read, Grep, Glob"). */
  tools?: string;
  /** Claude Code-era model hint (e.g. "opus", "sonnet", "inherit") — NOT auto-mapped to a local model. See ParsedAgentFile.modelHint. */
  model?: string;
}

/** "- **Label:** value" bullets parsed from the "## Permissions" body section, when present. */
export interface ParsedAgentPermissions {
  filesystem?: string;
  network?: string;
  shell?: string;
  sensitiveDataAccess?: string;
  allowedTools?: string[];
}

/** Parsed from the "## Memory Access" body section, when present. */
export interface ParsedAgentMemoryAccess {
  scope?: string;
  persistent?: string;
  readPaths?: string[];
  writePaths?: string[];
}

/** Parsed from the "## Version Metadata" body section, when present. */
export interface ParsedAgentVersion {
  agentVersion?: string;
  blueprintSchemaVersion?: string;
  factoryVersion?: string;
}

/**
 * Fully loaded + parsed `.claude/agents/*.md` file, ready to hand to the
 * Prompt Builder. `body` is the file's Markdown body VERBATIM — that body is
 * itself the agent's system prompt (exactly what Claude Code treats it as);
 * this loader never rewrites or summarizes it.
 */
export interface ParsedAgentFile {
  filePath: string;
  frontmatter: ParsedAgentFrontmatter;
  /** Tool names split from frontmatter.tools, trimmed. Empty array if frontmatter.tools is absent. */
  tools: string[];
  /** Full Markdown body (everything after the closing "---"), used as the system prompt. */
  body: string;
  category?: string;
  owner?: string;
  tags: string[];
  permissions?: ParsedAgentPermissions;
  memoryAccess?: ParsedAgentMemoryAccess;
  version?: ParsedAgentVersion;
}

export interface AgentExecutionContext {
  /** Arbitrary caller-supplied key/value context, JSON-rendered into the prompt. */
  [key: string]: unknown;
}

export interface ExecuteAgentOptions {
  /** Explicit local model id to execute with (e.g. "llama3.1"). Overrides AGENT_EXECUTION_MODEL and the built-in default. */
  model?: string;
  /** Which registered LLM provider to use (defaults to the client's default provider, e.g. "ollama"). */
  provider?: string;
  /** How many most-recent shared-memory entries tagged with this agent's name to include as context. Default 5. */
  memoryContextLimit?: number;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /**
   * Loop 3 — Tool Execution Engine integration (additive; omit for the
   * unchanged Loop 2 plain-completion behavior). When set, the agent's
   * available tools (from `tools.toolRegistry.describe()`) are offered to
   * the model; if the model requests a tool call, it is executed via this
   * `ToolExecutor` and the result is fed back for another turn, up to
   * `maxToolTurns`. Requires `toolWorkingDirectory` (the sandbox root every
   * tool call is contained to).
   */
  tools?: ToolExecutor;
  toolWorkingDirectory?: string;
  /** Safety cap on the tool-call loop (default 5) — prevents an unbounded back-and-forth. */
  maxToolTurns?: number;
}

/** One executed tool call, recorded on the result for transparency. */
export interface AgentToolCallRecord {
  name: string;
  arguments: Record<string, unknown>;
  status: "success" | "failure";
  durationMs: number;
}

export type ModelSource = "option" | "env" | "default";

export interface AgentExecutionMetadata {
  agentId: string;
  /** The frontmatter's own `model` value, UNUSED for execution — recorded only for transparency (see resolveModel doc). */
  frontmatterModelHint?: string;
  /** The local model id actually sent to the LLM Adapter. */
  modelUsed: string;
  modelSource: ModelSource;
  provider: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface AgentExecutionSuccess {
  success: true;
  agentId: string;
  response: string;
  metadata: AgentExecutionMetadata;
  /** Every tool call made during this execution, in order — [] when no tools were configured or the model made none. */
  toolCalls: AgentToolCallRecord[];
}

export interface AgentExecutionFailure {
  success: false;
  agentId: string;
  error: { reason: string; message: string };
  metadata: Omit<AgentExecutionMetadata, "promptTokens" | "completionTokens">;
}

export type AgentExecutionResult = AgentExecutionSuccess | AgentExecutionFailure;
