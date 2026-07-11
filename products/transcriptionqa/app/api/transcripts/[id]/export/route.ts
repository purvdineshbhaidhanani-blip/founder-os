import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { getTranscript } from "../../../../../lib/services/transcripts-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Plain-text export per docs/PRODUCT_IDENTITY.md §7 "Export corrected transcripts in common formats (starting with plain text)." */
export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "transcriptionqa.export" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const { id } = await params;
  const transcript = await getTranscript({ organizationId, transcriptId: id });
  if (!transcript) {
    const { body, status } = toErrorResponseBody(new PlatformError("NOT_FOUND", "Transcript not found."), requestId);
    return Response.json(body, { status });
  }

  const lines = [`${transcript.title}`, `Source: ${transcript.sourceLabel}`, `Accuracy score: ${transcript.accuracyScore}/100`, "", ...transcript.segments.map((s) => `${s.speakerLabel}: ${s.text}`)];

  const openFindings = transcript.findings.filter((f) => f.status === "open" && f.suggestedCorrection);
  if (openFindings.length > 0) {
    lines.push("", "--- Unresolved suggested corrections ---");
    for (const finding of openFindings) {
      lines.push(`- ${finding.title}: suggest "${finding.suggestedCorrection}"`);
    }
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${transcript.title.replace(/[^a-z0-9-_]+/gi, "_")}.txt"`,
    },
  });
}
