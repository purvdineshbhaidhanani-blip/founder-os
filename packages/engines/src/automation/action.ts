import type { ActionDefinition } from "./types.js";

/** Holds registered actions, keyed by id, so rules can reference them by name. */
export class ActionRegistry {
  private readonly actions = new Map<string, ActionDefinition>();

  register(action: ActionDefinition): void {
    this.actions.set(action.id, action);
  }

  unregister(id: string): void {
    this.actions.delete(id);
  }

  get(id: string): ActionDefinition | undefined {
    return this.actions.get(id);
  }

  list(): ActionDefinition[] {
    return [...this.actions.values()];
  }
}
