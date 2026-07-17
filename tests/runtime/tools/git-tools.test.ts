import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ToolExecutor } from "../../../src/runtime/tools/executor.js";
import { ToolRegistry } from "../../../src/runtime/tools/registry.js";
import { ApprovalSystem } from "../../../src/runtime/approval/system.js";
import { EventBus } from "../../../src/runtime/events/bus.js";
import { GIT_TOOLS } from "../../../src/runtime/tools/implementations/git-tools.js";
import { runProcess } from "../../../src/runtime/tools/implementations/shell-tools.js";
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

/** Real `git` CLI execution against a real, disposable temp repository — no mocks. */
describe("Git Tools — real git CLI, sandboxed", () => {
  let root: string;
  let context: ToolExecutionContext;
  let executor: ToolExecutor;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "founder-os-git-tools-"));
    await runProcess("git", ["init", "-q", "-b", "main"], root, process.env, undefined);
    await runProcess("git", ["config", "user.email", "test@example.com"], root, process.env, undefined);
    await runProcess("git", ["config", "user.name", "Founder OS Test"], root, process.env, undefined);
    await writeFile(path.join(root, "README.md"), "# test repo\n", "utf-8");
    await runProcess("git", ["add", "-A"], root, process.env, undefined);
    await runProcess("git", ["commit", "-q", "-m", "initial commit"], root, process.env, undefined);

    context = { workingDirectory: root };
    const registry = new ToolRegistry();
    registry.registerAll(GIT_TOOLS);
    executor = new ToolExecutor({ registry, approvals: autoApprovingSystem() });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("git_status reports a clean tree right after the initial commit", async () => {
    const result = await executor.execute("git_status", {}, context);
    expect(result.status).toBe("success");
    expect((result.data as { output: string }).output).toContain("## main");
  });

  it("git_log shows the initial commit", async () => {
    const result = await executor.execute("git_log", {}, context);
    expect(result.status).toBe("success");
    expect((result.data as { output: string }).output).toContain("initial commit");
  });

  it("git_diff shows an unstaged change after editing a tracked file", async () => {
    await writeFile(path.join(root, "README.md"), "# test repo\n\nchanged.\n", "utf-8");
    const result = await executor.execute("git_diff", {}, context);
    expect(result.status).toBe("success");
    expect((result.data as { output: string }).output).toContain("changed.");
  });

  it("git_create_branch then git_branch lists it without checking it out", async () => {
    const create = await executor.execute("git_create_branch", { name: "feature/x" }, context);
    expect(create.status).toBe("success");

    const branches = await executor.execute("git_branch", {}, context);
    expect(branches.status).toBe("success");
    const data = branches.data as { branches: string[]; current: string | undefined };
    expect(data.branches).toEqual(expect.arrayContaining(["main", "feature/x"]));
    expect(data.current).toBe("main");
  });

  it("git_checkout switches HEAD to a new branch", async () => {
    await executor.execute("git_checkout", { ref: "feature/y", createBranch: true }, context);
    const branches = await executor.execute("git_branch", {}, context);
    expect((branches.data as { current: string | undefined }).current).toBe("feature/y");
  });

  it("git_commit with addAll stages and commits a new file", async () => {
    await writeFile(path.join(root, "new-file.txt"), "content", "utf-8");
    const commit = await executor.execute("git_commit", { message: "add new file", addAll: true }, context);
    expect(commit.status).toBe("success");

    const status = await executor.execute("git_status", {}, context);
    expect((status.data as { output: string }).output.trim()).toBe("## main");

    const log = await executor.execute("git_log", { maxCount: 1 }, context);
    expect((log.data as { output: string }).output).toContain("add new file");
  });

  it("SECURITY: rejects a repository path outside the sandbox root", async () => {
    const result = await executor.execute("git_status", { path: "/etc" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.message).toContain("escapes the sandboxed workspace root");
  });

  it("read-only git tools (status/diff/log/branch) run without any ApprovalSystem", async () => {
    const registry = new ToolRegistry();
    registry.registerAll(GIT_TOOLS);
    const noApprovalExecutor = new ToolExecutor({ registry });
    const result = await noApprovalExecutor.execute("git_status", {}, context);
    expect(result.status).toBe("success");
  });

  it("mutating git tools (commit/checkout/create_branch) are denied without an ApprovalSystem", async () => {
    const registry = new ToolRegistry();
    registry.registerAll(GIT_TOOLS);
    const noApprovalExecutor = new ToolExecutor({ registry });
    const result = await noApprovalExecutor.execute("git_create_branch", { name: "should-not-exist" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("permission-denied");
  });
});
