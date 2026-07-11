import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getSchemaLintDb } from "../db.js";
import { computeHealthScore, lintSchema, type TableCandidate } from "./schema-lint-engine.js";
import type { z } from "zod";
import type { createSchemaSchema, listSchemasQuerySchema } from "../validation/schemas.js";

type CreateSchemaInput = z.infer<typeof createSchemaSchema>;
type ListSchemasQuery = z.infer<typeof listSchemasQuerySchema>;

/**
 * Imports a database schema snapshot (tables, columns, foreign keys,
 * indexes, supplied by the caller as introspected/exported from their
 * own database) and runs the deterministic schema-lint engine —
 * missing primary keys, missing FK indexes, naming convention
 * violations, and duplicate indexes — persisting findings and
 * computing a health score, per docs/PRODUCT_IDENTITY.md §7's
 * Must-Have feature set.
 */
export async function createSchema(params: { organizationId: string; createdByUserId: string; input: CreateSchemaInput }) {
  const db = getSchemaLintDb();

  const schemaLimitCheck = await withinLimit(params.organizationId, "database_schemas");
  const currentSchemaCount = await db.databaseSchema.count({ where: { organizationId: params.organizationId } });
  if (!schemaLimitCheck.allowed || (schemaLimitCheck.limit !== null && currentSchemaCount >= schemaLimitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${schemaLimitCheck.limit} database schema(s). Upgrade your plan to add more.`);
  }

  const tableLimitCheck = await withinLimit(params.organizationId, "tables");
  if (tableLimitCheck.limit !== null) {
    const currentTableCount = await db.schemaTable.count({ where: { organizationId: params.organizationId } });
    if (currentTableCount + params.input.tables.length > tableLimitCheck.limit) {
      throw new PlatformError("UNAUTHORIZED", `This import would exceed your plan's limit of ${tableLimitCheck.limit} tables. Upgrade your plan to import more.`);
    }
  }

  const databaseSchema = await db.databaseSchema.create({
    data: { organizationId: params.organizationId, createdByUserId: params.createdByUserId, name: params.input.name, engine: params.input.engine },
  });

  const tables: TableCandidate[] = [];
  for (const tableInput of params.input.tables) {
    const table = await db.schemaTable.create({
      data: { organizationId: params.organizationId, schemaId: databaseSchema.id, name: tableInput.name, hasPrimaryKey: tableInput.hasPrimaryKey },
    });
    const columns = await db.$transaction(
      tableInput.columns.map((column) =>
        db.schemaColumn.create({
          data: {
            organizationId: params.organizationId,
            tableId: table.id,
            name: column.name,
            dataType: column.dataType,
            isNullable: column.isNullable,
            referencesTable: column.referencesTable ?? null,
            referencesColumn: column.referencesColumn ?? null,
          },
        }),
      ),
    );
    const indexes =
      tableInput.indexes.length > 0
        ? await db.$transaction(
            tableInput.indexes.map((index) =>
              db.schemaIndex.create({
                data: { organizationId: params.organizationId, tableId: table.id, name: index.name, columnNames: index.columnNames, isUnique: index.isUnique },
              }),
            ),
          )
        : [];

    tables.push({
      id: table.id,
      name: table.name,
      hasPrimaryKey: table.hasPrimaryKey,
      columns: columns.map((c) => ({ name: c.name, dataType: c.dataType, isNullable: c.isNullable, referencesTable: c.referencesTable, referencesColumn: c.referencesColumn })),
      indexes: indexes.map((i) => ({ name: i.name, columnNames: i.columnNames, isUnique: i.isUnique })),
    });
  }

  const findingCandidates = lintSchema(tables);

  if (findingCandidates.length > 0) {
    await db.finding.createMany({
      data: findingCandidates.map((f) => ({
        organizationId: params.organizationId,
        schemaId: databaseSchema.id,
        tableId: f.tableId,
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
      })),
    });
  }

  const healthScore = computeHealthScore(findingCandidates);

  return db.databaseSchema.update({ where: { id: databaseSchema.id }, data: { healthScore } });
}

export async function listSchemas(params: { organizationId: string; query: ListSchemasQuery }) {
  const db = getSchemaLintDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.databaseSchema.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getSchema(params: { organizationId: string; schemaId: string }) {
  const db = getSchemaLintDb();
  return db.databaseSchema.findFirst({
    where: { id: params.schemaId, organizationId: params.organizationId },
    include: {
      tables: { include: { columns: true, indexes: true } },
      findings: { include: { table: true }, orderBy: { severity: "asc" } },
    },
  });
}
