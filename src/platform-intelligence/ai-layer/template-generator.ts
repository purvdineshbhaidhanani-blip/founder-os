import type { AITextGenerationOptions, AITextGenerator } from "../shared/ai-text-generator.js";

export interface TemplateAITextGeneratorOptions {
  /** Custom responder. Defaults to a deterministic excerpt of the prompt — no AI model required. */
  respond?: (prompt: string, options?: AITextGenerationOptions) => string;
}

/**
 * Zero-dependency `AITextGenerator`: the default for every AI Recommendation
 * Layer consumer that hasn't wired in a real model. Guarantees the
 * intelligence layer works — deterministically, in tests, offline — with no
 * AI provider at all, mirroring the AI Engine's `MockProvider` (Loop 2).
 */
export class TemplateAITextGenerator implements AITextGenerator {
  constructor(private readonly options: TemplateAITextGeneratorOptions = {}) {}

  async generate(prompt: string, options?: AITextGenerationOptions): Promise<string> {
    if (this.options.respond) return this.options.respond(prompt, options);
    const excerpt = prompt.length > 240 ? `${prompt.slice(0, 240)}…` : prompt;
    return `Summary: ${excerpt}`;
  }
}
