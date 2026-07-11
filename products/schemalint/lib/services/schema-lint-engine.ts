export type FindingCategory = "indexing" | "naming" | "integrity";
export type FindingSeverity = "low" | "medium" | "high" | "critical";

export interface ColumnCandidate {
  name: string;
  dataType: string;
  isNullable: boolean;
  referencesTable: string | null;
  referencesColumn: string | null;
}

export interface IndexCandidate {
  name: string;
  columnNames: string[];
  isUnique: boolean;
}

export interface TableCandidate {
  id: string;
  name: string;
  hasPrimaryKey: boolean;
  columns: ColumnCandidate[];
  indexes: IndexCandidate[];
}

export interface SchemaFindingCandidate {
  tableId: string;
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
}

const SNAKE_CASE_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Naming convention validation per docs/PRODUCT_IDENTITY.md §7 "Check table/column naming against configurable conventions (standards/database.md-style snake_case rules)." */
export function validateNaming(tables: TableCandidate[]): SchemaFindingCandidate[] {
  const findings: SchemaFindingCandidate[] = [];
  for (const table of tables) {
    if (!SNAKE_CASE_PATTERN.test(table.name)) {
      findings.push({
        tableId: table.id,
        ruleId: "naming_table_not_snake_case",
        category: "naming",
        severity: "medium",
        title: `Table name "${table.name}" is not snake_case`,
        description: `Table names should follow snake_case (e.g. "user_accounts") per standards/database.md's naming convention. "${table.name}" does not match.`,
      });
    }
    for (const column of table.columns) {
      if (!SNAKE_CASE_PATTERN.test(column.name)) {
        findings.push({
          tableId: table.id,
          ruleId: `naming_column_not_snake_case_${column.name}`,
          category: "naming",
          severity: "low",
          title: `Column "${table.name}.${column.name}" is not snake_case`,
          description: `Column names should follow snake_case per standards/database.md's naming convention. "${column.name}" on table "${table.name}" does not match.`,
        });
      }
    }
  }
  return findings;
}

/** Missing-primary-key check per docs/PRODUCT_IDENTITY.md pain #3 "missing foreign keys and constraints risk data integrity." */
export function validatePrimaryKeys(tables: TableCandidate[]): SchemaFindingCandidate[] {
  return tables
    .filter((table) => !table.hasPrimaryKey)
    .map((table) => ({
      tableId: table.id,
      ruleId: "missing_primary_key",
      category: "integrity" as const,
      severity: "critical" as const,
      title: `Table "${table.name}" has no primary key`,
      description: `Table "${table.name}" does not declare a primary key. Without one, rows can't be reliably identified or referenced, and replication/ORMs may behave unpredictably.`,
    }));
}

/**
 * Missing foreign-key-index check per docs/PRODUCT_IDENTITY.md §7
 * "Identify missing indexes on foreign keys" and pain #1 "missing
 * indexes cause production performance problems that surface late."
 * Scoped to structural heuristics (does an index cover this FK
 * column?) per §27's risk mitigation — not workload-aware query
 * optimization, which would require query-log access unavailable in
 * Phase 1.
 */
export function validateForeignKeyIndexes(tables: TableCandidate[]): SchemaFindingCandidate[] {
  const findings: SchemaFindingCandidate[] = [];
  for (const table of tables) {
    for (const column of table.columns) {
      if (!column.referencesTable) continue;
      const isIndexed = table.indexes.some((index) => index.columnNames[0] === column.name);
      if (!isIndexed) {
        findings.push({
          tableId: table.id,
          ruleId: `missing_fk_index_${column.name}`,
          category: "indexing",
          severity: "high",
          title: `Missing index on foreign key "${table.name}.${column.name}"`,
          description: `Column "${column.name}" on table "${table.name}" references "${column.referencesTable}" but has no covering index. Joins and cascade deletes on this relationship will scan the whole table as it grows.`,
        });
      }
    }
  }
  return findings;
}

/** Duplicate-index detection per JTBD #1 "before a migration goes to production, tell me if I'm missing an index" — two indexes over the identical column set waste write throughput and storage for no benefit. */
export function validateDuplicateIndexes(tables: TableCandidate[]): SchemaFindingCandidate[] {
  const findings: SchemaFindingCandidate[] = [];
  for (const table of tables) {
    const seen = new Map<string, string>();
    for (const index of table.indexes) {
      const key = index.columnNames.join(",");
      const existing = seen.get(key);
      if (existing) {
        findings.push({
          tableId: table.id,
          ruleId: `duplicate_index_${key}`,
          category: "indexing",
          severity: "low",
          title: `Duplicate index on table "${table.name}"`,
          description: `Indexes "${existing}" and "${index.name}" on table "${table.name}" cover the exact same column(s) (${index.columnNames.join(", ")}). One is redundant and can be dropped.`,
        });
      } else {
        seen.set(key, index.name);
      }
    }
  }
  return findings;
}

export function lintSchema(tables: TableCandidate[]): SchemaFindingCandidate[] {
  return [...validatePrimaryKeys(tables), ...validateForeignKeyIndexes(tables), ...validateNaming(tables), ...validateDuplicateIndexes(tables)];
}

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = { critical: 25, high: 12, medium: 5, low: 1 };

/** Health score per the same severity-weighted formula used across this portfolio's audit products: starts at 100, deducts a severity-weighted penalty per finding, floors at 0. */
export function computeHealthScore(findings: { severity: string }[]): number {
  const penalty = findings.reduce((total, finding) => total + (SEVERITY_WEIGHT[finding.severity as FindingSeverity] ?? 0), 0);
  return Math.max(0, 100 - penalty);
}
