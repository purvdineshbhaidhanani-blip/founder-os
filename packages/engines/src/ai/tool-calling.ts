import type { ChatMessage, ToolCallRequest, ToolDefinition } from "./types.js";

export type ToolHandler<TArgs = Record<string, unknown>, TResult = unknown> = (
  args: TArgs,
) => Promise<TResult> | TResult;

export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

/**
 * Holds tool definitions (for sending to the model) alongside their
 * handlers (for executing calls the model requests). Keeping both together
 * means the schema the model sees can never drift from what actually runs.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  register<TArgs = Record<string, unknown>, TResult = unknown>(
    definition: ToolDefinition,
    handler: ToolHandler<TArgs, TResult>,
  ): void {
    this.tools.set(definition.name, { definition, handler: handler as ToolHandler });
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  definitions(): ToolDefinition[] {
    return [...this.tools.values()].map((t) => t.definition);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Executes a single requested tool call, returning the message to feed back to the model. */
  async execute(call: ToolCallRequest): Promise<ChatMessage> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return {
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify({ error: `Unknown tool "${call.name}"` }),
      };
    }
    try {
      const result = await tool.handler(call.arguments);
      return {
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: typeof result === "string" ? result : JSON.stringify(result),
      };
    } catch (error) {
      return {
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      };
    }
  }

  /** Executes every tool call on an assistant message and returns the resulting tool messages. */
  async executeAll(calls: ToolCallRequest[]): Promise<ChatMessage[]> {
    return Promise.all(calls.map((call) => this.execute(call)));
  }
}
