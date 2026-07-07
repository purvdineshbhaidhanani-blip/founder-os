import type { SearchIndexProvider } from "./index-provider.js";
import type { ScoredDocument, SearchDocument, SearchQuery, SearchResult } from "./types.js";

export interface CollectionResult<T extends SearchDocument = SearchDocument> extends SearchResult<T> {
  collection: string;
}

export interface GlobalSearchResult {
  collections: CollectionResult[];
  total: number;
}

/**
 * Registry of named search indices ("collections") — e.g. "users",
 * "documents", "products" — plus a global search that fans a query out to
 * every collection (or a chosen subset) and merges the results.
 */
export class SearchEngine {
  private readonly collections = new Map<string, SearchIndexProvider>();

  registerCollection<T extends SearchDocument>(provider: SearchIndexProvider<T>): void {
    this.collections.set(provider.name, provider as SearchIndexProvider);
  }

  unregisterCollection(name: string): void {
    this.collections.delete(name);
  }

  collection<T extends SearchDocument = SearchDocument>(name: string): SearchIndexProvider<T> | undefined {
    return this.collections.get(name) as SearchIndexProvider<T> | undefined;
  }

  async search<T extends SearchDocument = SearchDocument>(
    name: string,
    query: SearchQuery,
  ): Promise<SearchResult<T>> {
    const provider = this.collections.get(name);
    if (!provider) throw new Error(`No search collection registered as "${name}".`);
    return provider.search(query) as Promise<SearchResult<T>>;
  }

  /** Searches every registered collection (or `collectionNames` if given) and merges results by score. */
  async searchAll(query: SearchQuery, collectionNames?: string[]): Promise<GlobalSearchResult> {
    const names = collectionNames ?? [...this.collections.keys()];
    const collectionResults = await Promise.all(
      names.map(async (name): Promise<CollectionResult> => {
        const provider = this.collections.get(name);
        if (!provider) throw new Error(`No search collection registered as "${name}".`);
        const result = await provider.search(query);
        return { collection: name, ...result };
      }),
    );

    const total = collectionResults.reduce((sum, r) => sum + r.total, 0);
    return { collections: collectionResults, total };
  }

  /** Flattens `searchAll` into a single score-ranked list across collections. */
  async searchAllFlat(query: SearchQuery, collectionNames?: string[]): Promise<ScoredDocument[]> {
    const { collections } = await this.searchAll(query, collectionNames);
    return collections
      .flatMap((c) => c.items)
      .sort((a, b) => b.score - a.score);
  }
}
