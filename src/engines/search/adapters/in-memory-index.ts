import type { SearchIndexProvider } from "../index-provider.js";
import type {
  FilterExpr,
  ScoredDocument,
  SearchDocument,
  SearchQuery,
  SearchResult,
  SortSpec,
} from "../types.js";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function textOf(document: SearchDocument, fields?: string[]): string {
  const keys = fields ?? Object.keys(document);
  return keys
    .map((key) => document[key])
    .filter((value) => typeof value === "string")
    .join(" ");
}

function matchesFilter(document: SearchDocument, filter: FilterExpr): boolean {
  const actual = document[filter.field];
  switch (filter.op) {
    case "eq":
      return actual === filter.value;
    case "neq":
      return actual !== filter.value;
    case "gt":
      return typeof actual === "number" && actual > (filter.value as number);
    case "gte":
      return typeof actual === "number" && actual >= (filter.value as number);
    case "lt":
      return typeof actual === "number" && actual < (filter.value as number);
    case "lte":
      return typeof actual === "number" && actual <= (filter.value as number);
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(actual);
    case "contains":
      return (
        typeof actual === "string" &&
        typeof filter.value === "string" &&
        actual.toLowerCase().includes(filter.value.toLowerCase())
      );
    default:
      return true;
  }
}

function compareBySort(a: SearchDocument, b: SearchDocument, sort: SortSpec[]): number {
  for (const spec of sort) {
    const av = a[spec.field];
    const bv = b[spec.field];
    if (av === bv) continue;
    const direction = spec.direction === "asc" ? 1 : -1;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return av > bv ? direction : -direction;
  }
  return 0;
}

/** Naive term-frequency score: fraction of query tokens found in the document text. */
function scoreText(document: SearchDocument, queryTokens: string[], textFields?: string[]): number {
  if (queryTokens.length === 0) return 1;
  const docTokens = new Set(tokenize(textOf(document, textFields)));
  const matches = queryTokens.filter((token) => docTokens.has(token)).length;
  return matches / queryTokens.length;
}

export interface InMemoryIndexOptions {
  /** Restrict full-text scoring/matching to these fields. Defaults to all string fields. */
  textFields?: string[];
}

/**
 * Zero-dependency full-text + filter + sort index. Good enough for small to
 * medium in-process datasets and as the default so the Search Engine works
 * out of the box with no external service required.
 */
export class InMemoryIndexProvider<T extends SearchDocument = SearchDocument>
  implements SearchIndexProvider<T>
{
  private readonly documents = new Map<string, T>();

  constructor(
    readonly name: string,
    private readonly options: InMemoryIndexOptions = {},
  ) {}

  async index(document: T): Promise<void> {
    this.documents.set(document.id, document);
  }

  async indexMany(documents: T[]): Promise<void> {
    for (const doc of documents) this.documents.set(doc.id, doc);
  }

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }

  async search(query: SearchQuery): Promise<SearchResult<T>> {
    const queryTokens = query.text ? tokenize(query.text) : [];
    let candidates = [...this.documents.values()];

    for (const filter of query.filters ?? []) {
      candidates = candidates.filter((doc) => matchesFilter(doc, filter));
    }

    let scored: ScoredDocument<T>[] = candidates.map((document) => ({
      document,
      score: scoreText(document, queryTokens, this.options.textFields),
    }));

    if (queryTokens.length > 0) {
      scored = scored.filter((s) => s.score > 0);
    }

    if (query.sort && query.sort.length > 0) {
      scored.sort((a, b) => compareBySort(a.document, b.document, query.sort!));
    } else {
      scored.sort((a, b) => b.score - a.score);
    }

    const total = scored.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? total;
    return { items: scored.slice(offset, offset + limit), total };
  }
}
