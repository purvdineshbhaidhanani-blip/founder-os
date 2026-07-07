export interface SearchDocument {
  id: string;
  [field: string]: unknown;
}

export type FilterOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";

export interface FilterExpr {
  field: string;
  op: FilterOperator;
  value: unknown;
}

export type SortDirection = "asc" | "desc";

export interface SortSpec {
  field: string;
  direction: SortDirection;
}

export interface SearchQuery {
  /** Free-text query matched against indexed text fields. Omit for filter-only browsing. */
  text?: string;
  filters?: FilterExpr[];
  sort?: SortSpec[];
  limit?: number;
  offset?: number;
}

export interface ScoredDocument<T extends SearchDocument = SearchDocument> {
  document: T;
  score: number;
}

export interface SearchResult<T extends SearchDocument = SearchDocument> {
  items: ScoredDocument<T>[];
  total: number;
}
