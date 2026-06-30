import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";

export type VaultEntryKind =
  | "decision"
  | "preference"
  | "company-vision"
  | "product-vision"
  | "business-rule"
  | "long-term-goal"
  | "lesson"
  | "investment-idea"
  | "research-archive"
  | "strategic-note";

export interface VaultEntry<T = string> {
  id: string;
  kind: VaultEntryKind;
  title: string;
  content: T;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VaultQuery {
  kind?: VaultEntryKind;
  tag?: string;
  text?: string;
}

/**
 * Founder Knowledge Vault — durable, queryable record of every founder
 * decision, preference, vision statement, business rule, long-term goal,
 * lesson learned, investment idea, archived research, and strategic note.
 * The Company Brain reads this as its long-term context.
 */
export class FounderVault {
  private entries = new Map<string, VaultEntry>();

  add<T = string>(
    input: Omit<VaultEntry<T>, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): VaultEntry<T> {
    const now = nowIso();
    const entry: VaultEntry<T> = {
      id: input.id ?? generateId("vault"),
      kind: input.kind,
      title: input.title,
      content: input.content,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(entry.id, entry as VaultEntry);
    return entry;
  }

  update<T = string>(id: string, updates: Partial<Omit<VaultEntry<T>, "id" | "createdAt">>): VaultEntry<T> {
    const existing = this.entries.get(id);
    if (!existing) throw new Error(`Unknown vault entry "${id}"`);
    const merged: VaultEntry<T> = {
      ...(existing as VaultEntry<T>),
      ...updates,
      updatedAt: nowIso(),
    };
    this.entries.set(id, merged as VaultEntry);
    return merged;
  }

  get(id: string): VaultEntry | undefined { return this.entries.get(id); }

  list(): VaultEntry[] {
    return [...this.entries.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  search(query: VaultQuery): VaultEntry[] {
    return this.list().filter((entry) => {
      if (query.kind && entry.kind !== query.kind) return false;
      if (query.tag && !entry.tags.includes(query.tag)) return false;
      if (query.text) {
        const needle = query.text.toLowerCase();
        const content = typeof entry.content === "string" ? entry.content : JSON.stringify(entry.content);
        if (!`${entry.title} ${content}`.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }

  countByKind(): Record<VaultEntryKind, number> {
    const counts = {} as Record<VaultEntryKind, number>;
    for (const entry of this.list()) {
      counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
    }
    return counts;
  }
}
