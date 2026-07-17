import { LlmClient } from "../llm/client.js";
import { OllamaProvider } from "../llm/ollama-provider.js";
import { AgentExecutor } from "../runtime/agents/executor.js";
import { AgentLoader } from "../runtime/agents/loader.js";
import { ToolExecutor } from "../runtime/tools/executor.js";
import { createDefaultToolRegistry } from "../runtime/tools/index.js";
import { ApprovalSystem } from "../runtime/approval/system.js";
import { EventBus } from "../runtime/events/bus.js";
import { MemoryEngine } from "../runtime/memory/engine.js";
import { ObservabilityHub } from "../observability/monitor.js";
import { AgentAnalytics } from "../analytics/agents.js";
import { attachAgentAndToolMetrics } from "../observability/agent-tool-metrics.js";
import { attachInteractiveApprovalPrompt } from "./approval-prompt.js";
import type { FounderConfig } from "../settings/founder-config.js";

/**
 * Composes the SAME runtime classes the server (`src/server/wiring.ts`) and
 * the test suites use — `AgentLoader`, `AgentExecutor`, `ToolExecutor`,
 * `LlmClient`/`OllamaProvider`, `ApprovalSystem`, `EventBus`, `MemoryEngine`
 * — into the object graph the `founder` CLI commands need. This is NOT a
 * second execution engine: every command in `founder-commands/` calls
 * straight into these existing classes' own public methods.
 */
export interface FounderRuntimeContext {
  config: FounderConfig;
  llm: LlmClient;
  agentLoader: AgentLoader;
  agentExecutor: AgentExecutor;
  toolExecutor: ToolExecutor;
  approvals: ApprovalSystem;
  bus: EventBus;
  memory: MemoryEngine;
  observability: ObservabilityHub;
  analytics: AgentAnalytics;
}

export interface ComposeFounderRuntimeOptions {
  /** Wires a real interactive [y/N] stdin prompt to "ask-user" tool permission requests. Off by default so non-interactive callers (tests, scripts) never block on stdin. */
  interactiveApprovals?: boolean;
}

export function composeFounderRuntime(config: FounderConfig, options: ComposeFounderRuntimeOptions = {}): FounderRuntimeContext {
  const bus = new EventBus();
  const memory = new MemoryEngine();
  const observability = new ObservabilityHub({ bus });
  const analytics = new AgentAnalytics();
  attachAgentAndToolMetrics(bus, observability, analytics);

  const llm = new LlmClient([new OllamaProvider({ host: config.ollamaHost })], "ollama");
  const agentLoader = new AgentLoader();
  const agentExecutor = new AgentExecutor({ llm, memory, bus });

  const toolRegistry = createDefaultToolRegistry();
  const approvals = new ApprovalSystem({ bus });
  if (options.interactiveApprovals) attachInteractiveApprovalPrompt(bus, approvals);
  const toolExecutor = new ToolExecutor({ registry: toolRegistry, bus, approvals, askUserTimeoutMs: config.approvalTimeoutSeconds * 1000 });

  return { config, llm, agentLoader, agentExecutor, toolExecutor, approvals, bus, memory, observability, analytics };
}
