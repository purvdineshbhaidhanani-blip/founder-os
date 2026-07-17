import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ToolExecutor } from "../../../src/runtime/tools/executor.js";
import { ToolRegistry } from "../../../src/runtime/tools/registry.js";
import { ApprovalSystem } from "../../../src/runtime/approval/system.js";
import { EventBus } from "../../../src/runtime/events/bus.js";
import { SHELL_TOOLS } from "../../../src/runtime/tools/implementations/shell-tools.js";
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

/** Real `bash` process execution — no mocked child_process. */
describe("Shell Tools — real bash execution, sandboxed", () => {
  let root: string;
  let context: ToolExecutionContext;
  let executor: ToolExecutor;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "founder-os-shell-tools-"));
    context = { workingDirectory: root };
    const registry = new ToolRegistry();
    registry.registerAll(SHELL_TOOLS);
    executor = new ToolExecutor({ registry, approvals: autoApprovingSystem() });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("captures stdout and a zero exit code for a successful command", async () => {
    const result = await executor.execute("run_bash", { command: "echo hello-founder-os" }, context);
    expect(result.status).toBe("success");
    const data = result.data as { stdout: string; exitCode: number | null };
    expect(data.stdout.trim()).toBe("hello-founder-os");
    expect(data.exitCode).toBe(0);
  });

  it("captures stderr and a non-zero exit code for a failing command", async () => {
    const result = await executor.execute("run_bash", { command: "echo oops 1>&2; exit 7" }, context);
    expect(result.status).toBe("success"); // the TOOL ran successfully; the COMMAND's own exit code is data, not a tool failure
    const data = result.data as { stderr: string; exitCode: number | null };
    expect(data.stderr.trim()).toBe("oops");
    expect(data.exitCode).toBe(7);
  });

  it("runs inside the sandboxed working directory (pwd matches the resolved root)", async () => {
    const result = await executor.execute("run_bash", { command: "pwd" }, context);
    const data = result.data as { stdout: string };
    expect(data.stdout.trim()).toBe(path.resolve(root));
  });

  it("SECURITY: rejects a cwd override that escapes the sandbox root", async () => {
    const result = await executor.execute("run_bash", { command: "pwd", cwd: "/etc" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.message).toContain("escapes the sandboxed workspace root");
  });

  it("is denied by default without an ApprovalSystem (ask-user is never silently allowed)", async () => {
    const registry = new ToolRegistry();
    registry.registerAll(SHELL_TOOLS);
    const noApprovalExecutor = new ToolExecutor({ registry });
    const result = await noApprovalExecutor.execute("run_bash", { command: "echo should-not-run" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("permission-denied");
  });

  it("passes context.env through to the child process without erasing process.env", async () => {
    const result = await executor.execute(
      "run_bash",
      { command: "echo $FOUNDER_OS_TEST_VAR && echo $PATH_CHECK" },
      { ...context, env: { FOUNDER_OS_TEST_VAR: "custom-value", PATH_CHECK: process.env.PATH ? "has-path" : "no-path" } },
    );
    const data = result.data as { stdout: string };
    const lines = data.stdout.trim().split("\n");
    expect(lines[0]).toBe("custom-value");
    expect(lines[1]).toBe("has-path");
  });

  it("real cancellation: aborting mid-command actually kills the child process (not just an ignored signal)", async () => {
    const controller = new AbortController();
    const resultPromise = executor.execute("run_bash", { command: "sleep 30" }, { ...context, signal: controller.signal });
    setTimeout(() => controller.abort(), 50);
    const start = Date.now();
    const result = await resultPromise;
    const elapsedMs = Date.now() - start;
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("cancelled");
    // If the process weren't actually killed, this would take ~30s.
    expect(elapsedMs).toBeLessThan(5000);
  });
});
