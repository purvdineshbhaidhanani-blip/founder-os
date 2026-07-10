import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getCodeAuditDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "codeaudit.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getCodeAuditDb();
  const findings = await db.finding.findMany({
    where: { organizationId },
    include: { scan: { include: { repository: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    findings.map((f) => ({
      repository: f.scan.repository.name,
      filePath: f.filePath,
      line: f.line,
      category: f.category,
      severity: f.severity,
      status: f.status,
      title: f.title,
      cwe: f.cwe ?? "",
      createdAt: f.createdAt.toISOString(),
    })),
    ["repository", "filePath", "line", "category", "severity", "status", "title", "cwe", "createdAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="codeaudit-findings-report.csv"',
    },
  });
}
