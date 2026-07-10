import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getIncidentTriageDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "incidenttriage.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getIncidentTriageDb();
  const incidents = await db.incident.findMany({
    where: { organizationId },
    include: { service: true },
    orderBy: { startedAt: "desc" },
  });

  const csv = toCsv(
    incidents.map((incident) => ({
      title: incident.title,
      service: incident.service.name,
      severity: incident.severity,
      status: incident.status,
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? "",
    })),
    ["title", "service", "severity", "status", "startedAt", "resolvedAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="incidenttriage-incidents-report.csv"',
    },
  });
}
