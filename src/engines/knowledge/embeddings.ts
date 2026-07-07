import type { Embedding } from "./types.js";

/**
 * The contract every embedding backend must satisfy. Providers are swapped
 * without touching `KnowledgeRetriever` — the only coupling is this
 * interface.
 */
export interface EmbeddingProvider {
  readonly dimensions: number;
  embed(texts: string[]): Promise<Embedding[]>;
}

/**
 * Deterministic, dependency-free embedding provider based on token hashing.
 * Not semantically meaningful, but stable and fast — useful for tests, local
 * development, and as a default that requires no API key or network call.
 */
export class HashEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  constructor(dimensions = 128) {
    this.dimensions = dimensions;
  }

  private embedOne(text: string): Embedding {
    const vector = new Array(this.dimensions).fill(0) as number[];
    const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    for (const token of tokens) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
      }
      const idx = hash % this.dimensions;
      vector[idx] = (vector[idx] ?? 0) + 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }

  async embed(texts: string[]): Promise<Embedding[]> {
    return texts.map((text) => this.embedOne(text));
  }
}

export interface OpenAIEmbeddingProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  dimensions?: number;
  fetchImpl?: typeof fetch;
}

/** Adapter for OpenAI-compatible embedding endpoints. */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenAIEmbeddingProviderOptions) {
    this.model = options.model ?? "text-embedding-3-small";
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.dimensions = options.dimensions ?? 1536;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async embed(texts: string[]): Promise<Embedding[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!response.ok) {
      throw new Error(`Embedding request failed: ${await response.text()}`);
    }
    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return data.data.map((d) => d.embedding);
  }
}
