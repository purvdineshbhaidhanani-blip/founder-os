import type { EventBus } from "../runtime/events/bus.js";
import type { RuntimeEvent } from "../runtime/events/types.js";
import type { ObservabilityHub } from "./monitor.js";
import type { AgentAnalytics } from "../analytics/agents.js";

/**
 * Loop 4 observability wiring for Loops 2/3. `AgentExecutor` and
 * `ToolExecutor` already publish `agent.execution.*`/`tool.*` events on the
 * `EventBus` (built in Loops 2/3); nothing there needed to change. This
 * module only SUBSCRIBES, forwarding into the EXISTING `ObservabilityHub`
 * (metrics/health) and `AgentAnalytics` (per-agent success/duration
 * rollups) — no new metrics store, no modification to either executor.
 */
export function attachAgentAndToolMetrics(bus: EventBus, observability: ObservabilityHub, analytics: AgentAnalytics): void {
  bus.subscribe({ namePattern: "^agent\\.execution\\." }, (event: RuntimeEvent) => {
    observability.metric(`event.${event.name}`, 1, { source: event.source ?? "" });

    if (event.name === "agent.execution.completed") {
      const payload = event.payload as { agentId?: string; durationMs?: number };
      observability.metric("agent.execution.durationMs", payload.durationMs ?? 0, { agent: payload.agentId ?? "" });
      if (payload.agentId) analytics.record({ agent: payload.agentId, ok: true, durationMs: payload.durationMs ?? 0 });
    }
    if (event.name === "agent.execution.failed") {
      const payload = event.payload as { agentId?: string; reason?: string };
      observability.metric("agent.execution.failure", 1, { agent: payload.agentId ?? "", reason: payload.reason ?? "" });
      if (payload.agentId) analytics.record({ agent: payload.agentId, ok: false, durationMs: 0 });
    }
  });

  bus.subscribe({ namePattern: "^tool\\." }, (event: RuntimeEvent) => {
    observability.metric(`event.${event.name}`, 1, { source: event.source ?? "" });
    if (event.name === "tool.finished" || event.name === "tool.failed") {
      const payload = event.payload as { toolId?: string };
      observability.metric("tool.usage", 1, { tool: payload.toolId ?? "", outcome: event.name === "tool.finished" ? "success" : "failure" });
    }
  });
}

/** Read-only summary the `founder doctor`/CLI commands render — pure projection over ObservabilityHub + AgentAnalytics, no new state. */
export interface RuntimeMetricsSummary {
  agentExecutions: number;
  agentFailures: number;
  toolExecutions: number;
  toolFailures: number;
  topAgents: ReturnType<AgentAnalytics["all"]>;
}

export function summarizeRuntimeMetrics(observability: ObservabilityHub, analytics: AgentAnalytics): RuntimeMetricsSummary {
  const agentExecutions = observability.metricsByName("event.agent.execution.completed", 100_000).length;
  const agentFailures = observability.metricsByName("event.agent.execution.failed", 100_000).length;
  const toolExecutions = observability.metricsByName("event.tool.finished", 100_000).length;
  const toolFailures = observability.metricsByName("event.tool.failed", 100_000).length;
  return { agentExecutions, agentFailures, toolExecutions, toolFailures, topAgents: analytics.all() };
}
