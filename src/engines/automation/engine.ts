import { ActionRegistry } from "./action.js";
import { EventBus } from "./event-bus.js";
import { InMemoryQueue, type Queue } from "./queue.js";
import { TriggerRegistry } from "./trigger.js";
import type { AutomationEvent, AutomationRule } from "./types.js";

export interface AutomationEngineOptions {
  eventBus?: EventBus;
  triggers?: TriggerRegistry;
  actions?: ActionRegistry;
  /** Queue that action executions are dispatched through. Defaults to an unbounded in-memory queue. */
  queue?: Queue<{ actionId: string; event: AutomationEvent }>;
  onActionError?: (error: unknown, actionId: string, event: AutomationEvent) => void;
}

/**
 * Wires the event bus, trigger registry, action registry, and queue into a
 * single "when X happens, do Y" system. Rules bind a trigger to one or more
 * actions; firing an event that matches a trigger enqueues its actions for
 * (decoupled, retryable) execution.
 */
export class AutomationEngine {
  readonly eventBus: EventBus;
  readonly triggers: TriggerRegistry;
  readonly actions: ActionRegistry;
  readonly queue: Queue<{ actionId: string; event: AutomationEvent }>;
  private readonly rules = new Map<string, AutomationRule>();

  constructor(options: AutomationEngineOptions = {}) {
    this.eventBus = options.eventBus ?? new EventBus();
    this.triggers = options.triggers ?? new TriggerRegistry();
    this.actions = options.actions ?? new ActionRegistry();
    this.queue =
      options.queue ??
      new InMemoryQueue({
        concurrency: 5,
        onError: (error, job) => {
          const payload = job.payload as { actionId: string; event: AutomationEvent };
          options.onActionError?.(error, payload.actionId, payload.event);
        },
      });

    this.queue.process(async (job) => {
      const action = this.actions.get(job.payload.actionId);
      if (!action) return;
      await action.execute(job.payload.event);
    });

    this.eventBus.onAny((event) => this.handleEvent(event));
  }

  addRule(rule: AutomationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(id: string): void {
    this.rules.delete(id);
  }

  listRules(): AutomationRule[] {
    return [...this.rules.values()];
  }

  private async handleEvent(event: AutomationEvent): Promise<void> {
    const matchedTriggers = this.triggers.matching(event);
    if (matchedTriggers.length === 0) return;

    const matchedTriggerIds = new Set(matchedTriggers.map((t) => t.id));
    const actionIds = new Set<string>();
    for (const rule of this.rules.values()) {
      if (matchedTriggerIds.has(rule.triggerId)) {
        for (const actionId of rule.actionIds) actionIds.add(actionId);
      }
    }

    await Promise.all([...actionIds].map((actionId) => this.queue.enqueue({ actionId, event })));
  }

  emit(type: string, payload?: unknown, source?: string): Promise<void> {
    return this.eventBus.publish(type, payload, source);
  }
}
