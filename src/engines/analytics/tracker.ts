import type { AnalyticsEvent, EventQuery } from "./types.js";

export interface EventTracker {
  track(name: string, properties?: Record<string, unknown>, userId?: string): Promise<AnalyticsEvent>;
  query(query: EventQuery): Promise<AnalyticsEvent[]>;
}

let counter = 0;
function generateEventId(): string {
  counter += 1;
  return `evt_${Date.now()}_${counter}`;
}

/** In-process event store. Swap for a warehouse-backed tracker (e.g. writing to a table) via the same interface. */
export class InMemoryEventTracker implements EventTracker {
  private readonly events: AnalyticsEvent[] = [];

  async track(name: string, properties: Record<string, unknown> = {}, userId?: string): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = {
      id: generateEventId(),
      name,
      properties,
      userId,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  async query(query: EventQuery): Promise<AnalyticsEvent[]> {
    let results = [...this.events];
    if (query.name) results = results.filter((e) => e.name === query.name);
    if (query.userId) results = results.filter((e) => e.userId === query.userId);
    if (query.since) results = results.filter((e) => e.timestamp >= query.since!);
    if (query.until) results = results.filter((e) => e.timestamp <= query.until!);
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return query.limit ? results.slice(0, query.limit) : results;
  }

  all(): AnalyticsEvent[] {
    return [...this.events];
  }
}
