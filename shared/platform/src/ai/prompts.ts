/**
 * Prompt versioning per standards/ai.md: prompts are registered with a
 * stable key + version rather than inlined as string literals scattered
 * across product code, so a prompt change is a reviewable diff and every
 * AI call's usage log (`ai/usage-tracking.ts`) records which version ran.
 */

interface RegisteredPrompt {
  version: string;
  system: string;
}

const registry = new Map<string, RegisteredPrompt>();

export function registerPrompt(key: string, prompt: RegisteredPrompt): void {
  registry.set(key, prompt);
}

export function getPrompt(key: string): RegisteredPrompt {
  const prompt = registry.get(key);
  if (!prompt) {
    throw new Error(`No prompt registered for key "${key}". Call registerPrompt() during product startup.`);
  }
  return prompt;
}

export function listRegisteredPromptKeys(): string[] {
  return Array.from(registry.keys());
}
