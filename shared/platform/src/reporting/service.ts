import type { Prisma } from "@prisma/client";
import { getPlatformDb, currentAppId } from "../db/index.js";
import { notFoundError } from "../errors/index.js";
import { requireCan, type RbacActor } from "../organizations/rbac.js";
import { paginate } from "../api/pagination.js";
import { complete } from "../ai/service.js";
import { getPrompt } from "../ai/prompts.js";

export async function createReportDefinition(params: {
  organizationId: string;
  actor: RbacActor;
  name: string;
  reportType: string;
  config: Record<string, unknown>;
}) {
  await requireCan(params.actor, "settings.manage");

  return getPlatformDb().reportDefinition.create({
    data: {
      appId: currentAppId(),
      organizationId: params.organizationId,
      createdById: params.actor.userId,
      name: params.name,
      reportType: params.reportType,
      config: params.config as Prisma.InputJsonValue,
    },
  });
}

export async function listReportDefinitions(params: { organizationId: string; actor: RbacActor; cursor?: string; limit?: number }) {
  await requireCan(params.actor, "organization.view");
  return paginate({
    cursor: params.cursor,
    limit: params.limit,
    findMany: (args) =>
      getPlatformDb().reportDefinition.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function startReportRun(params: { reportDefinitionId: string; format: "pdf" | "csv" | "excel" }) {
  const db = getPlatformDb();
  const definition = await db.reportDefinition.findUnique({ where: { id: params.reportDefinitionId } });
  if (!definition) throw notFoundError("Report definition");

  return db.reportRun.create({
    data: { reportDefinitionId: params.reportDefinitionId, format: params.format, status: "running", startedAt: new Date() },
  });
}

export async function completeReportRun(params: { reportRunId: string; resultStorageKey: string }): Promise<void> {
  await getPlatformDb().reportRun.update({
    where: { id: params.reportRunId },
    data: { status: "completed", completedAt: new Date(), resultStorageKey: params.resultStorageKey },
  });
}

export async function failReportRun(params: { reportRunId: string; error: string }): Promise<void> {
  await getPlatformDb().reportRun.update({
    where: { id: params.reportRunId },
    data: { status: "failed", completedAt: new Date(), error: params.error },
  });
}

const REPORT_SUMMARY_PROMPT_KEY = "shared_platform.report_summary";

/**
 * AI summary hook per SH-REPORT-6: every report can request a plain-
 * language executive summary generated from its own tabular data, routed
 * through the shared AI provider abstraction (never a direct SDK call).
 */
export async function generateReportSummary(params: {
  organizationId: string;
  reportTitle: string;
  data: Record<string, unknown>[];
}): Promise<string> {
  let promptVersion = "v1";
  try {
    promptVersion = getPrompt(REPORT_SUMMARY_PROMPT_KEY).version;
  } catch {
    // Not registered by the calling product — fall back to an inline default so summaries still work without forcing every product to call registerPrompt() first.
  }

  const response = await complete({
    feature: "shared_platform.report_summary",
    organizationId: params.organizationId,
    promptVersion,
    system:
      "You are summarizing a business report for an executive audience. Be concise (3-5 sentences), lead with the most important finding, and use plain language, not jargon.",
    messages: [
      {
        role: "user",
        content: `Report: ${params.reportTitle}\n\nData:\n${JSON.stringify(params.data.slice(0, 200), null, 2)}`,
      },
    ],
  });

  return response.content;
}
