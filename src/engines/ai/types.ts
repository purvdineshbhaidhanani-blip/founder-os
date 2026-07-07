/**
 * Core types for the AI Engine. Every provider adapter, router, and manager in
 * this engine speaks these types — no provider-specific shape ever leaks out
 * of `providers/*`.
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: ChatRole;
  /** Plain text content. Omitted for pure tool-call assistant turns. */
  content?: string;
  /** Present when role is "assistant" and the model requested tool calls. */
  toolCalls?: ToolCallRequest[];
  /** Present when role is "tool" — the result being fed back to the model. */
  toolCallId?: string;
  name?: string;
}

export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

export interface ModelConfig {
  /** Logical model id, e.g. "claude-sonnet-5", "gpt-4o". Provider-specific. */
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  config: ModelConfig;
  /** Per-request signal for cancellation. */
  signal?: AbortSignal;
}

export type FinishReason = "stop" | "length" | "tool_calls" | "content_filter" | "error";

export interface CompletionResponse {
  message: ChatMessage;
  finishReason: FinishReason;
  usage: TokenUsage;
  /** Raw provider id for the completion, useful for debugging/audit. */
  providerRequestId?: string;
}

export type StreamChunk =
  | { type: "text-delta"; delta: string }
  | { type: "tool-call-delta"; id: string; name?: string; argumentsDelta?: string }
  | { type: "finish"; finishReason: FinishReason; usage: TokenUsage };

export interface AIProviderInfo {
  /** Stable adapter id, e.g. "openai", "anthropic", "mock". */
  id: string;
  displayName: string;
  supportsStreaming: boolean;
  supportsTools: boolean;
}

/**
 * The single contract every model provider adapter must implement. Nothing
 * upstream (router, prompt manager, tool loop) is allowed to depend on
 * anything beyond this interface — that's what keeps providers swappable.
 */
export interface AIProvider {
  readonly info: AIProviderInfo;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;
}

export interface AIProviderError extends Error {
  providerId: string;
  retryable: boolean;
  statusCode?: number;
}
