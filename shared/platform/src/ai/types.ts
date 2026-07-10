import type { z } from "zod";

/**
 * Provider-agnostic AI request/response types per standards/ai.md's
 * "provider abstraction layer (no direct SDK calls from feature code)"
 * rule. Every product imports these types and the functions in
 * `ai/index.ts` — never `@anthropic-ai/sdk` or `openai` directly.
 */

export type AIProviderName = "anthropic" | "openai";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  /** Caller-supplied label for cost attribution, e.g. "spendgov.cfo_copilot". Required — every call is attributable. */
  feature: string;
  organizationId?: string;
  userId?: string;
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** If set, response caching is keyed on (feature, messages, system) — only safe for deterministic/idempotent prompts. */
  cacheable?: boolean;
  /** Prompt registry key + version, for SH-AI-4 prompt versioning/audit trail. */
  promptVersion?: string;
}

export interface CompletionResponse {
  content: string;
  provider: AIProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  wasFallback: boolean;
  wasCacheHit: boolean;
  latencyMs: number;
}

export interface StructuredCompletionRequest<S extends z.ZodTypeAny> extends CompletionRequest {
  schema: S;
  /** Included in the prompt to tell the model what shape to return; keep short, the schema itself does the enforcement. */
  schemaDescription: string;
}

export interface StructuredCompletionResponse<S extends z.ZodTypeAny> extends Omit<CompletionResponse, "content"> {
  data: z.infer<S>;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface EmbeddingRequest {
  feature: string;
  organizationId?: string;
  input: string | string[];
}

export interface EmbeddingResponse {
  embeddings: number[][];
  provider: AIProviderName;
  model: string;
  inputTokens: number;
}

/** The interface every provider adapter implements — Anthropic, OpenAI, or any future provider. */
export interface AIProvider {
  readonly name: AIProviderName;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncGenerator<StreamChunk, void, unknown>;
  embed?(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
