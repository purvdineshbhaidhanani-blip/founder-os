import type { Embedding } from "./types.js";

export interface VectorRecord {
  id: string;
  vector: Embedding;
  metadata?: Record<string, unknown>;
}

export interface VectorMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * The contract every vector database must satisfy — in-memory, pgvector,
 * Pinecone, Qdrant, etc. `KnowledgeRetriever` depends only on this.
 */
export interface VectorStoreProvider {
  upsert(record: VectorRecord): Promise<void>;
  upsertMany(records: VectorRecord[]): Promise<void>;
  query(vector: Embedding, topK: number): Promise<VectorMatch[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

function cosineSimilarity(a: Embedding, b: Embedding): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Brute-force cosine-similarity vector store. O(n) per query — fine for
 * small-to-medium corpora and as the zero-dependency default; swap in a real
 * vector database via the same interface once scale demands it.
 */
export class InMemoryVectorStore implements VectorStoreProvider {
  private readonly records = new Map<string, VectorRecord>();

  async upsert(record: VectorRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async upsertMany(records: VectorRecord[]): Promise<void> {
    for (const record of records) this.records.set(record.id, record);
  }

  async query(vector: Embedding, topK: number): Promise<VectorMatch[]> {
    const scored = [...this.records.values()].map((record) => ({
      id: record.id,
      score: cosineSimilarity(vector, record.vector),
      metadata: record.metadata,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }
}
