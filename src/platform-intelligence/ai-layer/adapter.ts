import type { AIProvider } from "../../engines/ai/types.js";
import type { AITextGenerationOptions, AITextGenerator } from "../shared/ai-text-generator.js";

export interface FromAIProviderOptions {
  /** Model id to request from the provider, e.g. "claude-sonnet-5". Required — the intelligence layer has no default model. */
  model: string;
}

/**
 * Bridges a Loop 2 `AIProvider` (chat-message based) into the narrower
 * `AITextGenerator` interface this layer depends on. Purely optional
 * composition glue — nothing in the AI Recommendation Layer requires this
 * file to exist, and no other module imports it.
 */
export function fromAIProvider(provider: AIProvider, options: FromAIProviderOptions): AITextGenerator {
  return {
    async generate(prompt: string, generationOptions?: AITextGenerationOptions): Promise<string> {
      const response = await provider.complete({
        messages: [{ role: "user", content: prompt }],
        config: {
          model: options.model,
          maxOutputTokens: generationOptions?.maxTokens,
          temperature: generationOptions?.temperature,
        },
      });
      return response.message.content ?? "";
    },
  };
}
