import { OllamaProvider } from "./ollama-provider.js";
import { LlmError, type LlmCompletionRequest, type LlmCompletionResult, type LlmProvider } from "./types.js";

/**
 * LlmClient — a small provider registry + dispatch layer. The rest of the
 * system depends on THIS, never on a concrete provider, so swapping Ollama for
 * another backend is a one-line registration (see docs/LLM_ADAPTER.md). It
 * holds no provider-specific logic — it only routes a request to a named
 * provider and delegates.
 */
export class LlmClient {
  private readonly providers = new Map<string, LlmProvider>();
  private defaultProviderId: string;

  constructor(providers: LlmProvider[] = [new OllamaProvider()], defaultProviderId?: string) {
    for (const provider of providers) this.providers.set(provider.id, provider);
    this.defaultProviderId = defaultProviderId ?? providers[0]?.id ?? "ollama";
  }

  register(provider: LlmProvider, makeDefault = false): void {
    this.providers.set(provider.id, provider);
    if (makeDefault) this.defaultProviderId = provider.id;
  }

  list(): string[] {
    return [...this.providers.keys()];
  }

  get defaultProvider(): string {
    return this.defaultProviderId;
  }

  getProvider(id?: string): LlmProvider {
    const providerId = id ?? this.defaultProviderId;
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new LlmError(providerId, "unavailable", `No LLM provider registered under id "${providerId}".`);
    }
    return provider;
  }

  /** True when the (default or named) provider's backend is reachable. */
  async isAvailable(providerId?: string, signal?: AbortSignal): Promise<boolean> {
    return this.getProvider(providerId).isAvailable(signal);
  }

  /** Executes a completion against the default (or named) provider. Throws a typed LlmError on failure. */
  async complete(request: LlmCompletionRequest, providerId?: string): Promise<LlmCompletionResult> {
    return this.getProvider(providerId).complete(request);
  }
}

/** Default client wired to a single Ollama provider (host from OLLAMA_HOST). */
export function createDefaultLlmClient(): LlmClient {
  return new LlmClient([new OllamaProvider()], "ollama");
}
