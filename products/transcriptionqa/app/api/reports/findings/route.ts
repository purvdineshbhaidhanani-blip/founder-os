import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getTranscriptionQADb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "transcriptionqa.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getTranscriptionQADb();
  const findings = await db.finding.findMany({
    where: { organizationId },
    include: { transcript: true, segment: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    findings.map((f) => ({
      transcript: f.transcript.title,
      speaker: f.segment.speakerLabel,
      category: f.category,
      severity: f.severity,
      status: f.status,
      title: f.title,
      suggestedCorrection: f.suggestedCorrection ?? "",
      createdAt: f.createdAt.toISOString(),
    })),
    ["transcript", "speaker", "category", "severity", "status", "title", "suggestedCorrection", "createdAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="transcriptionqa-findings-report.csv"',
    },
  });
}
