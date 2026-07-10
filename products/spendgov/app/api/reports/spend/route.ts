import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { listAllActiveSubscriptions } from "../../../../lib/services/subscriptions-repo.js";

/**
 * Monthly spend report (CSV), available on every plan per
 * products/spendgov/docs/PRODUCT_IDENTITY.md §21 "Reports" row. Returns a
 * file download directly rather than routing through the async
 * ReportDefinition/ScheduledReport workflow — that workflow exists for
 * larger, storage-backed, scheduled reports; a same-request CSV export
 * doesn't need it.
 */
export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err; // Next.js internal control-flow signal — must propagate
    if (!(err instanceof PlatformError)) captureError(err, { feature: "spendgov.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const subscriptions = await listAllActiveSubscriptions(organizationId);

  const csv = toCsv(
    subscriptions.map((s) => ({
      vendor: s.vendorName,
      product: s.productName,
      category: s.category,
      kind: s.kind,
      status: s.status,
      monthlyCostUsd: (s.monthlyCostCents / 100).toFixed(2),
      seatsPurchased: s.seatsPurchased ?? "",
      seatsActive: s.seatsActive ?? "",
      renewalDate: s.renewalDate?.toISOString().slice(0, 10) ?? "",
    })),
    ["vendor", "product", "category", "kind", "status", "monthlyCostUsd", "seatsPurchased", "seatsActive", "renewalDate"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="spendgov-spend-report.csv"',
    },
  });
}
