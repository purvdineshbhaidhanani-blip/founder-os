export * from "./types.js";
export * from "./sandbox.js";
export * from "./json-schema.js";
export * from "./registry.js";
export * from "./permissions.js";
export * from "./executor.js";
export * from "./implementations/file-tools.js";
export * from "./implementations/shell-tools.js";
export * from "./implementations/git-tools.js";
export * from "./implementations/http-tools.js";
export * from "./implementations/search-tools.js";

import { FILE_TOOLS } from "./implementations/file-tools.js";
import { SHELL_TOOLS } from "./implementations/shell-tools.js";
import { GIT_TOOLS } from "./implementations/git-tools.js";
import { HTTP_TOOLS } from "./implementations/http-tools.js";
import { SEARCH_TOOLS } from "./implementations/search-tools.js";
import { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./types.js";

/** Every built-in tool this repository ships, in one flat array — the only place a new built-in tool needs to be listed. */
export const BUILT_IN_TOOLS: ToolDefinition[] = [...FILE_TOOLS, ...SHELL_TOOLS, ...GIT_TOOLS, ...HTTP_TOOLS, ...SEARCH_TOOLS];

/** Builds a ToolRegistry pre-populated with every built-in tool. */
export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.registerAll(BUILT_IN_TOOLS);
  return registry;
}
