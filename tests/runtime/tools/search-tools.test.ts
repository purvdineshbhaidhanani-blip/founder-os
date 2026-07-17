import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ToolExecutor } from "../../../src/runtime/tools/executor.js";
import { ToolRegistry } from "../../../src/runtime/tools/registry.js";
import { SEARCH_TOOLS } from "../../../src/runtime/tools/implementations/search-tools.js";
import type { ToolExecutionContext } from "../../../src/runtime/tools/types.js";

/** Real filesystem content search against a real, disposable temp directory. */
describe("Search Tools — real content search, sandboxed", () => {
  let root: string;
  let context: ToolExecutionContext;
  let executor: ToolExecutor;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "founder-os-search-tools-"));
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "engine.ts"), "export function runEngine() {\n  return 'TAM analysis';\n}\n", "utf-8");
    await writeFile(path.join(root, "src", "utils.ts"), "export const noop = () => undefined;\n", "utf-8");
    await writeFile(path.join(root, "README.md"), "This project performs TAM analysis for founders.\n", "utf-8");

    context = { workingDirectory: root };
    const registry = new ToolRegistry();
    registry.registerAll(SEARCH_TOOLS);
    executor = new ToolExecutor({ registry });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("text_search finds a literal substring across multiple files with line numbers", async () => {
    const result = await executor.execute("text_search", { query: "TAM analysis" }, context);
    expect(result.status).toBe("success");
    const matches = (result.data as { matches: Array<{ file: string; line: number }> }).matches;
    expect(matches.map((m) => m.file).sort()).toEqual(["README.md", "src/engine.ts"]);
  });

  it("text_search is case-insensitive by default and case-sensitive on request", async () => {
    const caseInsensitive = await executor.execute("text_search", { query: "tam analysis" }, context);
    expect((caseInsensitive.data as { matches: unknown[] }).matches.length).toBe(2);

    const caseSensitive = await executor.execute("text_search", { query: "tam analysis", caseSensitive: true }, context);
    expect((caseSensitive.data as { matches: unknown[] }).matches.length).toBe(0);
  });

  it("pattern_search finds a regular expression match", async () => {
    const result = await executor.execute("pattern_search", { pattern: "export (function|const)" }, context);
    expect(result.status).toBe("success");
    const matches = (result.data as { matches: Array<{ file: string }> }).matches;
    expect(matches.map((m) => m.file).sort()).toEqual(["src/engine.ts", "src/utils.ts"]);
  });

  it("pattern_search returns a structured failure (not a crash) for an invalid regex", async () => {
    const result = await executor.execute("pattern_search", { pattern: "(unclosed" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.message).toContain("Invalid regular expression");
  });

  it("repository_search combines filename and content matches", async () => {
    const result = await executor.execute("repository_search", { query: "engine" }, context);
    expect(result.status).toBe("success");
    const data = result.data as { fileNameMatches: string[]; contentMatches: Array<{ file: string }> };
    expect(data.fileNameMatches).toEqual(["src/engine.ts"]);
    expect(data.contentMatches.map((m) => m.file)).toContain("src/engine.ts");
  });

  it("scopes search to a subdirectory when path is given", async () => {
    const result = await executor.execute("text_search", { query: "TAM", path: "src" }, context);
    const matches = (result.data as { matches: Array<{ file: string }> }).matches;
    expect(matches.map((m) => m.file)).toEqual(["src/engine.ts"]);
  });

  it("SECURITY: rejects a search path outside the sandbox root", async () => {
    const result = await executor.execute("text_search", { query: "root", path: "/etc" }, context);
    expect(result.status).toBe("failure");
    expect(result.error?.message).toContain("escapes the sandboxed workspace root");
  });

  it("all search tools are allowed without an ApprovalSystem (read-only)", async () => {
    const result = await executor.execute("repository_search", { query: "TAM" }, context);
    expect(result.status).toBe("success");
  });
});
