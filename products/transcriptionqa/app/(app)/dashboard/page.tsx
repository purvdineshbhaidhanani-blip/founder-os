import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getTranscriptionQADb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getTranscriptionQADb();
  const findings = await db.finding.findMany({ where: { organizationId }, select: { status: true, severity: true, category: true } });
  const recentTranscripts = await db.transcript.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const summary = summarizeDashboard(findings as never);
  const averageAccuracyScore = recentTranscripts.length === 0 ? 100 : Math.round(recentTranscripts.reduce((total, t) => total + t.accuracyScore, 0) / recentTranscripts.length);

  return (
    <div>
      <div className="tq-page-header">
        <div>
          <h1 className="tq-page-title">Dashboard</h1>
          <p className="tq-page-description">Transcript accuracy across your workspace.</p>
        </div>
        <Link href="/transcripts" className="fos-btn fos-btn-primary fos-btn-sm">
          New transcript
        </Link>
      </div>

      <div className="tq-kpi-grid">
        <KPICard label="Transcripts" value={String(recentTranscripts.length)} />
        <KPICard label="Avg. accuracy score" value={String(averageAccuracyScore)} />
        <KPICard label="Open findings" value={String(summary.openFindingCount)} />
        <KPICard label="Terminology findings" value={String(summary.terminologyFindingCount)} />
      </div>

      <div className="tq-section">
        <h2 className="tq-section-title">Recent transcripts</h2>
        {recentTranscripts.length === 0 ? (
          <p className="tq-page-description">No transcripts yet — review your first one to get started.</p>
        ) : (
          <ul className="tq-category-list">
            {recentTranscripts.map((transcript) => (
              <li key={transcript.id}>
                <Link href={`/transcripts/${transcript.id}`}>
                  {transcript.title} — score {transcript.accuracyScore}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/transcripts">View all transcripts →</Link>
      </p>
    </div>
  );
}
