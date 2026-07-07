import type { AutomationEvent, EventListener } from "./types.js";

/**
 * Minimal typed pub/sub bus. The Automation Engine's trigger system listens
 * on this; anything in the host application can also subscribe directly for
 * cases that don't need the full trigger/action indirection.
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<EventListener>>();
  private readonly wildcardListeners = new Set<EventListener>();

  on<TPayload = unknown>(eventType: string, listener: EventListener<TPayload>): () => void {
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, new Set());
    this.listeners.get(eventType)!.add(listener as EventListener);
    return () => this.off(eventType, listener as EventListener);
  }

  /** Subscribes to every event regardless of type. */
  onAny(listener: EventListener): () => void {
    this.wildcardListeners.add(listener);
    return () => this.wildcardListeners.delete(listener);
  }

  off(eventType: string, listener: EventListener): void {
    this.listeners.get(eventType)?.delete(listener);
  }

  async emit<TPayload = unknown>(event: AutomationEvent<TPayload>): Promise<void> {
    const direct = this.listeners.get(event.type);
    const targets = [...(direct ?? []), ...this.wildcardListeners];
    await Promise.all(targets.map((listener) => listener(event)));
  }

  publish<TPayload = unknown>(type: string, payload: TPayload, source?: string): Promise<void> {
    return this.emit({ type, payload, timestamp: new Date().toISOString(), source });
  }
}
