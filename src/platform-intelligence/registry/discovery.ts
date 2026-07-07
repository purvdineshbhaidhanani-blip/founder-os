import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export interface DiscoveredIntelligenceModule {
  id: string;
  sourcePath: string;
}

/** Directories under `src/platform-intelligence` that are infrastructure, not standalone intelligence modules. */
const NON_MODULE_DIRECTORIES = new Set(["shared", "api", "registry"]);

function titleCase(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Scans `<platformRoot>/src/platform-intelligence` on disk for module
 * directories, the same verification approach the Module Registry (Loop 3)
 * uses for `src/engines` — so "discovery" means "confirmed present on
 * disk," not just "listed in a catalog."
 */
export function discoverIntelligenceDirectories(platformRoot: string = process.cwd()): DiscoveredIntelligenceModule[] {
  const rootDir = path.join(platformRoot, "src", "platform-intelligence");
  if (!existsSync(rootDir)) return [];

  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NON_MODULE_DIRECTORIES.has(entry.name))
    .map((entry) => ({ id: entry.name, sourcePath: path.join("src", "platform-intelligence", entry.name) }))
    .filter(
      (result) =>
        existsSync(path.join(platformRoot, result.sourcePath, "index.ts")) ||
        existsSync(path.join(platformRoot, result.sourcePath, "index.js")),
    );
}

export function toDiscoveredModuleName(id: string): string {
  return titleCase(id);
}
