import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getTranscriptionQADb } from "../../../lib/db.js";
import { summarizeDashboard, type DashboardFinding } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getTranscriptionQADb();
    const findings = await db.finding.findMany({ where: { organizationId }, select: { status: true, severity: true, category: true } });
    const transcriptCount = await db.transcript.count({ where: { organizationId } });
    const recentTranscripts = await db.transcript.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { accuracyScore: true },
    });
    const averageAccuracyScore = recentTranscripts.length === 0 ? 100 : Math.round(recentTranscripts.reduce((total, t) => total + t.accuracyScore, 0) / recentTranscripts.length);

    return {
      summary: summarizeDashboard(findings as DashboardFinding[]),
      transcriptCount,
      averageAccuracyScore,
    };
  });
}
