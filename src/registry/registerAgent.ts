import { PATHS } from "../constants/paths.js";
import { loadRegistry, saveRegistry } from "./registryStore.js";
import { upsertRegistryEntry, type RegisterAgentInput, type UpsertResult } from "./registryManager.js";

/** Load-upsert-save in one call — the entrypoint the CLI's `generate` command uses after validation passes. */
export async function registerAgent(
  input: RegisterAgentInput,
  registryFile: string = PATHS.registryFile,
): Promise<UpsertResult> {
  const registry = await loadRegistry(registryFile);
  const result = upsertRegistryEntry(registry, input);
  if (result.changed) {
    await saveRegistry(result.registry, registryFile);
  }
  return result;
}
