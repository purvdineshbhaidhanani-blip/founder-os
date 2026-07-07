import type { SearchDocument, SearchQuery, SearchResult } from "./types.js";

/**
 * The contract every search backend must satisfy — in-memory, Postgres
 * full-text, Elasticsearch, Algolia, etc. The `SearchEngine` and callers
 * only ever depend on this, never on a concrete backend.
 */
export interface SearchIndexProvider<T extends SearchDocument = SearchDocument> {
  readonly name: string;
  index(document: T): Promise<void>;
  indexMany(documents: T[]): Promise<void>;
  remove(id: string): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult<T>>;
  clear(): Promise<void>;
}
