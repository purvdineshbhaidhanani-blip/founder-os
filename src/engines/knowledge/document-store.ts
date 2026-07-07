import type { DocumentChunk, KnowledgeDocument } from "./types.js";

/** Persists documents and their chunks so retrieval results can be mapped back to source text. */
export interface DocumentStore {
  saveDocument(document: KnowledgeDocument): Promise<void>;
  getDocument(id: string): Promise<KnowledgeDocument | undefined>;
  saveChunks(chunks: DocumentChunk[]): Promise<void>;
  getChunk(id: string): Promise<DocumentChunk | undefined>;
  deleteDocument(id: string): Promise<void>;
}

export class InMemoryDocumentStore implements DocumentStore {
  private readonly documents = new Map<string, KnowledgeDocument>();
  private readonly chunks = new Map<string, DocumentChunk>();

  async saveDocument(document: KnowledgeDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  async getDocument(id: string): Promise<KnowledgeDocument | undefined> {
    return this.documents.get(id);
  }

  async saveChunks(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) this.chunks.set(chunk.id, chunk);
  }

  async getChunk(id: string): Promise<DocumentChunk | undefined> {
    return this.chunks.get(id);
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    for (const [chunkId, chunk] of this.chunks) {
      if (chunk.documentId === id) this.chunks.delete(chunkId);
    }
  }
}
