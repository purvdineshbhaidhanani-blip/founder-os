import { z } from "zod";
import { resolveSandboxedPath } from "../sandbox.js";
import { runProcess, type ShellRunResult } from "./shell-tools.js";
import type { ToolDefinition } from "../types.js";

/**
 * Git Tools — thin wrappers over the real `git` CLI, invoked via the SAME
 * `runProcess` helper Shell Tools use (no second process-spawning
 * implementation). Read-only subcommands (status/diff/log/branch-list) are
 * `"allowed"`; repository-mutating ones (commit/checkout/create-branch) are
 * `"ask-user"`, consistent with the File Tools' policy.
 */

const RETRY_NONE = { maxAttempts: 1, baseDelayMs: 0 };
const pathSchema = z.object({ path: z.string().optional() });

async function git(args: string[], cwd: string, signal: AbortSignal | undefined): Promise<ShellRunResult> {
  const result = await runProcess("git", args, cwd, process.env, signal);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} exited with code ${result.exitCode}: ${result.stderr || result.stdout}`);
  }
  return result;
}

function repoCwd(input: { path?: string }, workingDirectory: string): string {
  return resolveSandboxedPath(workingDirectory, input.path ?? ".");
}

const gitStatusTool: ToolDefinition<{ path?: string }, { output: string }> = {
  id: "git_status",
  name: "Git Status",
  description: "Runs `git status --porcelain=v1 --branch` in the sandboxed repository.",
  capabilities: ["git", "read"],
  permission: { mode: "allowed", reason: "Read-only." },
  inputSchema: pathSchema,
  timeoutMs: 10_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const result = await git(["status", "--porcelain=v1", "--branch"], repoCwd(input, context.workingDirectory), context.signal);
    return { output: result.stdout };
  },
};

const gitDiffTool: ToolDefinition<{ path?: string; staged?: boolean; file?: string }, { output: string }> = {
  id: "git_diff",
  name: "Git Diff",
  description: "Runs `git diff` (optionally `--staged`, optionally scoped to one file) in the sandboxed repository.",
  capabilities: ["git", "read"],
  permission: { mode: "allowed", reason: "Read-only." },
  inputSchema: z.object({ path: z.string().optional(), staged: z.boolean().optional(), file: z.string().optional() }),
  timeoutMs: 15_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const args = ["diff", ...(input.staged ? ["--staged"] : []), ...(input.file ? ["--", input.file] : [])];
    const result = await git(args, repoCwd(input, context.workingDirectory), context.signal);
    return { output: result.stdout };
  },
};

const gitLogTool: ToolDefinition<{ path?: string; maxCount?: number }, { output: string }> = {
  id: "git_log",
  name: "Git Log",
  description: "Runs `git log --oneline` (bounded by maxCount, default 20) in the sandboxed repository.",
  capabilities: ["git", "read"],
  permission: { mode: "allowed", reason: "Read-only." },
  inputSchema: z.object({ path: z.string().optional(), maxCount: z.number().int().positive().max(500).optional() }),
  timeoutMs: 10_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const result = await git(
      ["log", `--max-count=${input.maxCount ?? 20}`, "--oneline"],
      repoCwd(input, context.workingDirectory),
      context.signal,
    );
    return { output: result.stdout };
  },
};

const gitBranchTool: ToolDefinition<{ path?: string }, { branches: string[]; current: string | undefined }> = {
  id: "git_branch",
  name: "Git Branch (list)",
  description: "Lists local branches via `git branch` in the sandboxed repository.",
  capabilities: ["git", "read"],
  permission: { mode: "allowed", reason: "Read-only." },
  inputSchema: pathSchema,
  timeoutMs: 10_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const result = await git(["branch"], repoCwd(input, context.workingDirectory), context.signal);
    const lines = result.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
    const branches = lines.map((l) => l.replace(/^\*\s*/, ""));
    const current = lines.find((l) => l.startsWith("*"))?.replace(/^\*\s*/, "");
    return { branches, current };
  },
};

const gitCreateBranchTool: ToolDefinition<{ name: string; path?: string }, { created: string }> = {
  id: "git_create_branch",
  name: "Git Create Branch",
  description: "Creates a new local branch (`git branch <name>`) without checking it out.",
  capabilities: ["git", "write"],
  permission: { mode: "ask-user", reason: "Mutates the repository's branch list." },
  inputSchema: z.object({ name: z.string().min(1), path: z.string().optional() }),
  timeoutMs: 10_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    await git(["branch", input.name], repoCwd(input, context.workingDirectory), context.signal);
    return { created: input.name };
  },
};

const gitCheckoutTool: ToolDefinition<{ ref: string; path?: string; createBranch?: boolean }, { output: string }> = {
  id: "git_checkout",
  name: "Git Checkout",
  description: "Checks out a branch/ref (`git checkout [-b] <ref>`) in the sandboxed repository.",
  capabilities: ["git", "write"],
  permission: { mode: "ask-user", reason: "Changes the working tree and HEAD." },
  inputSchema: z.object({ ref: z.string().min(1), path: z.string().optional(), createBranch: z.boolean().optional() }),
  timeoutMs: 15_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const args = ["checkout", ...(input.createBranch ? ["-b"] : []), input.ref];
    const result = await git(args, repoCwd(input, context.workingDirectory), context.signal);
    return { output: result.stdout || result.stderr };
  },
};

const gitCommitTool: ToolDefinition<{ message: string; path?: string; addAll?: boolean }, { output: string }> = {
  id: "git_commit",
  name: "Git Commit",
  description: "Commits staged changes (`git commit -m <message>`; optionally `git add -A` first when addAll is true).",
  capabilities: ["git", "write"],
  permission: { mode: "ask-user", reason: "Creates a new commit." },
  inputSchema: z.object({ message: z.string().min(1), path: z.string().optional(), addAll: z.boolean().optional() }),
  timeoutMs: 15_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const cwd = repoCwd(input, context.workingDirectory);
    if (input.addAll) await git(["add", "-A"], cwd, context.signal);
    const result = await git(["commit", "-m", input.message], cwd, context.signal);
    return { output: result.stdout };
  },
};

export const GIT_TOOLS: ToolDefinition[] = [
  gitStatusTool as ToolDefinition,
  gitDiffTool as ToolDefinition,
  gitLogTool as ToolDefinition,
  gitBranchTool as ToolDefinition,
  gitCreateBranchTool as ToolDefinition,
  gitCheckoutTool as ToolDefinition,
  gitCommitTool as ToolDefinition,
];
