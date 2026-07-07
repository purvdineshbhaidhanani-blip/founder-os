import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export interface DiscoveredIntelligenceModule {
  id: string;
  sourcePath: string;
}

/** Directories under `packages/intelligence/src` that are infrastructure, not standalone intelligence modules. */
const NON_MODULE_DIRECTORIES = new Set(["shared", "api", "registry"]);

function titleCase(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Scans `<platformRoot>/packages/intelligence/src` on disk for module
 * directories, the same verification approach the Module Registry (Loop 3)
 * uses for `packages/engines/src` — so "discovery" means "confirmed present
 * on disk," not just "listed in a catalog."
 */
export function discoverIntelligenceDirectories(platformRoot: string = process.cwd()): DiscoveredIntelligenceModule[] {
  const rootDir = path.join(platformRoot, "packages", "intelligence", "src");
  if (!existsSync(rootDir)) return [];

  const relativeBase = path.join("packages", "intelligence", "src");
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NON_MODULE_DIRECTORIES.has(entry.name))
    .map((entry) => ({ id: entry.name, sourcePath: path.join(relativeBase, entry.name) }))
    .filter(
      (result) =>
        existsSync(path.join(platformRoot, result.sourcePath, "index.ts")) ||
        existsSync(path.join(platformRoot, result.sourcePath, "index.js")),
    );
}

export function toDiscoveredModuleName(id: string): string {
  return titleCase(id);
}
