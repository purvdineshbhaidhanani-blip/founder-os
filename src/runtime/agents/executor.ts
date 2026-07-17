import { nowIso } from "../../utils/id.js";
import { createLogger } from "../../utils/logger.js";
import { LlmError, type LlmClient, type LlmMessage, type LlmTool } from "../../llm/index.js";
import type { MemoryEngine } from "../memory/engine.js";
import type { EventBus } from "../events/bus.js";
import { AgentLoader, type AgentLoaderOptions } from "./loader.js";
import { buildAgentPrompt } from "./prompt-builder.js";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentToolCallRecord,
  ExecuteAgentOptions,
  ModelSource,
} from "./execution-types.js";

/** Default cap on the tool-call back-and-forth (see ExecuteAgentOptions.maxToolTurns). */
const DEFAULT_MAX_TOOL_TURNS = 5;

const logger = createLogger("runtime.agents.executor");

/** Local model used when no explicit model is given (see resolveModel doc). Override via ExecuteAgentOptions.model or AGENT_EXECUTION_MODEL. */
export const DEFAULT_LOCAL_MODEL = "llama3.1";

/**
 * Resolves the LOCAL model id to execute an agent with.
 *
 * The frontmatter `model` field (e.g. "opus", "sonnet") is a Claude
 * Code-era hint about which Anthropic model the agent was DESIGNED for — it
 * is never auto-translated into a local Ollama model name here. Inventing
 * such a mapping (e.g. "opus" -> "llama3.1:70b") would be a fabricated
 * decision this module has no basis for. Instead the caller states the local
 * model explicitly (`options.model`), or an operator sets it once via
 * `AGENT_EXECUTION_MODEL`, or the documented default is used. The
 * frontmatter hint is still recorded on the result (`frontmatterModelHint`)
 * for transparency, never silently discarded.
 */
export function resolveModel(options: ExecuteAgentOptions, env: NodeJS.ProcessEnv = process.env): { model: string; source: ModelSource } {
  if (options.model) return { model: options.model, source: "option" };
  if (env.AGENT_EXECUTION_MODEL) return { model: env.AGENT_EXECUTION_MODEL, source: "env" };
  return { model: DEFAULT_LOCAL_MODEL, source: "default" };
}

export interface AgentExecutorOptions extends AgentLoaderOptions {
  llm: LlmClient;
  memory?: MemoryEngine;
  bus?: EventBus;
}

/**
 * Agent Execution Engine (Loop 2) — the missing link identified in the
 * dependency audit: takes a `.claude/agents/*.md` file that previously only
 * the Claude Code harness could run, and executes it against the existing
 * LLM Adapter (`src/llm`). Extends the existing Runtime family
 * (`src/runtime/agents/`) additively; does not modify `AgentRuntime`,
 * `MemoryEngine`, `LlmClient`, or the Registry.
 *
 * Reuse, not duplication:
 *  - Discovery/parsing: `AgentLoader` (this same module), built on the
 *    EXISTING `parseFrontmatter` and Registry lookup — no second parser.
 *  - Model execution: the EXISTING `LlmClient` only — no direct Ollama call,
 *    no provider-specific logic here.
 *  - Shared context: the EXISTING `MemoryEngine` (`recall`/`remember`) — no
 *    new memory store.
 *  - Visibility: the EXISTING `EventBus`, when supplied, mirroring how
 *    `ResearchEngine`/`MonitorEngine` already publish lifecycle events.
 *
 * Every operational failure (missing agent, unreachable model, malformed
 * response) resolves to a structured `AgentExecutionResult` with
 * `success: false` — this method never throws for an operational failure,
 * matching the never-throw discipline already used by `SourceAdapter`/
 * `MonitorProvider` elsewhere in this codebase.
 */
export class AgentExecutor {
  private readonly loader: AgentLoader;
  private readonly llm: LlmClient;
  private readonly memory?: MemoryEngine;
  private readonly bus?: EventBus;

  constructor(options: AgentExecutorOptions) {
    this.loader = new AgentLoader(options);
    this.llm = options.llm;
    this.memory = options.memory;
    this.bus = options.bus;
  }

  /**
   * Loads `agentId`, builds its prompt (system = agent body, user = task +
   * context + recent shared memory), executes it via the LLM Adapter, and
   * returns a structured result. Flow: Registry -> Agent Loader -> Prompt
   * Builder -> LLM Adapter -> structured response.
   */
  async executeAgent(
    agentId: string,
    task: string,
    context: AgentExecutionContext = {},
    options: ExecuteAgentOptions = {},
  ): Promise<AgentExecutionResult> {
    const startedAt = nowIso();
    const { model, source: modelSource } = resolveModel(options);
    const provider = options.provider ?? this.llm.defaultProvider;

    void this.bus?.publish({
      name: "agent.execution.started",
      source: agentId,
      payload: { agentId, model, provider },
    });

    let agent;
    try {
      agent = await this.loader.loadByName(agentId);
    } catch (error) {
      return this.failure(agentId, startedAt, model, modelSource, provider, "agent-not-found", error);
    }

    const messages = await buildAgentPrompt(agent, task, context, {
      ...(this.memory ? { memory: this.memory } : {}),
      ...(options.memoryContextLimit !== undefined ? { memoryContextLimit: options.memoryContextLimit } : {}),
    });

    // Loop 3 — Tool Execution Engine integration. Reuses ONLY the existing
    // LLM Adapter's (additive) tool-calling fields; the tool-call loop lives
    // HERE, not inside the adapter, so LlmClient/OllamaProvider stay generic.
    const llmTools: LlmTool[] | undefined = options.tools
      ? options.tools.toolRegistry.describe().map((descriptor) => ({
          name: descriptor.id,
          description: descriptor.description,
          parameters: descriptor.inputJsonSchema,
        }))
      : undefined;
    const toolCallRecords: AgentToolCallRecord[] = [];
    const maxToolTurns = options.maxToolTurns ?? DEFAULT_MAX_TOOL_TURNS;

    try {
      let result;
      for (let turn = 0; ; turn += 1) {
        result = await this.llm.complete(
          {
            model,
            messages,
            ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
            ...(options.signal ? { signal: options.signal } : {}),
            ...(llmTools ? { tools: llmTools } : {}),
          },
          provider,
        );

        const requestedCalls = result.toolCalls ?? [];
        if (requestedCalls.length === 0 || !options.tools || turn >= maxToolTurns) {
          if (requestedCalls.length > 0 && !options.tools) {
            logger.warn("model requested tool calls but no ToolExecutor was configured; returning text response as-is", {
              agentId,
              requestedTools: requestedCalls.map((c) => c.name),
            });
          }
          break;
        }

        messages.push({ role: "assistant", content: result.text, toolCalls: requestedCalls });

        for (const call of requestedCalls) {
          const toolResult = await options.tools.execute(call.name, call.arguments, {
            task,
            agent: agentId,
            workingDirectory: options.toolWorkingDirectory ?? ".",
            ...(options.signal ? { signal: options.signal } : {}),
          });
          toolCallRecords.push({
            name: call.name,
            arguments: call.arguments,
            status: toolResult.status,
            durationMs: toolResult.duration,
          });
          const toolMessage: LlmMessage = {
            role: "tool",
            toolCallId: call.id,
            content: JSON.stringify(toolResult.status === "success" ? toolResult.data : { error: toolResult.error }),
          };
          messages.push(toolMessage);
        }
      }

      const completedAt = nowIso();
      const durationMs = Date.parse(completedAt) - Date.parse(startedAt);

      const executionResult: AgentExecutionResult = {
        success: true,
        agentId,
        response: result.text,
        toolCalls: toolCallRecords,
        metadata: {
          agentId,
          ...(agent.frontmatter.model ? { frontmatterModelHint: agent.frontmatter.model } : {}),
          modelUsed: result.model,
          modelSource,
          provider: result.provider,
          startedAt,
          completedAt,
          durationMs,
          ...(result.promptTokens !== undefined ? { promptTokens: result.promptTokens } : {}),
          ...(result.completionTokens !== undefined ? { completionTokens: result.completionTokens } : {}),
        },
      };

      if (this.memory) {
        await this.memory.remember("agent", `execution:${agentId}:${startedAt}`, executionResult, {
          tags: [agentId, "agent-execution"],
        });
      }

      void this.bus?.publish({
        name: "agent.execution.completed",
        source: agentId,
        payload: { agentId, durationMs, modelUsed: result.model, toolCallCount: toolCallRecords.length },
      });

      logger.info("agent execution succeeded", { agentId, model: result.model, durationMs, toolCallCount: toolCallRecords.length });
      return executionResult;
    } catch (error) {
      return this.failure(agentId, startedAt, model, modelSource, provider, "llm-error", error);
    }
  }

  /** Every discoverable agent's id (frontmatter `name`) — for callers that want to list what's executable. */
  async listExecutableAgents(): Promise<string[]> {
    const { agents } = await this.loader.loadAll();
    return agents.map((agent) => agent.frontmatter.name).filter(Boolean);
  }

  private async failure(
    agentId: string,
    startedAt: string,
    model: string,
    modelSource: ModelSource,
    provider: string,
    reasonPrefix: "agent-not-found" | "llm-error",
    error: unknown,
  ): Promise<AgentExecutionResult> {
    const completedAt = nowIso();
    const durationMs = Date.parse(completedAt) - Date.parse(startedAt);
    const reason = error instanceof LlmError ? error.reason : reasonPrefix;
    const message = error instanceof Error ? error.message : `unknown ${reasonPrefix} error`;

    const executionResult: AgentExecutionResult = {
      success: false,
      agentId,
      error: { reason, message },
      metadata: { agentId, modelUsed: model, modelSource, provider, startedAt, completedAt, durationMs },
    };

    void this.bus?.publish({
      name: "agent.execution.failed",
      source: agentId,
      payload: { agentId, reason, message },
    });

    logger.error("agent execution failed", { agentId, reason, message });
    return executionResult;
  }
}
