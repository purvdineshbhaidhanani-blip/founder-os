import { zodToJsonSchema } from "./json-schema.js";
import type { ToolDefinition, ToolDescriptor } from "./types.js";

export interface ToolQuery {
  capability?: string;
  /** Substring match against id/name/description. */
  text?: string;
}

/**
 * Tool Registry — a plain keyed collection with no per-tool `if`/`switch`
 * anywhere in this class or in `ToolExecutor`. New tools are added by
 * calling `register()` with a `ToolDefinition` object (see
 * `implementations/*.ts` + `index.ts`'s `BUILT_IN_TOOLS` array) — the
 * registry and executor never need to change to support a new tool.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool "${tool.id}" is already registered.`);
    }
    this.tools.set(tool.id, tool);
  }

  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) this.register(tool);
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  list(query: ToolQuery = {}): ToolDefinition[] {
    let all = [...this.tools.values()];
    if (query.capability) {
      all = all.filter((tool) => tool.capabilities.includes(query.capability!));
    }
    if (query.text) {
      const needle = query.text.toLowerCase();
      all = all.filter(
        (tool) =>
          tool.id.toLowerCase().includes(needle) ||
          tool.name.toLowerCase().includes(needle) ||
          tool.description.toLowerCase().includes(needle),
      );
    }
    return all.sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Serializable descriptors (no `run` function) — what gets exposed to an LLM's tool-calling surface or a UI. */
  describe(query: ToolQuery = {}): ToolDescriptor[] {
    return this.list(query).map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      capabilities: tool.capabilities,
      permission: tool.permission,
      timeoutMs: tool.timeoutMs,
      retryPolicy: tool.retryPolicy,
      inputJsonSchema: zodToJsonSchema(tool.inputSchema as never),
    }));
  }
}
