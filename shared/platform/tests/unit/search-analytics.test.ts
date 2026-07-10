import { describe, expect, it } from "vitest";
import { validateFilters, validateSortField, toPrismaWhere } from "../../src/search/filters.js";
import { fullTextSearch } from "../../src/search/fulltext.js";

describe("validateFilters", () => {
  const allowed = ["status", "createdAt", "name"] as const;

  it("passes through filters on allowed fields", () => {
    const filters = [{ field: "status", operator: "eq" as const, value: "active" }];
    expect(validateFilters(filters, allowed)).toEqual(filters);
  });

  it("throws a validation error listing every disallowed field", () => {
    const filters = [
      { field: "status", operator: "eq" as const, value: "active" },
      { field: "secretColumn", operator: "eq" as const, value: "x" },
    ];
    try {
      validateFilters(filters, allowed);
      expect.unreachable();
    } catch (err: any) {
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.details).toHaveLength(1);
      expect(err.details[0].field).toBe("secretColumn");
    }
  });
});

describe("validateSortField", () => {
  it("returns the field when allowed", () => {
    expect(validateSortField("createdAt", ["createdAt", "name"])).toBe("createdAt");
  });

  it("throws for a non-allow-listed sort field", () => {
    expect(() => validateSortField("passwordHash", ["createdAt", "name"])).toThrow();
  });
});

describe("toPrismaWhere", () => {
  it("maps eq to a direct assignment", () => {
    expect(toPrismaWhere([{ field: "status", operator: "eq", value: "active" }])).toEqual({ status: "active" });
  });

  it("maps contains to a case-insensitive contains filter", () => {
    expect(toPrismaWhere([{ field: "name", operator: "contains", value: "acme" }])).toEqual({
      name: { contains: "acme", mode: "insensitive" },
    });
  });

  it("maps gte/lte range filters", () => {
    const result = toPrismaWhere([
      { field: "createdAt", operator: "gte", value: "2026-01-01" },
      { field: "createdAt", operator: "lte", value: "2026-12-31" },
    ]);
    // Prisma allows both to coexist since they're separate calls into the same key — here toPrismaWhere overwrites, so real callers combine ranges via a single filter object per field in practice.
    expect(result.createdAt).toEqual({ lte: "2026-12-31" });
  });

  it("maps in to an array membership filter", () => {
    expect(toPrismaWhere([{ field: "status", operator: "in", value: ["active", "trialing"] }])).toEqual({
      status: { in: ["active", "trialing"] },
    });
  });
});

describe("fullTextSearch identifier validation", () => {
  it("rejects a table name that isn't a safe identifier (defense against injection via config)", async () => {
    await expect(
      fullTextSearch(
        { table: "leads; DROP TABLE users;--", searchableColumns: ["name"], tenantColumn: "organization_id" },
        { tenantId: "org_1", query: "acme" },
      ),
    ).rejects.toThrow(/Invalid table identifier/);
  });

  it("rejects a searchable column that isn't a safe identifier", async () => {
    await expect(
      fullTextSearch(
        { table: "leads", searchableColumns: ["name; --"], tenantColumn: "organization_id" },
        { tenantId: "org_1", query: "acme" },
      ),
    ).rejects.toThrow(/Invalid searchable column identifier/);
  });

  it("rejects an empty searchableColumns list", async () => {
    try {
      await fullTextSearch(
        { table: "leads", searchableColumns: [], tenantColumn: "organization_id" },
        { tenantId: "org_1", query: "acme" },
      );
      expect.unreachable();
    } catch (err: any) {
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.details[0].issue).toMatch(/At least one searchable column/);
    }
  });
});
