import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getCharacterConsistencyDb } from "../../../lib/db.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getCharacterConsistencyDb();
    const generations = await db.generationRequest.findMany({ where: { organizationId }, select: { consistencyScore: true, driftWarnings: true } });
    const characterCount = await db.character.count({ where: { organizationId } });

    return {
      summary: summarizeDashboard(generations),
      characterCount,
    };
  });
}
