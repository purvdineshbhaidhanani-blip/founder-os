import { validationError } from "../errors/index.js";

/**
 * Filter allow-listing per standards/api.md: "Sortable/filterable fields
 * are allow-listed server-side — arbitrary column names are never passed
 * through to the query layer." Every product's search/list endpoint runs
 * caller-supplied filters through this before building a query.
 */
export interface FilterDefinition {
  field: string;
  operator: "eq" | "contains" | "gt" | "gte" | "lt" | "lte" | "in";
  value: unknown;
}

export function validateFilters(filters: FilterDefinition[], allowedFields: readonly string[]): FilterDefinition[] {
  const allowed = new Set(allowedFields);
  const invalid = filters.filter((f) => !allowed.has(f.field));
  if (invalid.length > 0) {
    throw validationError(invalid.map((f) => ({ field: f.field, issue: "This field is not filterable." })));
  }
  return filters;
}

export function validateSortField(field: string, allowedFields: readonly string[]): string {
  if (!allowedFields.includes(field)) {
    throw validationError([{ field: "sort", issue: `"${field}" is not a sortable field.` }]);
  }
  return field;
}

/** Converts allow-listed filters into a Prisma `where` object for models that support these operators directly — callers with more complex needs build their own `where` but still validate through validateFilters first. */
export function toPrismaWhere(filters: FilterDefinition[]): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const filter of filters) {
    switch (filter.operator) {
      case "eq":
        where[filter.field] = filter.value;
        break;
      case "contains":
        where[filter.field] = { contains: filter.value, mode: "insensitive" };
        break;
      case "gt":
        where[filter.field] = { gt: filter.value };
        break;
      case "gte":
        where[filter.field] = { gte: filter.value };
        break;
      case "lt":
        where[filter.field] = { lt: filter.value };
        break;
      case "lte":
        where[filter.field] = { lte: filter.value };
        break;
      case "in":
        where[filter.field] = { in: filter.value };
        break;
    }
  }
  return where;
}
