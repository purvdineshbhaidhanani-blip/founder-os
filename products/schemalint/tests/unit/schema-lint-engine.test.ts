import { describe, expect, it } from "vitest";
import {
  computeHealthScore,
  lintSchema,
  validateDuplicateIndexes,
  validateForeignKeyIndexes,
  validateNaming,
  validatePrimaryKeys,
  type TableCandidate,
} from "../../lib/services/schema-lint-engine.js";

function makeTable(overrides: Partial<TableCandidate>): TableCandidate {
  return { id: "t1", name: "orders", hasPrimaryKey: true, columns: [], indexes: [], ...overrides };
}

describe("validatePrimaryKeys", () => {
  it("flags a table with no primary key", () => {
    const findings = validatePrimaryKeys([makeTable({ hasPrimaryKey: false })]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("critical");
  });

  it("does not flag a table with a primary key", () => {
    expect(validatePrimaryKeys([makeTable({ hasPrimaryKey: true })])).toHaveLength(0);
  });
});

describe("validateForeignKeyIndexes", () => {
  it("flags a foreign key column with no covering index", () => {
    const table = makeTable({
      columns: [{ name: "customer_id", dataType: "uuid", isNullable: false, referencesTable: "customers", referencesColumn: "id" }],
      indexes: [],
    });
    const findings = validateForeignKeyIndexes([table]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe("missing_fk_index_customer_id");
  });

  it("does not flag a foreign key column that has a covering index", () => {
    const table = makeTable({
      columns: [{ name: "customer_id", dataType: "uuid", isNullable: false, referencesTable: "customers", referencesColumn: "id" }],
      indexes: [{ name: "idx_orders_customer_id", columnNames: ["customer_id"], isUnique: false }],
    });
    expect(validateForeignKeyIndexes([table])).toHaveLength(0);
  });

  it("ignores non-foreign-key columns entirely", () => {
    const table = makeTable({
      columns: [{ name: "total_cents", dataType: "integer", isNullable: false, referencesTable: null, referencesColumn: null }],
      indexes: [],
    });
    expect(validateForeignKeyIndexes([table])).toHaveLength(0);
  });
});

describe("validateNaming", () => {
  it("flags a table name that is not snake_case", () => {
    const findings = validateNaming([makeTable({ name: "OrderItems" })]);
    expect(findings.some((f) => f.ruleId === "naming_table_not_snake_case")).toBe(true);
  });

  it("flags a column name that is not snake_case", () => {
    const table = makeTable({ columns: [{ name: "customerId", dataType: "uuid", isNullable: false, referencesTable: null, referencesColumn: null }] });
    const findings = validateNaming([table]);
    expect(findings.some((f) => f.ruleId.startsWith("naming_column_not_snake_case"))).toBe(true);
  });

  it("does not flag correctly-named tables and columns", () => {
    const table = makeTable({ name: "order_items", columns: [{ name: "customer_id", dataType: "uuid", isNullable: false, referencesTable: null, referencesColumn: null }] });
    expect(validateNaming([table])).toHaveLength(0);
  });
});

describe("validateDuplicateIndexes", () => {
  it("flags two indexes covering the identical column set", () => {
    const table = makeTable({
      indexes: [
        { name: "idx_a", columnNames: ["customer_id"], isUnique: false },
        { name: "idx_b", columnNames: ["customer_id"], isUnique: false },
      ],
    });
    const findings = validateDuplicateIndexes([table]);
    expect(findings).toHaveLength(1);
  });

  it("does not flag indexes covering different columns", () => {
    const table = makeTable({
      indexes: [
        { name: "idx_a", columnNames: ["customer_id"], isUnique: false },
        { name: "idx_b", columnNames: ["status"], isUnique: false },
      ],
    });
    expect(validateDuplicateIndexes([table])).toHaveLength(0);
  });
});

describe("lintSchema", () => {
  it("combines all four rule checks", () => {
    const table = makeTable({
      name: "OrderItems",
      hasPrimaryKey: false,
      columns: [{ name: "customer_id", dataType: "uuid", isNullable: false, referencesTable: "customers", referencesColumn: "id" }],
      indexes: [],
    });
    const findings = lintSchema([table]);
    expect(findings.some((f) => f.ruleId === "missing_primary_key")).toBe(true);
    expect(findings.some((f) => f.ruleId === "missing_fk_index_customer_id")).toBe(true);
    expect(findings.some((f) => f.ruleId === "naming_table_not_snake_case")).toBe(true);
  });
});

describe("computeHealthScore", () => {
  it("deducts a severity-weighted penalty per finding and floors at 0", () => {
    expect(computeHealthScore([])).toBe(100);
    expect(computeHealthScore([{ severity: "critical" }])).toBe(75);
    expect(computeHealthScore([{ severity: "critical" }, { severity: "critical" }, { severity: "critical" }, { severity: "critical" }, { severity: "critical" }])).toBe(0);
  });
});
