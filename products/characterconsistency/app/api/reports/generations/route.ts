import { toCsv } from "@founder-os/platform/reporting";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getCharacterConsistencyDb } from "../../../../lib/db.js";

export async function GET() {
  const requestId = generateRequestId();
  let organizationId: string;
  try {
    ({ organizationId } = await requireOrganizationContext());
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (!(err instanceof PlatformError)) captureError(err, { feature: "characterconsistency.reports" });
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }

  const db = getCharacterConsistencyDb();
  const generations = await db.generationRequest.findMany({
    where: { organizationId },
    include: { character: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    generations.map((g) => ({
      character: g.character.name,
      poseDescription: g.poseDescription,
      consistencyScore: g.consistencyScore,
      driftWarnings: g.driftWarnings.join("; "),
      createdAt: g.createdAt.toISOString(),
    })),
    ["character", "poseDescription", "consistencyScore", "driftWarnings", "createdAt"],
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="characterconsistency-generations-report.csv"',
    },
  });
}
