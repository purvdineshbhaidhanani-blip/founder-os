import { generateId, nowIso } from "../../utils/id.js";
import { InMemoryStore } from "./store.js";
import type {
  MemoryEntry,
  MemoryNamespace,
  MemoryQuery,
  MemoryStore,
} from "./types.js";

export interface RememberOptions {
  id?: string;
  tags?: string[];
  ttlMs?: number;
}

export interface MemoryIndex {
  totalEntries: number;
  byNamespace: Record<MemoryNamespace, number>;
  byTag: Record<string, number>;
}

/**
 * Phase 1 surface — the public memory API every other runtime layer uses.
 * Keeps store concerns (`get/put/delete`) behind a higher-level vocabulary
 * (`remember/recall/forget/cleanup`).
 */
export class MemoryEngine {
  constructor(private readonly backingStore: MemoryStore = new InMemoryStore()) {}

  /** The underlying store — exposed read-only for startup diagnostics (e.g. connection verification). */
  get store(): MemoryStore {
    return this.backingStore;
  }

  async remember<T>(
    namespace: MemoryNamespace,
    key: string,
    data: T,
    opts: RememberOptions = {},
  ): Promise<MemoryEntry<T>> {
    const now = nowIso();
    const existing = opts.id ? await this.store.get(namespace, opts.id) : undefined;
    const entry: MemoryEntry<T> = {
      id: existing?.id ?? opts.id ?? generateId("mem"),
      namespace,
      key,
      data,
      tags: opts.tags ?? existing?.tags ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      expiresAt: opts.ttlMs
        ? new Date(Date.now() + opts.ttlMs).toISOString()
        : existing?.expiresAt,
    };
    await this.store.put(entry as MemoryEntry);
    return entry;
  }

  async recall(query: MemoryQuery = {}): Promise<MemoryEntry[]> {
    return this.store.list(query);
  }

  async forget(namespace: MemoryNamespace, id: string): Promise<void> {
    await this.store.delete(namespace, id);
  }

  /** Removes entries whose `expiresAt` is in the past. Returns the count removed. */
  async cleanup(): Promise<number> {
    const all = await this.store.list({ includeExpired: true });
    const now = Date.now();
    const expired = all.filter((entry) => entry.expiresAt && Date.parse(entry.expiresAt) <= now);
    for (const entry of expired) await this.store.delete(entry.namespace, entry.id);
    return expired.length;
  }

  async index(): Promise<MemoryIndex> {
    const all = await this.store.list({});
    const byNamespace = {
      working: 0,
      project: 0,
      task: 0,
      agent: 0,
      artifact: 0,
      conversation: 0,
    } as Record<MemoryNamespace, number>;
    const byTag: Record<string, number> = {};
    for (const entry of all) {
      byNamespace[entry.namespace] += 1;
      for (const tag of entry.tags) byTag[tag] = (byTag[tag] ?? 0) + 1;
    }
    return { totalEntries: all.length, byNamespace, byTag };
  }
}
