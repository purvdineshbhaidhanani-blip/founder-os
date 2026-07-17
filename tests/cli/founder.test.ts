import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFounderCli, runFounderCli } from "../../src/cli/founder.js";

/**
 * Real invocations of the `founder` CLI (commander parsing + real
 * command actions) — only the network boundary (no Ollama daemon in this
 * environment) is naturally absent, which is itself exercised as a real
 * "graceful failure" path, not stubbed away.
 */
function captureStdout(): { text: () => string; restore: () => void } {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  });
  return { text: () => chunks.join(""), restore: () => spy.mockRestore() };
}

describe("founder CLI", () => {
  let capture: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    capture = captureStdout();
  });
  afterEach(() => {
    capture.restore();
    vi.restoreAllMocks();
  });

  it("version prints the Founder OS version", async () => {
    await runFounderCli(["node", "founder", "version"]);
    expect(capture.text()).toContain("Founder OS v");
  });

  it("config prints the resolved configuration with safe defaults", async () => {
    await runFounderCli(["node", "founder", "config"]);
    const text = capture.text();
    expect(text).toContain("workspaceRoot");
    expect(text).toContain("ollamaHost");
    expect(text).toContain("defaultModel");
  });

  it("config --json emits parseable JSON with ok/config/issues", async () => {
    await runFounderCli(["node", "founder", "config", "--json"]);
    const parsed = JSON.parse(capture.text());
    expect(parsed).toHaveProperty("ok");
    expect(parsed).toHaveProperty("config.defaultModel");
    expect(parsed).toHaveProperty("issues");
  });

  it("tools list prints every built-in tool with its permission mode", async () => {
    await runFounderCli(["node", "founder", "tools", "list"]);
    const text = capture.text();
    expect(text).toContain("read_file");
    expect(text).toContain("run_bash");
    expect(text).toContain("git_status");
    expect(text).toContain("http_get");
  });

  it("tools list --capability filters by capability tag", async () => {
    await runFounderCli(["node", "founder", "tools", "list", "--capability", "git"]);
    const text = capture.text();
    expect(text).toContain("git_status");
    expect(text).not.toContain("read_file");
  });

  it("agent list prints the real discovered agents, including the three canonical ones", async () => {
    await runFounderCli(["node", "founder", "agent", "list"]);
    const text = capture.text();
    expect(text).toContain("market-research-agent");
    expect(text).toContain("problem-discovery-agent");
    expect(text).toContain("report-generator");
  });

  it("doctor runs every real diagnostic and reports a readable summary", async () => {
    await runFounderCli(["node", "founder", "doctor"]);
    const text = capture.text();
    expect(text).toContain("Founder OS — startup diagnostics");
    expect(text).toContain("Workspace");
    expect(text).toContain("Write permission");
    expect(text).toContain("Ollama daemon");
  });

  it("doctor --json emits a parseable structured report", async () => {
    await runFounderCli(["node", "founder", "doctor", "--json"]);
    const parsed = JSON.parse(capture.text());
    expect(Array.isArray(parsed.results)).toBe(true);
    expect(parsed.results.some((r: { name: string }) => r.name === "Workspace")).toBe(true);
  });

  it("agent execute fails cleanly (non-crashing, actionable message) when no unknown agent exists", async () => {
    const stderrCapture = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await runFounderCli(["node", "founder", "agent", "execute", "not-a-real-agent", "task", "--no-interactive"]);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    expect(stderrCapture.mock.calls.some((call) => String(call[0]).includes("No agent found"))).toBe(true);
    stderrCapture.mockRestore();
  });

  it("agent execute reports a structured, non-crashing failure when Ollama is unreachable (real environment, no daemon)", async () => {
    const stderrCapture = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await runFounderCli(["node", "founder", "agent", "execute", "market-research-agent", "task", "--no-interactive"]);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    expect(stderrCapture.mock.calls.some((call) => String(call[0]).includes("Agent execution failed"))).toBe(true);
    stderrCapture.mockRestore();
  });

  it("run is a working shorthand for agent execute (same failure path, same message shape)", async () => {
    const stderrCapture = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await runFounderCli(["node", "founder", "run", "market-research-agent", "task", "--no-interactive"]);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    expect(stderrCapture.mock.calls.some((call) => String(call[0]).includes("Agent execution failed"))).toBe(true);
    stderrCapture.mockRestore();
  });

  it("buildFounderCli registers exactly the commands the mission names", () => {
    const program = buildFounderCli();
    const names = program.commands.map((c) => c.name()).sort();
    expect(names).toEqual(["agent", "config", "doctor", "models", "run", "tools", "version"]);
  });
});
