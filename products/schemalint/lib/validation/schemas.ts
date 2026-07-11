import { z } from "zod";

export const columnInputSchema = z.object({
  name: z.string().min(1).max(120),
  dataType: z.string().min(1).max(60),
  isNullable: z.boolean().default(true),
  referencesTable: z.string().max(120).optional(),
  referencesColumn: z.string().max(120).optional(),
});

export const indexInputSchema = z.object({
  name: z.string().min(1).max(120),
  columnNames: z.array(z.string().min(1).max(120)).min(1).max(20),
  isUnique: z.boolean().default(false),
});

export const tableInputSchema = z.object({
  name: z.string().min(1).max(120),
  hasPrimaryKey: z.boolean().default(true),
  columns: z.array(columnInputSchema).min(1).max(200),
  indexes: z.array(indexInputSchema).max(50).default([]),
});

export const engineSchema = z.enum(["postgresql", "mysql", "sqlite", "sqlserver"]);

export const createSchemaSchema = z.object({
  name: z.string().min(1).max(200),
  engine: engineSchema,
  tables: z.array(tableInputSchema).min(1).max(500),
});

export const listSchemasQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listFindingsQuerySchema = z.object({
  schemaId: z.string().uuid().optional(),
  status: z.enum(["open", "resolved"]).optional(),
  category: z.enum(["indexing", "naming", "integrity"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateFindingStatusSchema = z.object({
  status: z.enum(["open", "resolved"]),
});
