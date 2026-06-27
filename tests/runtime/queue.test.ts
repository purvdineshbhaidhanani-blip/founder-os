import { describe, expect, it } from "vitest";
import { TaskQueue } from "../../src/runtime/queue/index.js";

describe("TaskQueue", () => {
  it("dequeues by priority and then by creation order", () => {
    const queue = new TaskQueue();
    queue.enqueue({ id: "a", kind: "demo", payload: 1, priority: 1 });
    queue.enqueue({ id: "b", kind: "demo", payload: 2, priority: 5 });
    queue.enqueue({ id: "c", kind: "demo", payload: 3, priority: 5 });
    expect(queue.dequeue()?.id).toBe("b");
    expect(queue.dequeue()?.id).toBe("c");
    expect(queue.dequeue()?.id).toBe("a");
  });

  it("respects dependencies", () => {
    const queue = new TaskQueue();
    queue.enqueue({ id: "parent", kind: "demo", payload: 0 });
    queue.enqueue({ id: "child", kind: "demo", payload: 0, dependencies: ["parent"] });
    expect(queue.dequeue()?.id).toBe("parent");
    expect(queue.dequeue()).toBeUndefined();
    queue.complete("parent", null);
    expect(queue.dequeue()?.id).toBe("child");
  });

  it("retries with backoff, then dead-letters", () => {
    const queue = new TaskQueue();
    queue.enqueue({
      id: "flaky",
      kind: "demo",
      payload: 0,
      retry: { maxAttempts: 2, backoffMs: 1 },
    });
    queue.dequeue();
    queue.fail("flaky", { message: "first failure" });
    expect(queue.get("flaky")?.status).toBe("scheduled");
    // Force scheduledFor into the past so it's immediately ready again.
    const record = queue.get("flaky")!;
    record.scheduledFor = new Date(Date.now() - 1).toISOString();
    queue.dequeue();
    queue.fail("flaky", { message: "second failure" });
    expect(queue.get("flaky")?.status).toBe("dead");
    expect(queue.deadLetter()).toHaveLength(1);
  });

  it("cancels queued tasks", () => {
    const queue = new TaskQueue();
    queue.enqueue({ id: "x", kind: "demo", payload: 0 });
    queue.cancel("x");
    expect(queue.get("x")?.status).toBe("cancelled");
  });
});
