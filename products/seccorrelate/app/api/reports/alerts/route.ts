import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getSecCorrelateDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "seccorrelate.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getSecCorrelateDb();
  const alerts = await db.alert.findMany({
    where: { organizationId },
    include: { firstLogEvent: true, secondLogEvent: true },
    orderBy: { detectedAt: "desc" },
  });

  const csv = toCsv(
    alerts.map((a) => ({
      title: a.title,
      severity: a.severity,
      status: a.status,
      correlationKey: a.correlationKey ?? "",
      firstEventType: a.firstLogEvent.eventType,
      secondEventType: a.secondLogEvent.eventType,
      detectedAt: a.detectedAt.toISOString(),
    })),
    ["title", "severity", "status", "correlationKey", "firstEventType", "secondEventType", "detectedAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="seccorrelate-alerts-report.csv"',
    },
  });
}
