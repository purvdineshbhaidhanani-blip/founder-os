import type { AutomationEvent, TriggerDefinition } from "./types.js";

/** Holds registered triggers, keyed by id, so rules can reference them by name. */
export class TriggerRegistry {
  private readonly triggers = new Map<string, TriggerDefinition>();

  register(trigger: TriggerDefinition): void {
    this.triggers.set(trigger.id, trigger);
  }

  unregister(id: string): void {
    this.triggers.delete(id);
  }

  get(id: string): TriggerDefinition | undefined {
    return this.triggers.get(id);
  }

  list(): TriggerDefinition[] {
    return [...this.triggers.values()];
  }

  /** Triggers whose `eventType` matches and whose filter (if any) passes. */
  matching(event: AutomationEvent): TriggerDefinition[] {
    return this.list().filter((t) => t.eventType === event.type && (!t.filter || t.filter(event)));
  }
}
