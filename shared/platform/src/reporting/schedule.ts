import parser from "cron-parser";
import { getPlatformDb } from "../db/index.js";
import { notFoundError, validationError } from "../errors/index.js";

/**
 * Scheduled report execution per frameworks/11-reporting.md. This computes
 * "what's due" for an external cron trigger/worker to run
 * (`runDueScheduledReports`) rather than an in-process `setInterval` —
 * consistent with standards/devops.md's zero-downtime, stateless-service
 * posture, where a long-lived in-process timer doesn't survive a
 * serverless/rolling-deploy environment reliably.
 */

export function computeNextRunAt(cronExpression: string, fromDate = new Date()): Date {
  try {
    const interval = parser.parseExpression(cronExpression, { currentDate: fromDate });
    return interval.next().toDate();
  } catch (err) {
    throw validationError([{ field: "cronExpression", issue: `Invalid cron expression: ${String(err)}` }]);
  }
}

export async function createScheduledReport(params: {
  reportDefinitionId: string;
  cronExpression: string;
  recipients: string[];
  format: "pdf" | "csv" | "excel";
}) {
  const db = getPlatformDb();
  const definition = await db.reportDefinition.findUnique({ where: { id: params.reportDefinitionId } });
  if (!definition) throw notFoundError("Report definition");

  const nextRunAt = computeNextRunAt(params.cronExpression);

  return db.scheduledReport.create({
    data: {
      reportDefinitionId: params.reportDefinitionId,
      cronExpression: params.cronExpression,
      recipients: params.recipients,
      format: params.format,
      nextRunAt,
    },
  });
}

/** Returns every scheduled report whose nextRunAt has passed — call this from an external cron trigger, then mark each as run via `markScheduledReportRun`. */
export async function listDueScheduledReports() {
  return getPlatformDb().scheduledReport.findMany({
    where: { enabled: true, nextRunAt: { lte: new Date() } },
    include: { reportDefinition: true },
  });
}

export async function markScheduledReportRun(scheduledReportId: string): Promise<void> {
  const db = getPlatformDb();
  const scheduled = await db.scheduledReport.findUnique({ where: { id: scheduledReportId } });
  if (!scheduled) throw notFoundError("Scheduled report");

  await db.scheduledReport.update({
    where: { id: scheduledReportId },
    data: { lastRunAt: new Date(), nextRunAt: computeNextRunAt(scheduled.cronExpression) },
  });
}

export async function disableScheduledReport(scheduledReportId: string): Promise<void> {
  await getPlatformDb().scheduledReport.update({ where: { id: scheduledReportId }, data: { enabled: false } });
}
