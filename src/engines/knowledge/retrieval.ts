import { chunkDocument, type ChunkingOptions } from "./chunking.js";
import { InMemoryDocumentStore, type DocumentStore } from "./document-store.js";
import type { EmbeddingProvider } from "./embeddings.js";
import type { Citation, KnowledgeDocument } from "./types.js";
import { InMemoryVectorStore, type VectorStoreProvider } from "./vector-store.js";

export interface KnowledgeRetrieverOptions {
  embeddings: EmbeddingProvider;
  vectorStore?: VectorStoreProvider;
  documentStore?: DocumentStore;
  chunking?: ChunkingOptions;
}

/**
 * Ties documents, chunking, embeddings, and the vector store together into
 * one "add a document" / "ask a question, get citations" API. Each
 * dependency is injected through its interface, so any embedding provider or
 * vector store can be substituted freely.
 */
export class KnowledgeRetriever {
  private readonly embeddings: EmbeddingProvider;
  private readonly vectorStore: VectorStoreProvider;
  private readonly documentStore: DocumentStore;
  private readonly chunking?: ChunkingOptions;

  constructor(options: KnowledgeRetrieverOptions) {
    this.embeddings = options.embeddings;
    this.vectorStore = options.vectorStore ?? new InMemoryVectorStore();
    this.documentStore = options.documentStore ?? new InMemoryDocumentStore();
    this.chunking = options.chunking;
  }

  async addDocument(document: KnowledgeDocument): Promise<void> {
    await this.documentStore.saveDocument(document);
    const chunks = chunkDocument(document, this.chunking);
    await this.documentStore.saveChunks(chunks);

    const vectors = await this.embeddings.embed(chunks.map((c) => c.content));
    await this.vectorStore.upsertMany(
      chunks.map((chunk, i) => ({
        id: chunk.id,
        vector: vectors[i]!,
        metadata: { documentId: chunk.documentId, chunkIndex: chunk.index },
      })),
    );
  }

  async removeDocument(documentId: string): Promise<void> {
    await this.documentStore.deleteDocument(documentId);
  }

  async query(text: string, topK = 5): Promise<Citation[]> {
    const [vector] = await this.embeddings.embed([text]);
    const matches = await this.vectorStore.query(vector!, topK);

    const citations: Citation[] = [];
    for (const match of matches) {
      const chunk = await this.documentStore.getChunk(match.id);
      if (!chunk) continue;
      const document = await this.documentStore.getDocument(chunk.documentId);
      if (!document) continue;
      citations.push({
        documentId: document.id,
        chunkId: chunk.id,
        documentTitle: document.title,
        snippet: chunk.content.slice(0, 280),
        score: match.score,
        sourceUrl: document.sourceUrl,
      });
    }
    return citations;
  }
}
