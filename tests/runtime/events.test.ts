import { describe, expect, it } from "vitest";
import { EventBus } from "../../src/runtime/events/index.js";

describe("EventBus", () => {
  it("delivers events to matching subscribers", async () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.subscribe({ name: "task.started" }, (event) => {
      received.push(event.id);
    });
    const event = await bus.publish({ name: "task.started", payload: { id: "task:1" } });
    expect(received).toEqual([event.id]);
  });

  it("filters by regex pattern", async () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.subscribe({ namePattern: "^task\\." }, (event) => {
      received.push(event.name);
    });
    await bus.publish({ name: "task.started", payload: {} });
    await bus.publish({ name: "workflow.started", payload: {} });
    await bus.publish({ name: "task.completed", payload: {} });
    expect(received).toEqual(["task.started", "task.completed"]);
  });

  it("replays history through a fresh handler", async () => {
    const bus = new EventBus();
    await bus.publish({ name: "agent.activated", payload: { name: "a" } });
    await bus.publish({ name: "agent.activated", payload: { name: "b" } });
    const seen: string[] = [];
    const count = await bus.replay({ name: "agent.activated" }, (event) => {
      seen.push((event.payload as { name: string }).name);
    });
    expect(count).toBe(2);
    expect(seen).toEqual(["a", "b"]);
  });
});
