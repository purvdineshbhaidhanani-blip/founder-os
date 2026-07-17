import { z } from "zod";
import path from "node:path";
import { readTextFile, walkFiles } from "../../../utils/fs.js";
import { resolveSandboxedPath } from "../sandbox.js";
import type { ToolDefinition } from "../types.js";

/**
 * Search Tools — content and filename search over the sandboxed workspace.
 * "File Search" (finding files by NAME) already exists as `search_files` in
 * File Tools; this module deliberately does not re-implement that walk — it
 * reuses `walkFiles` (the same shared primitive) for CONTENT search instead,
 * and `repository_search` composes both via the shared `searchTextInFiles`
 * helper rather than duplicating either loop.
 */

const MAX_FILES_SCANNED = 2_000;
const MAX_FILE_SIZE_BYTES = 2_000_000;
const MAX_MATCHES = 500;

export interface TextMatch {
  file: string;
  line: number;
  text: string;
}

/** Heuristic: a NUL byte almost never appears in real text; its presence is the standard binary-file signal. */
function looksBinary(content: string): boolean {
  return content.includes("\0");
}

/** Walks `root`, testing each readable text file's lines against `test`. Bounded by MAX_FILES_SCANNED/MAX_MATCHES; skips files that look binary or unreadable rather than throwing. */
async function searchTextInFiles(root: string, relativeRoot: string, test: (line: string) => boolean): Promise<TextMatch[]> {
  const files = (await walkFiles(root)).slice(0, MAX_FILES_SCANNED);
  const matches: TextMatch[] = [];

  for (const filePath of files) {
    if (matches.length >= MAX_MATCHES) break;
    let content: string;
    try {
      content = await readTextFile(filePath);
    } catch {
      continue;
    }
    if (looksBinary(content) || Buffer.byteLength(content, "utf-8") > MAX_FILE_SIZE_BYTES) continue;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      if (matches.length >= MAX_MATCHES) break;
      if (test(lines[i]!)) {
        matches.push({ file: path.relative(relativeRoot, filePath), line: i + 1, text: lines[i]!.trim().slice(0, 300) });
      }
    }
  }
  return matches;
}

const RETRY_NONE = { maxAttempts: 1, baseDelayMs: 0 };

const textSearchTool: ToolDefinition<{ query: string; path?: string; caseSensitive?: boolean }, { matches: TextMatch[] }> = {
  id: "text_search",
  name: "Text Search",
  description: "Searches file contents for a literal substring across the sandboxed workspace (or a subdirectory).",
  capabilities: ["search", "read"],
  permission: { mode: "allowed", reason: "Read-only search." },
  inputSchema: z.object({ query: z.string().min(1), path: z.string().optional(), caseSensitive: z.boolean().optional() }),
  timeoutMs: 20_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const root = resolveSandboxedPath(context.workingDirectory, input.path ?? ".");
    const needle = input.caseSensitive ? input.query : input.query.toLowerCase();
    const matches = await searchTextInFiles(root, context.workingDirectory, (line) =>
      (input.caseSensitive ? line : line.toLowerCase()).includes(needle),
    );
    return { matches };
  },
};

const patternSearchTool: ToolDefinition<{ pattern: string; flags?: string; path?: string }, { matches: TextMatch[] }> = {
  id: "pattern_search",
  name: "Pattern Search",
  description: "Searches file contents for a regular expression across the sandboxed workspace (or a subdirectory).",
  capabilities: ["search", "read"],
  permission: { mode: "allowed", reason: "Read-only search." },
  inputSchema: z.object({ pattern: z.string().min(1), flags: z.string().optional(), path: z.string().optional() }),
  timeoutMs: 20_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const root = resolveSandboxedPath(context.workingDirectory, input.path ?? ".");
    let regex: RegExp;
    try {
      regex = new RegExp(input.pattern, input.flags ?? "");
    } catch (error) {
      throw new Error(`Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
    }
    const matches = await searchTextInFiles(root, context.workingDirectory, (line) => regex.test(line));
    return { matches };
  },
};

const repositorySearchTool: ToolDefinition<{ query: string; path?: string }, { fileNameMatches: string[]; contentMatches: TextMatch[] }> = {
  id: "repository_search",
  name: "Repository Search",
  description: "Combined search: files whose relative path contains `query`, AND file contents containing `query` — one call covering both.",
  capabilities: ["search", "read"],
  permission: { mode: "allowed", reason: "Read-only search." },
  inputSchema: z.object({ query: z.string().min(1), path: z.string().optional() }),
  timeoutMs: 25_000,
  retryPolicy: RETRY_NONE,
  async run(input, context) {
    const root = resolveSandboxedPath(context.workingDirectory, input.path ?? ".");
    const needle = input.query.toLowerCase();

    const allFiles = (await walkFiles(root)).slice(0, MAX_FILES_SCANNED);
    const fileNameMatches = allFiles
      .map((filePath) => path.relative(context.workingDirectory, filePath))
      .filter((relativePath) => relativePath.toLowerCase().includes(needle));

    const contentMatches = await searchTextInFiles(root, context.workingDirectory, (line) => line.toLowerCase().includes(needle));

    return { fileNameMatches, contentMatches };
  },
};

export const SEARCH_TOOLS: ToolDefinition[] = [
  textSearchTool as ToolDefinition,
  patternSearchTool as ToolDefinition,
  repositorySearchTool as ToolDefinition,
];
