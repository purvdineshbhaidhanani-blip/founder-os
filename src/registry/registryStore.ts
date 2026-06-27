import type { Registry } from "../types/registry.js";
import { emptyRegistry } from "../types/registry.js";
import { REGISTRY_SCHEMA_VERSION } from "../constants/factory.js";
import { PATHS } from "../constants/paths.js";
import { pathExists, readJsonFile, writeJsonFile } from "../utils/fs.js";

/** Loads the registry file, or returns a fresh empty registry if it doesn't exist yet. */
export async function loadRegistry(filePath: string = PATHS.registryFile): Promise<Registry> {
  if (!(await pathExists(filePath))) {
    return emptyRegistry(REGISTRY_SCHEMA_VERSION);
  }
  return readJsonFile<Registry>(filePath);
}

export async function saveRegistry(
  registry: Registry,
  filePath: string = PATHS.registryFile,
): Promise<void> {
  await writeJsonFile(filePath, registry);
}
