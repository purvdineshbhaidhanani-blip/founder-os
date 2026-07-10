import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getCRMCaptureDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "crmcapture.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getCRMCaptureDb();
  const leads = await db.lead.findMany({
    where: { organizationId },
    include: { contact: true },
    orderBy: { score: "desc" },
  });

  const csv = toCsv(
    leads.map((lead) => ({
      firstName: lead.contact.firstName,
      lastName: lead.contact.lastName ?? "",
      email: lead.contact.email ?? "",
      company: lead.contact.company ?? "",
      status: lead.status,
      score: lead.score,
      source: lead.source,
      createdAt: lead.createdAt.toISOString(),
    })),
    ["firstName", "lastName", "email", "company", "status", "score", "source", "createdAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="crmcapture-leads-report.csv"',
    },
  });
}
