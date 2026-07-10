import { getPlatformDb, currentAppId } from "../db/index.js";

export interface EventCountByName {
  eventName: string;
  count: number;
}

export async function countEventsByName(params: { organizationId?: string; since: Date; until?: Date }): Promise<EventCountByName[]> {
  const rows = await getPlatformDb().analyticsEvent.groupBy({
    by: ["eventName"],
    where: {
      appId: currentAppId(),
      organizationId: params.organizationId,
      occurredAt: { gte: params.since, ...(params.until ? { lte: params.until } : {}) },
    },
    _count: { eventName: true },
  });

  return rows.map((row) => ({ eventName: row.eventName, count: row._count.eventName }));
}

export interface FunnelStep {
  eventName: string;
  usersReached: number;
}

/**
 * Simple sequential funnel: for each step, counts distinct users who fired
 * that event AND every prior step's event, within the window — the
 * standard "how many people made it from step N to step N+1" analysis
 * behind every product's free→trial→paid conversion tracking.
 */
export async function computeFunnel(params: { organizationId?: string; steps: string[]; since: Date; until?: Date }): Promise<FunnelStep[]> {
  const db = getPlatformDb();
  const results: FunnelStep[] = [];
  let qualifyingUserIds: Set<string> | null = null;

  for (const eventName of params.steps) {
    const events = await db.analyticsEvent.findMany({
      where: {
        appId: currentAppId(),
        organizationId: params.organizationId,
        eventName,
        userId: { not: null },
        occurredAt: { gte: params.since, ...(params.until ? { lte: params.until } : {}) },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    const userIdsForStep = new Set(events.map((e) => e.userId!));
    qualifyingUserIds = qualifyingUserIds === null ? userIdsForStep : intersect(qualifyingUserIds, userIdsForStep);

    results.push({ eventName, usersReached: qualifyingUserIds.size });
  }

  return results;
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const item of a) {
    if (b.has(item)) result.add(item);
  }
  return result;
}
