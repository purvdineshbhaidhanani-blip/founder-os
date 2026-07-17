import { mkdir, readdir, readFile, writeFile, appendFile, unlink, rename, copyFile, stat, rm, access } from "node:fs/promises";
import path from "node:path";

export async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

export async function writeTextFile(filePath: string, contents: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, contents, "utf-8");
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readTextFile(filePath);
  return JSON.parse(raw) as T;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/** Lists files in `dir` with the given extension (non-recursive). Returns [] if dir is missing. */
export async function listFilesWithExtension(dir: string, extension: string): Promise<string[]> {
  if (!(await pathExists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

/** Appends text to a file, creating it (and its parent directories) if it doesn't exist. */
export async function appendTextFile(filePath: string, contents: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await appendFile(filePath, contents, "utf-8");
}

export interface DirEntryInfo {
  name: string;
  path: string;
  isDirectory: boolean;
}

/** Lists every entry (file or directory) directly inside `dir`. Returns [] if dir is missing. */
export async function listDirectory(dir: string): Promise<DirEntryInfo[]> {
  if (!(await pathExists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .map((entry) => ({ name: entry.name, path: path.join(dir, entry.name), isDirectory: entry.isDirectory() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Recursively walks a directory tree, yielding every FILE path (not directories). Skips unreadable entries rather than throwing. */
export async function walkFiles(dir: string, maxDepth = 20): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    let entries: DirEntryInfo[];
    try {
      entries = await listDirectory(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory) await walk(entry.path, depth + 1);
      else out.push(entry.path);
    }
  }
  await walk(dir, 0);
  return out.sort();
}

/** True if `target` exists and is a directory (false, not throw, if it doesn't exist). */
export async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

/** Deletes a single file. No-ops (does not throw) if it doesn't exist. */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/** Recursively deletes a directory and its contents. No-ops if it doesn't exist. */
export async function deleteDir(dirPath: string): Promise<void> {
  await rm(dirPath, { recursive: true, force: true });
}

export async function moveFile(fromPath: string, toPath: string): Promise<void> {
  await ensureDir(path.dirname(toPath));
  await rename(fromPath, toPath);
}

export async function copyFileTo(fromPath: string, toPath: string): Promise<void> {
  await ensureDir(path.dirname(toPath));
  await copyFile(fromPath, toPath);
}

export interface FileStatInfo {
  sizeBytes: number;
  isDirectory: boolean;
  modifiedAt: string;
}

export async function statPath(target: string): Promise<FileStatInfo | undefined> {
  try {
    const info = await stat(target);
    return { sizeBytes: info.size, isDirectory: info.isDirectory(), modifiedAt: info.mtime.toISOString() };
  } catch {
    return undefined;
  }
}
