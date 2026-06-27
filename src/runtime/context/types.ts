import type { Timestamp } from "../../types/common.js";

export type ContextSource = "memory" | "artifact" | "message" | "system" | "blueprint";

export interface ContextSlice {
  id: string;
  source: ContextSource;
  content: string;
  /** Approximate token count; see countTokens(). Caller can override. */
  tokenCount: number;
  /** Higher value = retained when the budget is tight. */
  priority: number;
  tags: string[];
  /** Optional target agent name — if set, slice is only delivered when routing for that agent. */
  audience?: string;
  /** Required slices are never trimmed. */
  required?: boolean;
  createdAt?: Timestamp;
}

export interface ContextBudget {
  total: number;
  /** Reservations per category, e.g. { system: 500, taskMemory: 1500 }. */
  reserved: Record<string, number>;
}

export interface ContextRef {
  id?: string;
  source: ContextSource;
  content: string;
  priority?: number;
  tags?: string[];
  audience?: string;
  required?: boolean;
}
