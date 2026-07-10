import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getERPAuditDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "erpaudit.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getERPAuditDb();
  const findings = await db.finding.findMany({
    where: { organizationId },
    include: { scan: { include: { instance: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    findings.map((f) => ({
      instance: f.scan.instance.name,
      category: f.category,
      severity: f.severity,
      status: f.status,
      title: f.title,
      createdAt: f.createdAt.toISOString(),
    })),
    ["instance", "category", "severity", "status", "title", "createdAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="erpaudit-findings-report.csv"',
    },
  });
}
