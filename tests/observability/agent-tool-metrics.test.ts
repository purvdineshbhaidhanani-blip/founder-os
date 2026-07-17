import { describe, expect, it } from "vitest";
import { EventBus } from "../../src/runtime/events/bus.js";
import { ObservabilityHub } from "../../src/observability/monitor.js";
import { AgentAnalytics } from "../../src/analytics/agents.js";
import { attachAgentAndToolMetrics, summarizeRuntimeMetrics } from "../../src/observability/agent-tool-metrics.js";

describe("attachAgentAndToolMetrics", () => {
  it("forwards agent.execution.completed into ObservabilityHub metrics and AgentAnalytics", async () => {
    const bus = new EventBus();
    const observability = new ObservabilityHub({ bus });
    const analytics = new AgentAnalytics();
    attachAgentAndToolMetrics(bus, observability, analytics);

    await bus.publish({
      name: "agent.execution.completed",
      source: "market-research-agent",
      payload: { agentId: "market-research-agent", durationMs: 1234, modelUsed: "llama3.1" },
    });

    expect(observability.metricsByName("event.agent.execution.completed")).toHaveLength(1);
    expect(observability.metricsByName("agent.execution.durationMs")[0]?.value).toBe(1234);
    const view = analytics.view("market-research-agent");
    expect(view?.executionCount).toBe(1);
    expect(view?.successRate).toBe(1);
  });

  it("forwards agent.execution.failed into both, marking a failure not a success", async () => {
    const bus = new EventBus();
    const observability = new ObservabilityHub({ bus });
    const analytics = new AgentAnalytics();
    attachAgentAndToolMetrics(bus, observability, analytics);

    await bus.publish({
      name: "agent.execution.failed",
      source: "report-generator",
      payload: { agentId: "report-generator", reason: "unavailable", message: "no daemon" },
    });

    expect(observability.metricsByName("agent.execution.failure")).toHaveLength(1);
    const view = analytics.view("report-generator");
    expect(view?.executionCount).toBe(1);
    expect(view?.failureRate).toBe(1);
    expect(view?.successRate).toBe(0);
  });

  it("forwards tool.finished/tool.failed into tool.usage metrics", async () => {
    const bus = new EventBus();
    const observability = new ObservabilityHub({ bus });
    const analytics = new AgentAnalytics();
    attachAgentAndToolMetrics(bus, observability, analytics);

    await bus.publish({ name: "tool.finished", source: "read_file", payload: { toolId: "read_file", attempts: 1 } });
    await bus.publish({ name: "tool.failed", source: "run_bash", payload: { toolId: "run_bash", reason: "timeout" } });

    const usage = observability.metricsByName("tool.usage");
    expect(usage).toHaveLength(2);
    expect(usage.map((m) => m.tags?.outcome).sort()).toEqual(["failure", "success"]);
  });

  it("summarizeRuntimeMetrics projects a clean aggregate over both stores", async () => {
    const bus = new EventBus();
    const observability = new ObservabilityHub({ bus });
    const analytics = new AgentAnalytics();
    attachAgentAndToolMetrics(bus, observability, analytics);

    await bus.publish({ name: "agent.execution.completed", source: "a", payload: { agentId: "a", durationMs: 10 } });
    await bus.publish({ name: "agent.execution.failed", source: "b", payload: { agentId: "b", reason: "x" } });
    await bus.publish({ name: "tool.finished", source: "t", payload: { toolId: "t" } });

    const summary = summarizeRuntimeMetrics(observability, analytics);
    expect(summary.agentExecutions).toBe(1);
    expect(summary.agentFailures).toBe(1);
    expect(summary.toolExecutions).toBe(1);
    expect(summary.topAgents.length).toBe(2);
  });
});
