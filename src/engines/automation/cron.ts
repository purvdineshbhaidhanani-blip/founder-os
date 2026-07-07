import { InProcessScheduler, type Scheduler } from "../shared/schedule.js";
import { EventBus } from "./event-bus.js";

export interface CronBindingOptions {
  scheduler?: Scheduler;
  eventBus: EventBus;
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

  constructor(options: CronBindingOptions) {
    this.scheduler = options.scheduler ?? new InProcessScheduler();
    this.eventBus = options.eventBus;
  }

  bind(cronExpression: string, eventType: string, payload?: unknown): string {
    const handle = this.scheduler.schedule({ type: "cron", expression: cronExpression }, () =>
      this.eventBus.publish(eventType, payload, "cron"),
    );
    return handle.id;
  }

  unbind(handleId: string): void {
    this.scheduler.cancel(handleId);
  }
}
