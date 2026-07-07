export interface AIMemoryRecord {
  id: string;
  /** Logical conversation/session this memory belongs to. */
  sessionId: string;
  content: string;
  /** Arbitrary tags for filtering, e.g. ["fact", "preference"]. */
  tags?: string[];
  createdAt: string;
  /** Optional relevance score attached by a retrieval pass. */
  score?: number;
}

export interface AIMemoryQuery {
  sessionId: string;
  tags?: string[];
  limit?: number;
}

/**
 * Long-lived memory for AI features — distinct from `ContextWindowManager`
 * (which manages the transient prompt window). Implementations can back this
 * with a vector store, a database, or plain memory; callers only depend on
 * this interface.
 */
export interface AIMemoryStore {
  remember(record: Omit<AIMemoryRecord, "id" | "createdAt">): Promise<AIMemoryRecord>;
  recall(query: AIMemoryQuery): Promise<AIMemoryRecord[]>;
  forget(id: string): Promise<void>;
  clear(sessionId: string): Promise<void>;
}

let counter = 0;
function generateMemoryId(): string {
  counter += 1;
  return `mem_${Date.now()}_${counter}`;
}

export class InMemoryAIMemoryStore implements AIMemoryStore {
  private readonly records = new Map<string, AIMemoryRecord>();

  async remember(record: Omit<AIMemoryRecord, "id" | "createdAt">): Promise<AIMemoryRecord> {
    const full: AIMemoryRecord = { ...record, id: generateMemoryId(), createdAt: new Date().toISOString() };
    this.records.set(full.id, full);
    return full;
  }

  async recall(query: AIMemoryQuery): Promise<AIMemoryRecord[]> {
    let results = [...this.records.values()].filter((r) => r.sessionId === query.sessionId);
    if (query.tags && query.tags.length > 0) {
      results = results.filter((r) => query.tags!.every((tag) => r.tags?.includes(tag)));
    }
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return query.limit ? results.slice(0, query.limit) : results;
  }

  async forget(id: string): Promise<void> {
    this.records.delete(id);
  }

  async clear(sessionId: string): Promise<void> {
    for (const [id, record] of this.records) {
      if (record.sessionId === sessionId) this.records.delete(id);
    }
  }
}
