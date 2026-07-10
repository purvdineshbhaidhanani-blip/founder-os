import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getContactVerifyDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "contactverify.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getContactVerifyDb();
  const contacts = await db.contact.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });

  const csv = toCsv(
    contacts.map((c) => ({
      firstName: c.firstName,
      lastName: c.lastName ?? "",
      email: c.email ?? "",
      emailStatus: c.emailStatus,
      phone: c.phone ?? "",
      phoneStatus: c.phoneStatus,
      healthScore: c.healthScore,
      createdAt: c.createdAt.toISOString(),
    })),
    ["firstName", "lastName", "email", "emailStatus", "phone", "phoneStatus", "healthScore", "createdAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="contactverify-contacts-report.csv"',
    },
  });
}
