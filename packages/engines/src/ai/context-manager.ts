import type { ChatMessage } from "./types.js";

export type TokenCounter = (text: string) => number;

/** Default counter — a rough heuristic (~4 chars/token) that needs no tokenizer dependency. */
export const estimateTokens: TokenCounter = (text: string) => Math.max(1, Math.ceil(text.length / 4));

export interface ContextWindowOptions {
  maxTokens: number;
  tokenCounter?: TokenCounter;
  /** Number of leading messages (e.g. the system prompt) always kept regardless of budget. */
  reserveLeading?: number;
}

function messageTokens(message: ChatMessage, counter: TokenCounter): number {
  const contentTokens = message.content ? counter(message.content) : 0;
  const toolTokens = (message.toolCalls ?? []).reduce(
    (sum, call) => sum + counter(JSON.stringify(call.arguments)) + counter(call.name),
    0,
  );
  return contentTokens + toolTokens;
}

/**
 * Fits a message list inside a token budget by dropping the oldest
 * non-reserved messages first. Providers reject requests that exceed their
 * context window, so every caller building a `CompletionRequest` should pass
 * messages through this before sending them.
 */
export class ContextWindowManager {
  private readonly counter: TokenCounter;

  constructor(private readonly options: ContextWindowOptions) {
    this.counter = options.tokenCounter ?? estimateTokens;
  }

  countTokens(messages: ChatMessage[]): number {
    return messages.reduce((sum, m) => sum + messageTokens(m, this.counter), 0);
  }

  /** Returns a new array — never mutates the input. */
  fit(messages: ChatMessage[]): ChatMessage[] {
    const reserveCount = this.options.reserveLeading ?? 0;
    const leading = messages.slice(0, reserveCount);
    const rest = messages.slice(reserveCount);

    let budget = this.options.maxTokens - this.countTokens(leading);
    const kept: ChatMessage[] = [];
    for (let i = rest.length - 1; i >= 0; i--) {
      const message = rest[i]!;
      const tokens = messageTokens(message, this.counter);
      if (tokens > budget && kept.length > 0) break;
      kept.unshift(message);
      budget -= tokens;
    }
    return [...leading, ...kept];
  }
}
