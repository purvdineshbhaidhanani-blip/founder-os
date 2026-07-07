import { describe, expect, it } from "vitest";
import { AutomationEngine, CronAbstraction, EventBus, InMemoryQueue } from "../src/automation/index.js";
import { InProcessScheduler, type ScheduleHandle, type ScheduleSpec, type Scheduler } from "@platform/shared";

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

describe("Automation Engine", () => {
  it("fires an action when its bound trigger matches an emitted event", async () => {
    const engine = new AutomationEngine();
    const seen: unknown[] = [];

    engine.triggers.register({ id: "user-signup", eventType: "user.signup" });
    engine.actions.register({
      id: "send-welcome",
      execute: (event) => {
        seen.push(event.payload);
      },
    });
    engine.addRule({ id: "rule-1", triggerId: "user-signup", actionIds: ["send-welcome"] });

    await engine.emit("user.signup", { userId: "u1" });
    await flush();

    expect(seen).toEqual([{ userId: "u1" }]);
  });

  it("does not fire actions for events with no matching trigger", async () => {
    const engine = new AutomationEngine();
    let called = false;
    engine.actions.register({ id: "a", execute: () => { called = true; } });
    engine.triggers.register({ id: "t", eventType: "known.event" });
    engine.addRule({ id: "r", triggerId: "t", actionIds: ["a"] });

    await engine.emit("unrelated.event", {});
    await flush();
    expect(called).toBe(false);
  });

  it("respects a trigger filter", async () => {
    const engine = new AutomationEngine();
    const matched: unknown[] = [];
    engine.triggers.register({
      id: "big-orders",
      eventType: "order.created",
      filter: (event) => (event.payload as { amount: number }).amount > 100,
    });
    engine.actions.register({ id: "notify", execute: (event) => { matched.push(event.payload); } });
    engine.addRule({ id: "r", triggerId: "big-orders", actionIds: ["notify"] });

    await engine.emit("order.created", { amount: 50 });
    await engine.emit("order.created", { amount: 200 });
    await flush();

    expect(matched).toEqual([{ amount: 200 }]);
  });

  it("EventBus supports wildcard listeners", async () => {
    const bus = new EventBus();
    const types: string[] = [];
    bus.onAny((event) => { types.push(event.type); });
    await bus.publish("a", {});
    await bus.publish("b", {});
    expect(types).toEqual(["a", "b"]);
  });

  it("InMemoryQueue processes jobs up to its concurrency limit", async () => {
    const queue = new InMemoryQueue<number>({ concurrency: 2 });
    const processed: number[] = [];
    queue.process(async (job) => {
      processed.push(job.payload);
    });
    await queue.enqueue(1);
    await queue.enqueue(2);
    await queue.enqueue(3);
    await flush();
    expect(processed.sort()).toEqual([1, 2, 3]);
  });

  it("InMemoryQueue rejects a concurrency or maxAttempts below 1 instead of stalling silently", () => {
    expect(() => new InMemoryQueue({ concurrency: 0 })).toThrow();
    expect(() => new InMemoryQueue({ maxAttempts: 0 })).toThrow();
  });

  it("CronAbstraction reports a listener error via onError instead of an unhandled rejection", async () => {
    const immediateScheduler: Scheduler = {
      schedule: (_spec: ScheduleSpec, callback: () => void | Promise<void>): ScheduleHandle => {
        void callback();
        return { id: "immediate", spec: _spec, cancel: () => {} };
      },
      cancel: () => {},
      list: () => [],
    };

    const eventBus = new EventBus();
    eventBus.on("cron.tick", () => {
      throw new Error("listener boom");
    });

    const errors: unknown[] = [];
    const cron = new CronAbstraction({
      scheduler: immediateScheduler,
      eventBus,
      onError: (error) => errors.push(error),
    });

    cron.bind("* * * * *", "cron.tick");
    await flush();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("listener boom");
  });

  it("real InProcessScheduler still cancels a cron binding cleanly", () => {
    const scheduler = new InProcessScheduler();
    const cron = new CronAbstraction({ scheduler, eventBus: new EventBus() });
    const handleId = cron.bind("*/5 * * * *", "cron.tick");
    expect(() => cron.unbind(handleId)).not.toThrow();
  });
});
