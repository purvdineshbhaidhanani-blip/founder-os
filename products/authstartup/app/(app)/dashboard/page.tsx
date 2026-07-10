import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getAuthStartupDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getAuthStartupDb();
  const findings = await db.securityFinding.findMany({ where: { organizationId }, select: { status: true, severity: true } });
  const projects = await db.project.findMany({ where: { organizationId } });
  const endUserCount = await db.endUser.count({ where: { projectId: { in: projects.map((p) => p.id) } } });
  const summary = summarizeDashboard(findings);

  return (
    <div>
      <div className="au-page-header">
        <div>
          <h1 className="au-page-title">Dashboard</h1>
          <p className="au-page-description">Your projects and security posture, at a glance.</p>
        </div>
        <Link href="/projects" className="fos-btn fos-btn-primary fos-btn-sm">
          New project
        </Link>
      </div>

      <div className="au-kpi-grid">
        <KPICard label="Projects" value={String(projects.length)} />
        <KPICard label="End users" value={String(endUserCount)} />
        <KPICard label="Open findings" value={String(summary.openFindingCount)} />
        <KPICard label="High severity (open)" value={String(summary.highOpenCount)} />
      </div>

      <div className="au-section">
        <h2 className="au-section-title">Projects</h2>
        {projects.length === 0 ? (
          <p className="au-page-description">No projects yet — create one to start issuing API keys.</p>
        ) : (
          <ul className="au-category-list">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`}>{project.name}</Link> ({project.environment})
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/security">View security findings →</Link>
      </p>
    </div>
  );
}
