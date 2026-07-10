import { getSecCorrelateDb } from "../../../lib/db.js";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getSecCorrelateDb();
    const alerts = await db.alert.findMany({ where: { organizationId }, select: { severity: true, status: true } });
    const logEventCountLast24h = await db.logEvent.count({
      where: { organizationId, occurredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });

    return {
      summary: summarizeDashboard(alerts),
      logEventCountLast24h,
    };
  });
}
