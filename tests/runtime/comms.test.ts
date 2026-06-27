import { describe, expect, it } from "vitest";
import { CommunicationBus } from "../../src/runtime/comms/index.js";

describe("CommunicationBus", () => {
  it("delivers direct messages", async () => {
    const bus = new CommunicationBus();
    const received: string[] = [];
    bus.subscribe("bob", (msg) => {
      received.push(msg.payload as string);
    });
    await bus.send({ from: "alice", to: "bob", payload: "hello" });
    expect(received).toEqual(["hello"]);
  });

  it("delivers broadcasts to every subscriber", async () => {
    const bus = new CommunicationBus();
    const a: string[] = [];
    const b: string[] = [];
    bus.subscribe("a", (msg) => a.push(msg.payload as string));
    bus.subscribe("b", (msg) => b.push(msg.payload as string));
    await bus.broadcast("system", "ping");
    expect(a).toEqual(["ping"]);
    expect(b).toEqual(["ping"]);
  });

  it("supports request/reply", async () => {
    const bus = new CommunicationBus();
    bus.subscribe("answer-agent", async (msg) => {
      if (msg.kind !== "request") return;
      await bus.reply(msg.id, "answer-agent", msg.from, `echo:${msg.payload}`);
    });
    const reply = await bus.request<string, string>("client", "answer-agent", "hi");
    expect(reply.payload).toBe("echo:hi");
  });

  it("rejects request on timeout", async () => {
    const bus = new CommunicationBus();
    bus.subscribe("silent", () => undefined);
    await expect(
      bus.request("client", "silent", null, { timeoutMs: 20 }),
    ).rejects.toThrow(/timed out/);
  });
});
