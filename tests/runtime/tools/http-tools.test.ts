import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolExecutor } from "../../../src/runtime/tools/executor.js";
import { ToolRegistry } from "../../../src/runtime/tools/registry.js";
import { ApprovalSystem } from "../../../src/runtime/approval/system.js";
import { EventBus } from "../../../src/runtime/events/bus.js";
import { HTTP_TOOLS } from "../../../src/runtime/tools/implementations/http-tools.js";
import type { ToolExecutionContext } from "../../../src/runtime/tools/types.js";

function autoApprovingSystem(): ApprovalSystem {
  const bus = new EventBus();
  const approvals = new ApprovalSystem({ bus });
  bus.subscribe({ name: "approval.requested" }, (event) => {
    const { id } = event.payload as { id: string };
    approvals.grant(id, "test-auto-approver");
  });
  return approvals;
}

const context: ToolExecutionContext = { workingDirectory: "/tmp/does-not-matter-for-http-tools" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HTTP Tools — SSRF guard (real, no network needed)", () => {
  it("http_get is REJECTED for loopback targets without ever calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const registry = new ToolRegistry();
    registry.registerAll(HTTP_TOOLS);
    const executor = new ToolExecutor({ registry });

    const result = await executor.execute("http_get", { url: "http://127.0.0.1:11434/api/tags" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.message).toContain("Blocked request target");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("http_get is REJECTED for the cloud-metadata address", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const registry = new ToolRegistry();
    registry.registerAll(HTTP_TOOLS);
    const executor = new ToolExecutor({ registry });

    const result = await executor.execute("http_get", { url: "http://169.254.169.254/latest/meta-data/" }, context);
    expect(result.status).toBe("failure");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("http_get rejects a non-http(s) scheme", async () => {
    const registry = new ToolRegistry();
    registry.registerAll(HTTP_TOOLS);
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("http_get", { url: "file:///etc/passwd" }, context);
    expect(result.status).toBe("failure");
  });
});

describe("HTTP Tools — request/response mapping (mocked transfer)", () => {
  it("http_get sends the request and maps status/headers/body", async () => {
    const fetchSpy = vi.fn(async () => ({
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => '{"ok":true}',
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const registry = new ToolRegistry();
    registry.registerAll(HTTP_TOOLS);
    const executor = new ToolExecutor({ registry });

    const result = await executor.execute("http_get", { url: "https://example.com/api", headers: { "X-Test": "1" } }, context);
    expect(result.status).toBe("success");
    const data = result.data as { status: number; body: string; headers: Record<string, string> };
    expect(data.status).toBe(200);
    expect(data.body).toBe('{"ok":true}');
    expect(data.headers["content-type"]).toBe("application/json");

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["X-Test"]).toBe("1");
  });

  it("http_post is denied without an ApprovalSystem, and succeeds once approved", async () => {
    const fetchSpy = vi.fn(async () => ({
      status: 201,
      statusText: "Created",
      headers: new Headers(),
      text: async () => "created",
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const registry = new ToolRegistry();
    registry.registerAll(HTTP_TOOLS);

    const denied = await new ToolExecutor({ registry }).execute("http_post", { url: "https://example.com/x", body: "{}" }, context);
    expect(denied.status).toBe("failure");
    expect(denied.error?.reason).toBe("permission-denied");
    expect(fetchSpy).not.toHaveBeenCalled();

    const approved = await new ToolExecutor({ registry, approvals: autoApprovingSystem() }).execute(
      "http_post",
      { url: "https://example.com/x", body: "{}" },
      context,
    );
    expect(approved.status).toBe("success");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
  });

  it("retries on a transient fetch rejection (network error) per the tool's retry policy", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        if (calls === 1) throw new TypeError("network error");
        return { status: 200, statusText: "OK", headers: new Headers(), text: async () => "ok" };
      }),
    );
    const registry = new ToolRegistry();
    registry.registerAll(HTTP_TOOLS);
    const executor = new ToolExecutor({ registry });
    const result = await executor.execute("http_get", { url: "https://example.com/flaky" }, context);
    expect(result.status).toBe("success");
    expect(calls).toBe(2);
  });
});
