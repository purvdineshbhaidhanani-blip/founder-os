import { Prisma } from "@prisma/client";
import { getPlatformDb } from "../db/index.js";
import { validationError } from "../errors/index.js";

const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * Postgres full-text search across a caller-specified table/columns.
 * Table and column names are identifiers, not values — Prisma's tagged-
 * template `$queryRaw` parameterizes *values* safely, but identifiers must
 * be validated against a strict allow-list pattern before interpolation,
 * which this function enforces before building any query (defense against
 * SQL injection via a malformed table/column config, not just user input).
 */
function assertSafeIdentifier(name: string, kind: string): void {
  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`Invalid ${kind} identifier "${name}" — must match ${IDENTIFIER_PATTERN}.`);
  }
}

export interface FullTextSearchConfig {
  table: string;
  searchableColumns: string[];
  tenantColumn: string; // typically "organization_id"
  idColumn?: string; // defaults to "id"
}

export async function fullTextSearch<T = Record<string, unknown>>(
  config: FullTextSearchConfig,
  params: { tenantId: string; query: string; limit?: number },
): Promise<T[]> {
  assertSafeIdentifier(config.table, "table");
  assertSafeIdentifier(config.tenantColumn, "tenant column");
  const idColumn = config.idColumn ?? "id";
  assertSafeIdentifier(idColumn, "id column");
  for (const col of config.searchableColumns) {
    assertSafeIdentifier(col, "searchable column");
  }
  if (config.searchableColumns.length === 0) {
    throw validationError([{ field: "searchableColumns", issue: "At least one searchable column is required." }]);
  }

  const limit = Math.min(params.limit ?? 20, 100);
  const tsVectorExpr = Prisma.raw(
    config.searchableColumns.map((col) => `coalesce("${col}", '')`).join(" || ' ' || "),
  );
  const tableIdent = Prisma.raw(`"${config.table}"`);
  const tenantIdent = Prisma.raw(`"${config.tenantColumn}"`);

  return getPlatformDb().$queryRaw<T[]>(Prisma.sql`
    SELECT *, ts_rank(to_tsvector('english', ${tsVectorExpr}), plainto_tsquery('english', ${params.query})) AS rank
    FROM ${tableIdent}
    WHERE ${tenantIdent} = ${params.tenantId}
      AND to_tsvector('english', ${tsVectorExpr}) @@ plainto_tsquery('english', ${params.query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
}
