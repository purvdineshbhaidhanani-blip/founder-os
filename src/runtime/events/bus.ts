import { generateId, nowIso } from "../../utils/id.js";
import { createLogger, type Logger } from "../../utils/logger.js";
import type {
  EventFilter,
  EventHandler,
  EventSubscription,
  RuntimeEvent,
  RuntimeEventName,
} from "./types.js";

function matchesFilter(event: RuntimeEvent, filter: EventFilter): boolean {
  if (filter.name && event.name !== filter.name) return false;
  if (filter.namePattern && !new RegExp(filter.namePattern).test(event.name)) return false;
  if (filter.source && event.source !== filter.source) return false;
  if (filter.correlationId && event.correlationId !== filter.correlationId) return false;
  if (filter.since && Date.parse(event.timestamp) < Date.parse(filter.since)) return false;
  return true;
}

export interface EventBusOptions {
  /** Maximum number of events retained for history/replay. Older events are dropped FIFO. */
  historyLimit?: number;
  logger?: Logger;
}

/**
 * Phase 2 surface — synchronous publish/subscribe with bounded history for
 * replay. Handlers can be sync or async; async handlers are awaited
 * sequentially per event so an event is "delivered" only after every
 * subscriber has finished.
 */
export class EventBus {
  private readonly subscriptions = new Map<string, EventSubscription>();
  private readonly events: RuntimeEvent[] = [];
  private readonly historyLimit: number;
  private readonly logger: Logger;

  constructor(options: EventBusOptions = {}) {
    this.historyLimit = options.historyLimit ?? 10_000;
    this.logger = options.logger ?? createLogger("runtime.events");
  }

  async publish<T>(input: {
    name: RuntimeEventName;
    payload: T;
    source?: string;
    correlationId?: string;
  }): Promise<RuntimeEvent<T>> {
    const event: RuntimeEvent<T> = {
      id: generateId("evt"),
      name: input.name,
      timestamp: nowIso(),
      source: input.source,
      correlationId: input.correlationId,
      payload: input.payload,
    };
    this.events.push(event as RuntimeEvent);
    if (this.events.length > this.historyLimit) this.events.shift();

    for (const subscription of this.subscriptions.values()) {
      if (!matchesFilter(event as RuntimeEvent, subscription.filter)) continue;
      try {
        await subscription.handler(event as RuntimeEvent);
      } catch (error) {
        this.logger.error("subscriber threw", { event: event.name, error: (error as Error).message });
      }
    }
    return event;
  }

  subscribe<T = unknown>(filter: EventFilter, handler: EventHandler<T>): EventSubscription {
    const subscription: EventSubscription = {
      id: generateId("sub"),
      filter,
      handler: handler as EventHandler,
    };
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  unsubscribe(id: string): void {
    this.subscriptions.delete(id);
  }

  history(filter: EventFilter = {}): RuntimeEvent[] {
    return this.events.filter((event) => matchesFilter(event, filter));
  }

  async replay(filter: EventFilter, handler: EventHandler): Promise<number> {
    const matches = this.history(filter);
    for (const event of matches) await handler(event);
    return matches.length;
  }

  /** Test helper — drops every subscription and the event log. */
  reset(): void {
    this.subscriptions.clear();
    this.events.length = 0;
  }
}
