export type {
  AIProviderName,
  AIMessage,
  CompletionRequest,
  CompletionResponse,
  StructuredCompletionRequest,
  StructuredCompletionResponse,
  StreamChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  AIProvider,
} from "./types.js";
export { complete, streamComplete, embed } from "./service.js";
export { completeStructured, extractJson, parseStructuredResponse } from "./structured-output.js";
export { registerPrompt, getPrompt, listRegisteredPromptKeys } from "./prompts.js";
export { summarizeAiUsage, recordAiUsage, type AiUsageSummary } from "./usage-tracking.js";
export { calculateCostMicroCents, microCentsToDollars } from "./cost.js";
export {
  requiresHumanApproval,
  recordAiActionProposed,
  recordAiActionApplied,
  recordAiActionRejected,
  type AIActionRiskTier,
} from "./approval.js";
export { withRetry } from "./retry.js";
