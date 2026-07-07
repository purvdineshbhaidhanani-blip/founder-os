import { describe, expect, it, vi } from "vitest";
import {
  InAppChannel,
  InMemoryInAppStore,
  NotificationEngine,
  NotificationTemplateRegistry,
  WebhookChannel,
  type NotificationChannel,
} from "../../src/engines/notification/index.js";

describe("Notification Engine", () => {
  it("dispatches a message to the channel matching its type", async () => {
    const sent: string[] = [];
    const channel: NotificationChannel = {
      type: "email",
      send: async (message) => {
        sent.push(message.body);
      },
    };
    const engine = new NotificationEngine({ channels: [channel] });
    const result = await engine.send({ channel: "email", recipient: "a@example.com", body: "hi" });
    expect(result.status).toBe("sent");
    expect(sent).toEqual(["hi"]);
  });

  it("marks a notification failed when the channel throws, and rethrows", async () => {
    const channel: NotificationChannel = {
      type: "webhook",
      send: async () => {
        throw new Error("delivery failed");
      },
    };
    const engine = new NotificationEngine({ channels: [channel] });
    await expect(engine.send({ channel: "webhook", recipient: "x", body: "y" })).rejects.toThrow(
      "delivery failed",
    );
  });

  it("renders a template and sends it through the right channel", async () => {
    const store = new InMemoryInAppStore();
    const engine = new NotificationEngine({ channels: [new InAppChannel(store)] });
    engine.templates.register({
      id: "welcome",
      version: "1.0.0",
      channel: "in-app",
      subjectTemplate: "Welcome {{name}}",
      bodyTemplate: "Hi {{name}}, glad you joined!",
    });

    await engine.sendFromTemplate("welcome", "in-app", "user-1", { name: "Ada" });
    const inbox = await store.listForRecipient("user-1");
    expect(inbox).toHaveLength(1);
    expect(inbox[0]!.subject).toBe("Welcome Ada");
  });

  it("NotificationTemplateRegistry resolves the latest version by default", () => {
    const registry = new NotificationTemplateRegistry();
    registry.register({ id: "t", version: "1.0.0", channel: "email", bodyTemplate: "old" });
    registry.register({ id: "t", version: "2.0.0", channel: "email", bodyTemplate: "new" });
    expect(registry.renderById("t", {}).body).toBe("new");
  });

  it("WebhookChannel does not retry by default (no silent duplicate delivery)", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return new Response("server error", { status: 500 });
    });
    const channel = new WebhookChannel({
      resolveUrl: () => "https://hooks.example.com/abc",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(channel.send({ channel: "webhook", recipient: "r", body: "b" })).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
