import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export interface DiscoveredEngine {
  id: string;
  sourcePath: string;
}

function titleCase(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Scans `<platformRoot>/packages/engines/src` on disk and returns every
 * subdirectory that looks like a real module (has an `index.ts` or
 * `index.js`). This is the "automatically discover available platform
 * modules" requirement: the registry doesn't just trust a hardcoded list,
 * it verifies — and picks up — whatever engines actually exist on disk.
 */
export function discoverEngineDirectories(platformRoot: string = process.cwd()): DiscoveredEngine[] {
  const enginesDir = path.join(platformRoot, "packages", "engines", "src");
  if (!existsSync(enginesDir)) return [];

  const relativeBase = path.join("packages", "engines", "src");
  return readdirSync(enginesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
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
