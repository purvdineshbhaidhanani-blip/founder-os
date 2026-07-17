import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolExecutor } from "../../../src/runtime/tools/executor.js";
import { ToolRegistry } from "../../../src/runtime/tools/registry.js";
import { ApprovalSystem } from "../../../src/runtime/approval/system.js";
import { EventBus } from "../../../src/runtime/events/bus.js";
import type { ToolDefinition, ToolExecutionContext } from "../../../src/runtime/tools/types.js";

function makeContext(overrides: Partial<ToolExecutionContext> = {}): ToolExecutionContext {
  return { workingDirectory: "/tmp/does-not-matter-for-these-tools", ...overrides };
}

function makeTool(overrides: Partial<ToolDefinition<{ value?: string }, unknown>> = {}): ToolDefinition {
  return {
    id: "test_tool",
    name: "Test Tool",
    description: "A test tool.",
    capabilities: ["read"],
    permission: { mode: "allowed", reason: "test" },
    inputSchema: z.object({ value: z.string().optional() }),
    timeoutMs: 1000,
    retryPolicy: { maxAttempts: 1, baseDelayMs: 10 },
    run: async () => ({ ok: true }),
    ...overrides,
  } as ToolDefinition;
}

describe("ToolExecutor — input validation", () => {
  it("rejects input that fails the tool's zod schema without ever calling run()", async () => {
    let ran = false;
    const registry = new ToolRegistry();
    registry.register(makeTool({ inputSchema: z.object({ value: z.string() }), run: async () => { ran = true; return {}; } }));
    const executor = new ToolExecutor({ registry });

    const result = await executor.execute("test_tool", { value: 123 }, makeContext());

    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("invalid-input");
    expect(ran).toBe(false);
  });

  it("returns a structured failure for an unknown tool id", async () => {
    const executor = new ToolExecutor({ registry: new ToolRegistry() });
    const result = await executor.execute("no_such_tool", {}, makeContext());
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("tool-not-found");
  });
});

describe("ToolExecutor — permission modes", () => {
  it("denied: never calls run(), returns permission-denied", async () => {
    let ran = false;
    const registry = new ToolRegistry();
    registry.register(makeTool({ permission: { mode: "denied", reason: "no" }, run: async () => { ran = true; return {}; } }));
    const executor = new ToolExecutor({ registry });

    const result = await executor.execute("test_tool", {}, makeContext());
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("permission-denied");
    expect(result.metadata.permissionDenied).toBe(true);
    expect(ran).toBe(false);
  });

  it("read-only: allows a tool with no mutating capability tag", async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ permission: { mode: "read-only", reason: "x" }, capabilities: ["read"] }));
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("test_tool", {}, makeContext());
    expect(result.status).toBe("success");
  });

  it("read-only: denies a tool that declares a mutating capability", async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ permission: { mode: "read-only", reason: "x" }, capabilities: ["write"] }));
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("test_tool", {}, makeContext());
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("permission-denied");
  });

  it("workspace-only: passes through as allowed (enforcement lives in the tool body's own sandbox check)", async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ permission: { mode: "workspace-only", reason: "x" } }));
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("test_tool", {}, makeContext());
    expect(result.status).toBe("success");
  });

  it("ask-user: denies (never silently allows) when no ApprovalSystem is configured", async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ permission: { mode: "ask-user", reason: "needs a human" } }));
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("test_tool", {}, makeContext());
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("permission-denied");
  });

  it("ask-user: runs the tool only after the ApprovalSystem grants the request", async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ permission: { mode: "ask-user", reason: "needs a human" } }));
    const approvals = new ApprovalSystem();
    const executor = new ToolExecutor({ registry, approvals });

    const resultPromise = executor.execute("test_tool", {}, makeContext({ agent: "market-research-agent" }));
    // Give the executor a tick to register the approval request, then grant it.
    await new Promise((resolve) => setTimeout(resolve, 10));
    const pending = approvals.list({ status: "pending" });
    expect(pending).toHaveLength(1);
    approvals.grant(pending[0]!.id, "operator");

    const result = await resultPromise;
    expect(result.status).toBe("success");
  });

  it("ask-user: denies the tool when the ApprovalSystem rejects the request", async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ permission: { mode: "ask-user", reason: "needs a human" } }));
    const approvals = new ApprovalSystem();
    const executor = new ToolExecutor({ registry, approvals });

    const resultPromise = executor.execute("test_tool", {}, makeContext());
    await new Promise((resolve) => setTimeout(resolve, 10));
    const pending = approvals.list({ status: "pending" })[0]!;
    approvals.reject(pending.id, "operator");

    const result = await resultPromise;
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("permission-denied");
  });
});

describe("ToolExecutor — retry and timeout", () => {
  it("retries up to maxAttempts, then returns failure with the last error", async () => {
    let calls = 0;
    const registry = new ToolRegistry();
    registry.register(
      makeTool({
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
        run: async () => {
          calls += 1;
          throw new Error(`boom ${calls}`);
        },
      }),
    );
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("test_tool", {}, makeContext());

    expect(calls).toBe(3);
    expect(result.status).toBe("failure");
    expect(result.error?.message).toBe("boom 3");
    expect(result.metadata.attempts).toBe(3);
  });

  it("succeeds on a later attempt after earlier ones fail", async () => {
    let calls = 0;
    const registry = new ToolRegistry();
    registry.register(
      makeTool({
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
        run: async () => {
          calls += 1;
          if (calls < 2) throw new Error("transient");
          return { ok: true };
        },
      }),
    );
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("test_tool", {}, makeContext());
    expect(result.status).toBe("success");
    expect(result.metadata.attempts).toBe(2);
  });

  it("fails with reason 'timeout' when the tool exceeds its timeoutMs", async () => {
    const registry = new ToolRegistry();
    registry.register(
      makeTool({
        timeoutMs: 30,
        retryPolicy: { maxAttempts: 1, baseDelayMs: 0 },
        run: () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 500)),
      }),
    );
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("test_tool", {}, makeContext());
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("timeout");
  });

  it("respects an external AbortSignal, failing with reason 'cancelled' and not retrying", async () => {
    let calls = 0;
    const registry = new ToolRegistry();
    registry.register(
      makeTool({
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
        run: () => new Promise((_, reject) => setTimeout(() => reject(new Error("should not finish")), 500)).finally(() => {
          calls += 1;
        }),
      }),
    );
    const executor = new ToolExecutor({ registry });
    const controller = new AbortController();
    const resultPromise = executor.execute("test_tool", {}, makeContext({ signal: controller.signal }));
    setTimeout(() => controller.abort(), 20);

    const result = await resultPromise;
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("cancelled");
    expect(calls).toBeLessThanOrEqual(1);
  });
});

describe("ToolExecutor — events", () => {
  it("publishes tool.started and tool.finished for a successful run", async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool());
    const bus = new EventBus();
    const events: string[] = [];
    bus.subscribe({ namePattern: "^tool\\." }, (event) => {
      events.push(event.name);
    });
    const executor = new ToolExecutor({ registry, bus });
    await executor.execute("test_tool", {}, makeContext());
    expect(events).toEqual(["tool.started", "tool.finished"]);
  });

  it("publishes tool.retry then tool.failed for a tool that exhausts retries", async () => {
    const registry = new ToolRegistry();
    registry.register(
      makeTool({ retryPolicy: { maxAttempts: 2, baseDelayMs: 1 }, run: async () => { throw new Error("x"); } }),
    );
    const bus = new EventBus();
    const events: string[] = [];
    bus.subscribe({ namePattern: "^tool\\." }, (event) => events.push(event.name));
    const executor = new ToolExecutor({ registry, bus });
    await executor.execute("test_tool", {}, makeContext());
    expect(events).toEqual(["tool.started", "tool.retry", "tool.failed"]);
  });
});

describe("ToolExecutor — structured result shape", () => {
  it("every result carries status/metadata/duration, success carries data, failure carries error", async () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ run: async () => ({ answer: 42 }) }));
    const executor = new ToolExecutor({ registry });

    const success = await executor.execute("test_tool", {}, makeContext());
    expect(success.status).toBe("success");
    expect(success.data).toEqual({ answer: 42 });
    expect(success.error).toBeUndefined();
    expect(typeof success.duration).toBe("number");
    expect(success.metadata.toolId).toBe("test_tool");

    const failRegistry = new ToolRegistry();
    failRegistry.register(makeTool({ id: "fail_tool", run: async () => { throw new Error("nope"); } }));
    const failExecutor = new ToolExecutor({ registry: failRegistry });
    const failure = await failExecutor.execute("fail_tool", {}, makeContext());
    expect(failure.status).toBe("failure");
    expect(failure.data).toBeUndefined();
    expect(failure.error?.message).toBe("nope");
  });
});
