import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getCharacterConsistencyDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getCharacterConsistencyDb();
  const generations = await db.generationRequest.findMany({ where: { organizationId }, select: { consistencyScore: true, driftWarnings: true } });
  const characters = await db.character.findMany({ where: { organizationId } });
  const summary = summarizeDashboard(generations);

  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Dashboard</h1>
          <p className="cc-page-description">Your character library and consistency history.</p>
        </div>
        <Link href="/characters" className="fos-btn fos-btn-primary fos-btn-sm">
          New character
        </Link>
      </div>

      <div className="cc-kpi-grid">
        <KPICard label="Characters" value={String(characters.length)} />
        <KPICard label="Generations" value={String(summary.totalGenerations)} />
        <KPICard label="Avg. consistency score" value={String(summary.averageConsistencyScore)} />
        <KPICard label="Generations with drift" value={String(summary.generationsWithDrift)} />
      </div>

      <div className="cc-section">
        <h2 className="cc-section-title">Character library</h2>
        {characters.length === 0 ? (
          <p className="cc-page-description">No characters yet — create one to start generating consistent prompts.</p>
        ) : (
          <ul className="cc-category-list">
            {characters.map((character) => (
              <li key={character.id}>
                <Link href={`/characters/${character.id}`}>{character.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/generations">View all generations →</Link>
      </p>
    </div>
  );
}
