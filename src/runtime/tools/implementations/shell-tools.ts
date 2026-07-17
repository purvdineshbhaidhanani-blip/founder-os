import { spawn } from "node:child_process";
import { z } from "zod";
import { resolveSandboxedPath } from "../sandbox.js";
import type { ToolDefinition } from "../types.js";

/**
 * Shell Execution Tools — run a command via a real shell (bash or
 * PowerShell) with a sandboxed working directory, output capture, exit
 * code, and real cancellation (child_process's own `signal` support kills
 * the process group on abort/timeout).
 *
 * Security model: a shell command can do anything the OS user running this
 * process can do — no string-based command "sanitization" can make that
 * safe (shell metacharacters defeat any blocklist). The honest guard here is
 * the PERMISSION SYSTEM: both shell tools default to `"ask-user"`, so a
 * command only runs after an explicit human decision via the existing
 * `ApprovalSystem` — never silently. `cwd` is still sandboxed to the
 * workspace root as defense in depth, even though a malicious command could
 * itself `cd` elsewhere once running (a shell process is not further jailed
 * beyond OS user permissions).
 */

const MAX_OUTPUT_CHARS = 200_000;

function capture(chunk: Buffer, current: string): { text: string; truncated: boolean } {
  const next = current + chunk.toString("utf-8");
  if (next.length > MAX_OUTPUT_CHARS) return { text: next.slice(0, MAX_OUTPUT_CHARS), truncated: true };
  return { text: next, truncated: false };
}

export interface ShellRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  truncated: boolean;
}

/** Spawns `executable` with `args` and captures output. Exported so Git Tools reuse this exact process-spawning logic instead of a second implementation. */
export function runProcess(
  executable: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  signal: AbortSignal | undefined,
): Promise<ShellRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, env, signal });
    let stdout = "";
    let stderr = "";
    let truncated = false;

    child.stdout?.on("data", (chunk: Buffer) => {
      const result = capture(chunk, stdout);
      stdout = result.text;
      truncated ||= result.truncated;
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const result = capture(chunk, stderr);
      stderr = result.text;
      truncated ||= result.truncated;
    });

    child.on("error", (error) => reject(error));
    child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode, truncated }));
  });
}

const RETRY_NONE = { maxAttempts: 1, baseDelayMs: 0 };

const bashInputSchema = z.object({ command: z.string().min(1), cwd: z.string().optional() });

const runBashTool: ToolDefinition<{ command: string; cwd?: string }, ShellRunResult> = {
  id: "run_bash",
  name: "Run Bash",
  description: "Runs a shell command via `bash -c` inside the sandboxed working directory. Requires operator approval.",
  capabilities: ["shell", "execute"],
  permission: { mode: "ask-user", reason: "Executes an arbitrary shell command." },
  inputSchema: bashInputSchema,
  timeoutMs: 60_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const cwd = resolveSandboxedPath(context.workingDirectory, input.cwd ?? ".");
    return runProcess("/bin/bash", ["-c", input.command], cwd, { ...process.env, ...context.env }, context.signal);
  },
};

const runPowerShellTool: ToolDefinition<{ command: string; cwd?: string }, ShellRunResult> = {
  id: "run_powershell",
  name: "Run PowerShell",
  description: "Runs a command via `pwsh -Command` (or `powershell -Command`) inside the sandboxed working directory. Requires operator approval.",
  capabilities: ["shell", "execute"],
  permission: { mode: "ask-user", reason: "Executes an arbitrary shell command." },
  inputSchema: bashInputSchema,
  timeoutMs: 60_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const cwd = resolveSandboxedPath(context.workingDirectory, input.cwd ?? ".");
    const env = { ...process.env, ...context.env };
    try {
      return await runProcess("pwsh", ["-NoProfile", "-Command", input.command], cwd, env, context.signal);
    } catch {
      // Fall back to Windows PowerShell if the cross-platform `pwsh` binary isn't installed.
      return runProcess("powershell", ["-NoProfile", "-Command", input.command], cwd, env, context.signal);
    }
  },
};

export const SHELL_TOOLS: ToolDefinition[] = [runBashTool as ToolDefinition, runPowerShellTool as ToolDefinition];
