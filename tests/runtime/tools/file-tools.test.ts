import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ToolExecutor } from "../../../src/runtime/tools/executor.js";
import { ToolRegistry } from "../../../src/runtime/tools/registry.js";
import { ApprovalSystem } from "../../../src/runtime/approval/system.js";
import { EventBus } from "../../../src/runtime/events/bus.js";
import { FILE_TOOLS } from "../../../src/runtime/tools/implementations/file-tools.js";
import type { ToolExecutionContext } from "../../../src/runtime/tools/types.js";

/** Auto-grants every approval request the instant it's raised — these functional tests want mutating tools to actually run, so they exercise the ask-user gate via a real ApprovalSystem rather than bypassing it. */
function autoApprovingSystem(): ApprovalSystem {
  const bus = new EventBus();
  const approvals = new ApprovalSystem({ bus });
  bus.subscribe({ name: "approval.requested" }, (event) => {
    const { id } = event.payload as { id: string };
    approvals.grant(id, "test-auto-approver");
  });
  return approvals;
}

/** Real filesystem operations against a real, disposable temp directory — no mocks. */
describe("File Tools — real filesystem, sandboxed", () => {
  let root: string;
  let context: ToolExecutionContext;
  let executor: ToolExecutor;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "founder-os-file-tools-"));
    context = { workingDirectory: root };
    const registry = new ToolRegistry();
    registry.registerAll(FILE_TOOLS);
    executor = new ToolExecutor({ registry, approvals: autoApprovingSystem() });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes then reads a file", async () => {
    const write = await executor.execute("write_file", { path: "a.txt", content: "hello" }, context);
    expect(write.status).toBe("success");

    const read = await executor.execute("read_file", { path: "a.txt" }, context);
    expect(read.status).toBe("success");
    expect((read.data as { content: string }).content).toBe("hello");
  });

  it("appends to an existing file", async () => {
    await executor.execute("write_file", { path: "a.txt", content: "one\n" }, context);
    await executor.execute("append_file", { path: "a.txt", content: "two\n" }, context);
    const read = await executor.execute("read_file", { path: "a.txt" }, context);
    expect((read.data as { content: string }).content).toBe("one\ntwo\n");
  });

  it("creates a folder, lists it, then deletes it recursively", async () => {
    const create = await executor.execute("create_folder", { path: "sub/dir" }, context);
    expect(create.status).toBe("success");
    await executor.execute("write_file", { path: "sub/dir/f.txt", content: "x" }, context);

    const list = await executor.execute("list_directory", { path: "sub/dir" }, context);
    expect((list.data as { entries: Array<{ name: string }> }).entries.map((e) => e.name)).toEqual(["f.txt"]);

    const del = await executor.execute("delete_file", { path: "sub", recursive: true }, context);
    expect(del.status).toBe("success");
    const listAfter = await executor.execute("list_directory", { path: "." }, context);
    expect((listAfter.data as { entries: unknown[] }).entries).toEqual([]);
  });

  it("moves and copies a file", async () => {
    await executor.execute("write_file", { path: "src.txt", content: "payload" }, context);
    const copy = await executor.execute("copy_file", { from: "src.txt", to: "copy.txt" }, context);
    expect(copy.status).toBe("success");
    const move = await executor.execute("move_file", { from: "src.txt", to: "moved.txt" }, context);
    expect(move.status).toBe("success");

    const list = await executor.execute("list_directory", { path: "." }, context);
    const names = (list.data as { entries: Array<{ name: string }> }).entries.map((e) => e.name).sort();
    expect(names).toEqual(["copy.txt", "moved.txt"]);
  });

  it("search_files finds files by relative-path substring", async () => {
    await executor.execute("create_folder", { path: "pkg" }, context);
    await executor.execute("write_file", { path: "pkg/index.ts", content: "" }, context);
    await executor.execute("write_file", { path: "readme.md", content: "" }, context);

    const result = await executor.execute("search_files", { pattern: "index" }, context);
    expect(result.status).toBe("success");
    expect((result.data as { matches: string[] }).matches).toEqual(["pkg/index.ts"]);
  });

  it("SECURITY: rejects a path-traversal write attempt with permission-denied-free structural failure (never touches disk outside root)", async () => {
    const result = await executor.execute("write_file", { path: "../../etc/evil.txt", content: "pwned" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.message).toContain("escapes the sandboxed workspace root");
  });

  it("SECURITY: rejects an absolute path outside the sandbox for read_file", async () => {
    const result = await executor.execute("read_file", { path: "/etc/passwd" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.message).toContain("escapes the sandboxed workspace root");
  });

  it("mutating file tools default to ask-user and are DENIED without an ApprovalSystem configured", async () => {
    // Every other test in this file uses the shared `executor`, which is
    // deliberately wired with an auto-approving ApprovalSystem (see
    // autoApprovingSystem() above) so the mutating tools' real "ask-user"
    // gate is exercised, not bypassed. This test uses a FRESH executor with
    // no ApprovalSystem at all, to prove the gate denies by default.
    const registry = new ToolRegistry();
    registry.registerAll(FILE_TOOLS);
    const noApprovalExecutor = new ToolExecutor({ registry });
    const result = await noApprovalExecutor.execute("write_file", { path: "should-not-exist.txt", content: "x" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.reason).toBe("permission-denied");
  });
});
