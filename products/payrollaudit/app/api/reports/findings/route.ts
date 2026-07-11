import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getPayrollAuditDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "payrollaudit.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getPayrollAuditDb();
  const findings = await db.finding.findMany({
    where: { organizationId },
    include: { employee: true, payrollRun: { include: { company: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    findings.map((f) => ({
      company: f.payrollRun.company.name,
      employee: f.employee.fullName,
      employeeCode: f.employee.employeeCode,
      category: f.category,
      severity: f.severity,
      status: f.status,
      title: f.title,
      createdAt: f.createdAt.toISOString(),
    })),
    ["company", "employee", "employeeCode", "category", "severity", "status", "title", "createdAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="payrollaudit-findings-report.csv"',
    },
  });
}
