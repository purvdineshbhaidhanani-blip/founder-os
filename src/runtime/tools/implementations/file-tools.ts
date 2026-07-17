import { z } from "zod";
import path from "node:path";
import {
  appendTextFile,
  copyFileTo,
  deleteDir,
  deleteFile,
  ensureDir,
  isDirectory,
  listDirectory,
  moveFile,
  pathExists,
  readTextFile,
  statPath,
  walkFiles,
  writeTextFile,
} from "../../../utils/fs.js";
import { resolveSandboxedPath } from "../sandbox.js";
import type { ToolDefinition } from "../types.js";

/**
 * File System Tools — every path argument is resolved through
 * `resolveSandboxedPath(context.workingDirectory, ...)` before touching
 * disk, so no tool call can read/write/delete outside the sandbox root,
 * regardless of `..` segments or absolute-path arguments. Mutating tools
 * default to `"ask-user"` — nothing here silently writes/deletes.
 */

const STANDARD_RETRY = { maxAttempts: 2, baseDelayMs: 200 };
const READ_RETRY = { maxAttempts: 3, baseDelayMs: 150 };

const readFileTool: ToolDefinition<{ path: string }, { content: string; sizeBytes: number }> = {
  id: "read_file",
  name: "Read File",
  description: "Reads a UTF-8 text file's contents from the sandboxed workspace.",
  capabilities: ["filesystem", "read"],
  permission: { mode: "allowed", reason: "Reading a file has no side effects." },
  inputSchema: z.object({ path: z.string().min(1) }),
  timeoutMs: 10_000,
  retryPolicy: READ_RETRY,
  async run(input, context) {
    const resolved = resolveSandboxedPath(context.workingDirectory, input.path);
    const content = await readTextFile(resolved);
    const stat = await statPath(resolved);
    return { content, sizeBytes: stat?.sizeBytes ?? Buffer.byteLength(content, "utf-8") };
  },
};

const writeFileTool: ToolDefinition<{ path: string; content: string }, { bytesWritten: number }> = {
  id: "write_file",
  name: "Write File",
  description: "Writes (overwriting) a UTF-8 text file inside the sandboxed workspace, creating parent directories as needed.",
  capabilities: ["filesystem", "write"],
  permission: { mode: "ask-user", reason: "Overwrites a file's contents." },
  inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
  timeoutMs: 10_000,
  retryPolicy: STANDARD_RETRY,
  async run(input, context) {
    const resolved = resolveSandboxedPath(context.workingDirectory, input.path);
    await writeTextFile(resolved, input.content);
    return { bytesWritten: Buffer.byteLength(input.content, "utf-8") };
  },
};

const appendFileTool: ToolDefinition<{ path: string; content: string }, { bytesAppended: number }> = {
  id: "append_file",
  name: "Append File",
  description: "Appends text to a file inside the sandboxed workspace, creating it if it doesn't exist.",
  capabilities: ["filesystem", "write"],
  permission: { mode: "ask-user", reason: "Mutates a file's contents." },
  inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
  timeoutMs: 10_000,
  retryPolicy: STANDARD_RETRY,
  async run(input, context) {
    const resolved = resolveSandboxedPath(context.workingDirectory, input.path);
    await appendTextFile(resolved, input.content);
    return { bytesAppended: Buffer.byteLength(input.content, "utf-8") };
  },
};

const createFolderTool: ToolDefinition<{ path: string }, { created: boolean }> = {
  id: "create_folder",
  name: "Create Folder",
  description: "Creates a directory (and parents) inside the sandboxed workspace.",
  capabilities: ["filesystem", "write"],
  permission: { mode: "ask-user", reason: "Creates a new directory." },
  inputSchema: z.object({ path: z.string().min(1) }),
  timeoutMs: 5_000,
  retryPolicy: STANDARD_RETRY,
  async run(input, context) {
    const resolved = resolveSandboxedPath(context.workingDirectory, input.path);
    const alreadyExists = await pathExists(resolved);
    await ensureDir(resolved);
    return { created: !alreadyExists };
  },
};

const deleteFileTool: ToolDefinition<{ path: string; recursive?: boolean }, { deleted: boolean }> = {
  id: "delete_file",
  name: "Delete File",
  description: "Deletes a file (or, with recursive:true, a directory and its contents) inside the sandboxed workspace.",
  capabilities: ["filesystem", "delete"],
  permission: { mode: "ask-user", reason: "Irreversibly deletes data." },
  inputSchema: z.object({ path: z.string().min(1), recursive: z.boolean().optional() }),
  timeoutMs: 10_000,
  retryPolicy: STANDARD_RETRY,
  async run(input, context) {
    const resolved = resolveSandboxedPath(context.workingDirectory, input.path);
    const existedBefore = await pathExists(resolved);
    if (input.recursive && (await isDirectory(resolved))) await deleteDir(resolved);
    else await deleteFile(resolved);
    return { deleted: existedBefore };
  },
};

const moveFileTool: ToolDefinition<{ from: string; to: string }, { moved: boolean }> = {
  id: "move_file",
  name: "Move File",
  description: "Moves/renames a file within the sandboxed workspace.",
  capabilities: ["filesystem", "write"],
  permission: { mode: "ask-user", reason: "Mutates the filesystem layout." },
  inputSchema: z.object({ from: z.string().min(1), to: z.string().min(1) }),
  timeoutMs: 10_000,
  retryPolicy: STANDARD_RETRY,
  async run(input, context) {
    const from = resolveSandboxedPath(context.workingDirectory, input.from);
    const to = resolveSandboxedPath(context.workingDirectory, input.to);
    await moveFile(from, to);
    return { moved: true };
  },
};

const copyFileTool: ToolDefinition<{ from: string; to: string }, { copied: boolean }> = {
  id: "copy_file",
  name: "Copy File",
  description: "Copies a file within the sandboxed workspace.",
  capabilities: ["filesystem", "write"],
  permission: { mode: "ask-user", reason: "Writes a new file." },
  inputSchema: z.object({ from: z.string().min(1), to: z.string().min(1) }),
  timeoutMs: 10_000,
  retryPolicy: STANDARD_RETRY,
  async run(input, context) {
    const from = resolveSandboxedPath(context.workingDirectory, input.from);
    const to = resolveSandboxedPath(context.workingDirectory, input.to);
    await copyFileTo(from, to);
    return { copied: true };
  },
};

const listDirectoryTool: ToolDefinition<{ path?: string }, { entries: Array<{ name: string; path: string; isDirectory: boolean }> }> = {
  id: "list_directory",
  name: "List Directory",
  description: "Lists the entries directly inside a directory in the sandboxed workspace (path defaults to the workspace root).",
  capabilities: ["filesystem", "read"],
  permission: { mode: "allowed", reason: "Listing directory contents has no side effects." },
  inputSchema: z.object({ path: z.string().optional() }),
  timeoutMs: 5_000,
  retryPolicy: READ_RETRY,
  async run(input, context) {
    const resolved = resolveSandboxedPath(context.workingDirectory, input.path ?? ".");
    const entries = await listDirectory(resolved);
    return { entries: entries.map((e) => ({ ...e, path: path.relative(context.workingDirectory, e.path) })) };
  },
};

const searchFilesTool: ToolDefinition<{ pattern: string; path?: string }, { matches: string[] }> = {
  id: "search_files",
  name: "Search Files",
  description: "Recursively finds files under a directory whose relative path matches a substring or regular expression.",
  capabilities: ["filesystem", "read"],
  permission: { mode: "allowed", reason: "Read-only search." },
  inputSchema: z.object({ pattern: z.string().min(1), path: z.string().optional() }),
  timeoutMs: 15_000,
  retryPolicy: READ_RETRY,
  async run(input, context) {
    const resolved = resolveSandboxedPath(context.workingDirectory, input.path ?? ".");
    const files = await walkFiles(resolved);
    let regex: RegExp | undefined;
    try {
      regex = new RegExp(input.pattern);
    } catch {
      regex = undefined;
    }
    const matches = files
      .map((filePath) => path.relative(context.workingDirectory, filePath))
      .filter((relativePath) => (regex ? regex.test(relativePath) : relativePath.includes(input.pattern)));
    return { matches };
  },
};

export const FILE_TOOLS: ToolDefinition[] = [
  readFileTool as ToolDefinition,
  writeFileTool as ToolDefinition,
  appendFileTool as ToolDefinition,
  createFolderTool as ToolDefinition,
  deleteFileTool as ToolDefinition,
  moveFileTool as ToolDefinition,
  copyFileTool as ToolDefinition,
  listDirectoryTool as ToolDefinition,
  searchFilesTool as ToolDefinition,
];
