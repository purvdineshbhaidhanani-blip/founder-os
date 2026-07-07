import type { DocumentChunk, KnowledgeDocument } from "./types.js";

export interface ChunkingOptions {
  /** Target chunk size in characters. Defaults to 1000. */
  chunkSize?: number;
  /** Character overlap between consecutive chunks, to preserve context across boundaries. */
  overlap?: number;
}

/** Splits a document's content into overlapping fixed-size chunks. */
export function chunkDocument(document: KnowledgeDocument, options: ChunkingOptions = {}): DocumentChunk[] {
  const chunkSize = options.chunkSize ?? 1000;
  const overlap = Math.min(options.overlap ?? 100, chunkSize - 1);
  const step = chunkSize - overlap;

  const chunks: DocumentChunk[] = [];
  let index = 0;
  for (let start = 0; start < document.content.length; start += step) {
    const content = document.content.slice(start, start + chunkSize);
    if (content.trim().length === 0) continue;
    chunks.push({
      id: `${document.id}#${index}`,
      documentId: document.id,
      content,
      index,
      metadata: document.metadata,
    });
    index += 1;
    if (start + chunkSize >= document.content.length) break;
  }
  return chunks;
}
