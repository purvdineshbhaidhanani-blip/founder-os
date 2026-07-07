export interface AITextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * The one AI-shaped interface the entire platform intelligence layer
 * depends on: "give me text back for this prompt." Deliberately narrower
 * than the AI Engine's `AIProvider` (chat messages, tool calls, streaming)
 * — intelligence modules only ever need single-shot text generation, so
 * that's all this interface promises. See `ai-layer/adapter.ts` for an
 * optional bridge from a Loop 2 `AIProvider` to this interface.
 */
export interface AITextGenerator {
  generate(prompt: string, options?: AITextGenerationOptions): Promise<string>;
}
