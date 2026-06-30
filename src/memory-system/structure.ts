import path from "node:path";
import { PATHS } from "../constants/paths.js";
import { ensureDir } from "../utils/fs.js";
import { JsonFileStore, type MemoryStore } from "../runtime/memory/index.js";

/**
 * The persistent memory layout. Each top-level folder backs one slice of the
 * runtime memory engine via a JsonFileStore so memory survives process
 * restarts and future projects. The runtime's MemoryEngine continues to drive
 * the in-process namespace API; this module just bootstraps durable storage.
 */
export const MEMORY_ROOT = path.join(PATHS.root, "Memory");

export const MEMORY_FOLDERS = [
  "Founder",
  "Company",
  "Projects",
  "Agents",
  "Skills",
  "Research",
  "Knowledge",
  "Shared",
  "Archive",
] as const;

export type MemoryFolder = (typeof MEMORY_FOLDERS)[number];

export async function bootstrapMemoryFolders(root: string = MEMORY_ROOT): Promise<void> {
  await ensureDir(root);
  for (const folder of MEMORY_FOLDERS) await ensureDir(path.join(root, folder));
}

export function folderPath(folder: MemoryFolder, root: string = MEMORY_ROOT): string {
  return path.join(root, folder);
}

export function folderStore(folder: MemoryFolder, root: string = MEMORY_ROOT): MemoryStore {
  return new JsonFileStore(path.join(root, folder, "memory.json"));
}

/** Returns one MemoryStore per durable folder; the engine can compose them by namespace. */
export function allFolderStores(root: string = MEMORY_ROOT): Record<MemoryFolder, MemoryStore> {
  return Object.fromEntries(MEMORY_FOLDERS.map((folder) => [folder, folderStore(folder, root)])) as Record<MemoryFolder, MemoryStore>;
}
