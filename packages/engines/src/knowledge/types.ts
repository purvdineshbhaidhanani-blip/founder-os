export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  sourceUrl?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  metadata?: Record<string, unknown>;
}

export type Embedding = number[];

export interface Citation {
  documentId: string;
  chunkId: string;
  documentTitle: string;
  snippet: string;
  score: number;
  sourceUrl?: string;
}

export interface RetrievalResult {
  citations: Citation[];
}
