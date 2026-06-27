import { generateId, nowIso } from "../../utils/id.js";
import type { ContextBudget, ContextRef, ContextSlice } from "./types.js";

/**
 * Rough token estimator: ~4 chars/token for English text. Good enough for
 * budgeting; callers that have a real tokenizer should pass `tokenCount`
 * explicitly when constructing slices.
 */
export function countTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

export interface ContextManagerOptions {
  budget?: ContextBudget;
}

/**
 * Phase 8 surface — assemble, route, and trim context for an agent invocation.
 * The manager does not call any LLM; it only owns slice bookkeeping. Higher
 * layers (orchestrator, execution engine) call `route` to get the slices a
 * given agent should receive.
 */
export class ContextManager {
  private readonly budget: ContextBudget;

  constructor(options: ContextManagerOptions = {}) {
    this.budget = options.budget ?? { total: 16_000, reserved: {} };
  }

  load(refs: ContextRef[]): ContextSlice[] {
    const createdAt = nowIso();
    return refs.map((ref) => ({
      id: ref.id ?? generateId("ctx"),
      source: ref.source,
      content: ref.content,
      tokenCount: countTokens(ref.content),
      priority: ref.priority ?? 0,
      tags: ref.tags ?? [],
      audience: ref.audience,
      required: ref.required ?? false,
      createdAt,
    }));
  }

  /**
   * Reduces a list of slices to fit `targetTokens` while preserving every
   * `required` slice and respecting priority order. Lower-priority,
   * non-required slices are dropped first; remaining content beyond the
   * budget is truncated with a `[truncated]` marker.
   */
  compress(slices: ContextSlice[], targetTokens: number): ContextSlice[] {
    const sorted = [...slices].sort((a, b) => Number(b.required) - Number(a.required) || b.priority - a.priority);
    const kept: ContextSlice[] = [];
    let used = 0;
    for (const slice of sorted) {
      const remaining = targetTokens - used;
      if (remaining <= 0) {
        if (slice.required) kept.push(slice);
        continue;
      }
      if (slice.tokenCount <= remaining) {
        kept.push(slice);
        used += slice.tokenCount;
        continue;
      }
      if (slice.required) {
        kept.push(slice);
        used += slice.tokenCount;
        continue;
      }
      const charBudget = Math.max(0, remaining * 4 - "[truncated]".length);
      kept.push({
        ...slice,
        content: `${slice.content.slice(0, charBudget)}…[truncated]`,
        tokenCount: remaining,
      });
      used = targetTokens;
    }
    return kept.sort((a, b) => b.priority - a.priority);
  }

  budgetSummary(): ContextBudget {
    return this.budget;
  }

  /** Returns the bytes-budget after subtracting every named reservation. */
  freeBudget(): number {
    const reserved = Object.values(this.budget.reserved).reduce((sum, value) => sum + value, 0);
    return Math.max(0, this.budget.total - reserved);
  }

  /**
   * Filters slices for `agentName`: includes slices whose audience matches the
   * agent (or is undefined). Then sorts by priority for downstream trimming.
   */
  route(slices: ContextSlice[], agentName: string): ContextSlice[] {
    return slices
      .filter((slice) => !slice.audience || slice.audience === agentName)
      .sort((a, b) => b.priority - a.priority);
  }

  /** Drops the lowest-priority slices until total tokens ≤ maxTokens. Required slices are never dropped. */
  trim(slices: ContextSlice[], maxTokens: number): ContextSlice[] {
    const ordered = [...slices].sort((a, b) => Number(b.required) - Number(a.required) || b.priority - a.priority);
    const kept: ContextSlice[] = [];
    let used = 0;
    for (const slice of ordered) {
      if (slice.required) {
        kept.push(slice);
        used += slice.tokenCount;
        continue;
      }
      if (used + slice.tokenCount > maxTokens) continue;
      kept.push(slice);
      used += slice.tokenCount;
    }
    return kept;
  }

  /**
   * Produces the child agent's starting context: every required slice plus
   * every slice tagged "shared" from the parent. Audience-restricted slices
   * for a different agent are dropped.
   */
  inherit(parent: ContextSlice[], childAgent: string): ContextSlice[] {
    return parent.filter((slice) => {
      if (slice.audience && slice.audience !== childAgent) return false;
      return slice.required || slice.tags.includes("shared");
    });
  }
}
