import type { ProductDefinition } from "./types.js";

/**
 * Bridges the convenience boolean toggles (`aiEnabled`, `teamsEnabled`, ...)
 * and `authMode` to the concrete platform module ids they imply, and unions
 * that with the explicit `modules` list. This is what the Bootstrap System
 * and Documentation Generator resolve against the Module Registry — callers
 * never have to manually keep `modules` in sync with the toggles.
 */
export function resolveEffectiveModules(definition: ProductDefinition): string[] {
  const implied = new Set(definition.modules);

  if (definition.authMode !== "none") implied.add("auth");
  if (definition.teamsEnabled) implied.add("teams-roles");
  if (definition.aiEnabled) implied.add("ai");
  if (definition.featureFlagsEnabled) implied.add("feature-flags");
  if (definition.storageEnabled) implied.add("storage");

  return [...implied];
}
