import { InProcessScheduler, type Scheduler } from "../shared/schedule.js";
import { EventBus } from "./event-bus.js";

export interface CronBindingOptions {
  scheduler?: Scheduler;
  eventBus: EventBus;
  /** Called when a listener on the published event throws. Without this, a listener error would become an unhandled promise rejection on every fire. */
  onError?: (error: unknown, eventType: string) => void;
}

/**
 * The Automation Engine's cron abstraction: turns a cron expression into a
 * synthetic `"schedule.fired"` event on the shared `EventBus`, so recurring
 * work flows through the same trigger/action pipeline as everything else
 * instead of needing its own bespoke wiring.
 */
export class CronAbstraction {
  private readonly scheduler: Scheduler;
  private readonly eventBus: EventBus;

  constructor(private readonly options: CronBindingOptions) {
    this.scheduler = options.scheduler ?? new InProcessScheduler();
    this.eventBus = options.eventBus;
  }

  bind(cronExpression: string, eventType: string, payload?: unknown): string {
    const handle = this.scheduler.schedule({ type: "cron", expression: cronExpression }, async () => {
      try {
        await this.eventBus.publish(eventType, payload, "cron");
      } catch (error) {
        this.options.onError?.(error, eventType);
      }
    });
    return handle.id;
  }

  unbind(handleId: string): void {
    this.scheduler.cancel(handleId);
  }
}
