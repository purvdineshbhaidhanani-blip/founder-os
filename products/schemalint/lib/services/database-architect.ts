import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { getSchemaLintDb } from "../db.js";
import { getSchema } from "./schemas-repo.js";

const architectOutputSchema = z.object({
  summary: z.string().describe("Plain-language, 2-4 sentence summary of this schema's overall health and the most important issues to address."),
  recommendations: z.array(z.string()).max(10).describe("Concrete, prioritized recommendations — better relationships, indexing, normalization, or migration steps — to improve this schema."),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).describe("Overall schema health risk level given its findings."),
});

/**
 * AI Database Architect — the Killer Feature per
 * products/schemalint/docs/PRODUCT_IDENTITY.md §5: "Instead of only
 * identifying schema problems, AI automatically recommends better
 * relationships, better indexing, normalization improvements,
 * performance optimizations, security fixes, migration plans, and
 * future scalability recommendations." Explains the deterministic
 * engine's findings in plain language rather than re-deriving them,
 * per this portfolio's "explain, don't just flag" AI philosophy.
 */
export async function generateDatabaseArchitectBrief(params: { organizationId: string; schemaId: string; requestedByUserId: string }) {
  const schema = await getSchema({ organizationId: params.organizationId, schemaId: params.schemaId });
  if (!schema) {
    throw new PlatformError("NOT_FOUND", "Database schema not found.");
  }

  const tablesText = schema.tables
    .map((t) => `- ${t.name} (${t.hasPrimaryKey ? "has PK" : "NO PRIMARY KEY"}), columns: ${t.columns.map((c) => c.name).join(", ")}, indexes: ${t.indexes.map((i) => i.name).join(", ") || "none"}`)
    .join("\n");
  const findingsText =
    schema.findings.length === 0
      ? "No findings — the deterministic schema-lint engine found no missing keys, missing FK indexes, naming violations, or duplicate indexes."
      : schema.findings.map((f) => `- [${f.severity}] ${f.table.name}: ${f.title} — ${f.description}`).join("\n");

  const context = [
    `Schema: ${schema.name} (${schema.engine})`,
    `Rule-based health score: ${schema.healthScore}/100`,
    `Tables:\n${tablesText}`,
    `Findings:\n${findingsText}`,
  ].join("\n\n");

  const response = await completeStructured({
    feature: "schemalint.database_architect",
    organizationId: params.organizationId,
    system:
      "You are a senior database architect. Given a schema's tables and its deterministic lint findings, write a short plain-language summary of the schema's health, a prioritized list of concrete recommendations (relationships, indexing, normalization, migration steps), and an overall risk level. Only reference facts present in the schema and findings — never invent tables, columns, or issues not given.",
    schema: architectOutputSchema,
    schemaDescription: '{ "summary": string, "recommendations": string[], "riskLevel": "low"|"medium"|"high"|"critical" }',
    messages: [{ role: "user", content: context }],
  });

  const db = getSchemaLintDb();
  const updated = await db.databaseSchema.update({
    where: { id: schema.id },
    data: {
      summary: response.data.summary,
      copilotRiskLevel: response.data.riskLevel,
      copilotRecommendations: response.data.recommendations,
      copilotGeneratedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "schemalint.architect_brief_generated", properties: { schemaId: params.schemaId } },
    (err) => captureError(err, { feature: "schemalint.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "database_architect_brief",
    title: "AI Database Architect brief ready",
    body: `Architect review complete for "${schema.name}" — risk level: ${response.data.riskLevel}.`,
    channels: [],
  });

  return updated;
}
