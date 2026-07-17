import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentExecutor } from "../../src/runtime/agents/executor.js";
import { LlmClient } from "../../src/llm/client.js";
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "../../src/llm/types.js";
import { ToolExecutor } from "../../src/runtime/tools/executor.js";
import { createDefaultToolRegistry } from "../../src/runtime/tools/index.js";
import { ApprovalSystem } from "../../src/runtime/approval/system.js";
import { EventBus } from "../../src/runtime/events/bus.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";

/**
 * End-to-end proof of the mission's exact diagram:
 *   User -> Runtime -> Agent Loader -> Prompt Builder -> LLM Adapter ->
 *   Tool Registry -> Tool Executor -> Tool -> Response
 *
 * Exercised against the REAL .claude/agents/*.md files this repo ships
 * (market-research-agent, problem-discovery-agent, report-generator), a real
 * sandboxed temp workspace, and the real File Tools — only the LLM backend
 * is stubbed (no live Ollama daemon in this environment).
 */

function autoApprovingSystem(): ApprovalSystem {
  const bus = new EventBus();
  const approvals = new ApprovalSystem({ bus });
  bus.subscribe({ name: "approval.requested" }, (event) => {
    const { id } = event.payload as { id: string };
    approvals.grant(id, "test-auto-approver");
  });
  return approvals;
}

/** A scripted provider: turn 1 requests a real tool call (list_directory), turn 2 answers using the tool's result. */
class ScriptedToolCallingProvider implements LlmProvider {
  readonly id = "ollama";
  public requests: LlmCompletionRequest[] = [];

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    this.requests.push(request);
    const alreadyCalledTool = request.messages.some((m) => m.role === "tool");

    if (!alreadyCalledTool) {
      return {
        text: "Let me check the workspace first.",
        provider: this.id,
        model: request.model,
        toolCalls: [{ id: "call_0", name: "list_directory", arguments: { path: "." } }],
      };
    }

    const toolMessage = request.messages.find((m) => m.role === "tool");
    return {
      text: `Based on the workspace contents (${toolMessage?.content}), here is the research report.`,
      provider: this.id,
      model: request.model,
    };
  }
}

describe("Tool-calling AgentExecutor — real agent files + real tools, end to end", () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(os.tmpdir(), "founder-os-tool-agent-"));
    await writeFile(path.join(workspace, "market-notes.md"), "# TAM notes\n", "utf-8");
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it.each(["market-research-agent", "problem-discovery-agent", "report-generator"])(
    "%s: Runtime -> Agent Loader -> Prompt Builder -> LLM Adapter -> Tool Registry -> Tool Executor -> Tool -> Response",
    async (agentId) => {
      const provider = new ScriptedToolCallingProvider();
      const llm = new LlmClient([provider], "ollama");
      const toolRegistry = createDefaultToolRegistry();
      const memory = new MemoryEngine(new InMemoryStore());
      const bus = new EventBus();
      const toolExecutor = new ToolExecutor({ registry: toolRegistry, approvals: autoApprovingSystem(), bus });
      const toolEvents: string[] = [];
      bus.subscribe({ namePattern: "^tool\\." }, (event) => toolEvents.push(event.name));

      const agentExecutor = new AgentExecutor({ llm, memory, bus });

      const result = await agentExecutor.executeAgent(
        agentId,
        "Find me a SaaS idea for dentists.",
        {},
        { tools: toolExecutor, toolWorkingDirectory: workspace },
      );

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("expected success");

      // The model actually requested and received a real tool result.
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0]).toMatchObject({ name: "list_directory", status: "success" });
      expect(result.response).toContain("market-notes.md");

      // The Tool Registry really was used to describe tools to the model (Tool Registry step of the diagram).
      const firstRequest = provider.requests[0]!;
      expect(firstRequest.tools?.some((t) => t.name === "list_directory")).toBe(true);
      expect(firstRequest.tools!.length).toBeGreaterThan(5); // the full built-in tool catalog was offered

      // The Tool Executor really ran (events fired) — proves the "Tool Executor -> Tool" leg, not a bypass.
      expect(toolEvents).toEqual(["tool.started", "tool.finished"]);

      // Two full LLM turns happened: the tool-request turn and the final-answer turn.
      expect(provider.requests).toHaveLength(2);
      expect(provider.requests[1]!.messages.some((m) => m.role === "tool")).toBe(true);
    },
  );

  it("never bypasses the ToolExecutor's permission system: a denied tool call surfaces as a structured tool result, not a crash", async () => {
    class RequestsWriteTool implements LlmProvider {
      readonly id = "ollama";
      async isAvailable() {
        return true;
      }
      async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
        const alreadyCalled = request.messages.some((m) => m.role === "tool");
        if (!alreadyCalled) {
          return {
            text: "writing",
            provider: this.id,
            model: request.model,
            toolCalls: [{ id: "call_0", name: "write_file", arguments: { path: "x.txt", content: "y" } }],
          };
        }
        return { text: "done", provider: this.id, model: request.model };
      }
    }

    const llm = new LlmClient([new RequestsWriteTool()], "ollama");
    const toolRegistry = createDefaultToolRegistry();
    // No ApprovalSystem configured -> write_file's "ask-user" permission denies.
    const toolExecutor = new ToolExecutor({ registry: toolRegistry });
    const agentExecutor = new AgentExecutor({ llm });

    const result = await agentExecutor.executeAgent(
      "market-research-agent",
      "task",
      {},
      { tools: toolExecutor, toolWorkingDirectory: workspace },
    );

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.toolCalls[0]).toMatchObject({ name: "write_file", status: "failure" });
  });

  it("Loop 2 behavior is fully preserved when no tools are configured (backward compatible)", async () => {
    const provider = new ScriptedToolCallingProvider();
    const llm = new LlmClient([provider], "ollama");
    const agentExecutor = new AgentExecutor({ llm });

    const result = await agentExecutor.executeAgent("report-generator", "task");
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.toolCalls).toEqual([]);
    // Without a ToolExecutor, no `tools` field is ever sent — the model never even got the option to call one.
    expect(provider.requests[0]!.tools).toBeUndefined();
  });
});
