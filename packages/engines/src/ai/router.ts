import { isAIProviderError } from "./provider.js";
import type { AIProvider, CompletionRequest, CompletionResponse, StreamChunk } from "./types.js";

export interface ModelRoute {
  /** Matches `request.config.model` exactly, or "*" as a catch-all. */
  model: string;
  provider: AIProvider;
  /** Ordered fallback providers tried if the primary provider throws a retryable error. */
  fallbacks?: AIProvider[];
}

export interface ModelRouterOptions {
  routes: ModelRoute[];
  /** Used when no route matches and no "*" catch-all is registered. */
  defaultProvider?: AIProvider;
}

/**
 * Routes completion/stream requests to the right provider by model id, with
 * automatic fallback to secondary providers on retryable failures. This is
 * the one place callers depend on for "give me a completion" — they never
 * import a concrete provider directly.
 */
export class ModelRouter {
  private readonly routes = new Map<string, ModelRoute>();

  constructor(private readonly options: ModelRouterOptions) {
    for (const route of options.routes) {
      this.routes.set(route.model, route);
    }
  }

  private resolve(model: string): ModelRoute {
    const route = this.routes.get(model) ?? this.routes.get("*");
    if (route) return route;
    if (this.options.defaultProvider) {
      return { model, provider: this.options.defaultProvider };
    }
    throw new Error(`No route registered for model "${model}" and no default provider configured.`);
  }

  private candidates(route: ModelRoute): AIProvider[] {
    return [route.provider, ...(route.fallbacks ?? [])];
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const route = this.resolve(request.config.model);
    const providers = this.candidates(route);
    let lastError: unknown;
    for (const provider of providers) {
      try {
        return await provider.complete(request);
      } catch (error) {
        lastError = error;
        if (!isAIProviderError(error) || !error.retryable) throw error;
      }
    }
    throw lastError;
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const route = this.resolve(request.config.model);
    const providers = this.candidates(route);
    let lastError: unknown;
    for (const provider of providers) {
      try {
        yield* provider.stream(request);
        return;
      } catch (error) {
        lastError = error;
        if (!isAIProviderError(error) || !error.retryable) throw error;
      }
    }
    throw lastError;
  }

  registerRoute(route: ModelRoute): void {
    this.routes.set(route.model, route);
  }
}
