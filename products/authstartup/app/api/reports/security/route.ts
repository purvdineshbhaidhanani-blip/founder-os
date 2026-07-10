import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getAuthStartupDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "authstartup.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getAuthStartupDb();
  const findings = await db.securityFinding.findMany({
    where: { organizationId },
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    findings.map((f) => ({
      project: f.project.name,
      ruleId: f.ruleId,
      severity: f.severity,
      status: f.status,
      title: f.title,
      createdAt: f.createdAt.toISOString(),
    })),
    ["project", "ruleId", "severity", "status", "title", "createdAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="authstartup-security-report.csv"',
    },
  });
}
