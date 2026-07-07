import net from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HttpEmailChannel,
  InAppChannel,
  InMemoryInAppStore,
  NotificationEngine,
  NotificationTemplateRegistry,
  WebhookChannel,
  createHttpEmailHealthCheck,
  createResendEmailChannel,
  createSmtpHealthCheck,
  isNotificationChannelError,
  type NotificationChannel,
} from "../src/notification/index.js";

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

  describe("HttpEmailChannel hardening", () => {
    it("throws immediately on a missing endpoint", () => {
      expect(() => new HttpEmailChannel({ endpoint: "", headers: {}, buildBody: () => ({}) })).toThrow(/endpoint/);
    });

    it("does not retry by default, even on a 500", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        return new Response("server error", { status: 500 });
      });
      const channel = new HttpEmailChannel({
        endpoint: "https://email.example.com/send",
        headers: {},
        buildBody: (m) => ({ to: m.recipient }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      await expect(channel.send({ channel: "email", recipient: "r", body: "b" })).rejects.toThrow();
      expect(calls).toBe(1);
    });

    it("retries a 500 once retryPolicy is opted into, then succeeds", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        if (calls < 2) return new Response("server error", { status: 500 });
        return new Response("ok", { status: 200 });
      });
      const channel = new HttpEmailChannel({
        endpoint: "https://email.example.com/send",
        headers: {},
        buildBody: (m) => ({ to: m.recipient }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
      });
      await channel.send({ channel: "email", recipient: "r", body: "b" });
      expect(calls).toBe(2);
    });

    it("aborts and reports a retryable timeout when the send hangs", async () => {
      const fetchImpl = vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      );
      const channel = new HttpEmailChannel({
        endpoint: "https://email.example.com/send",
        headers: {},
        buildBody: (m) => ({ to: m.recipient }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 20,
      });
      const error = await channel.send({ channel: "email", recipient: "r", body: "b" }).catch((e: unknown) => e);
      expect(isNotificationChannelError(error)).toBe(true);
      expect((error as { retryable: boolean }).retryable).toBe(true);
      expect((error as Error).message).toMatch(/timed out/i);
    });
  });

  describe("createResendEmailChannel", () => {
    it("posts to Resend's endpoint with bearer auth and the expected body shape", async () => {
      let capturedUrl: string | undefined;
      let capturedInit: RequestInit | undefined;
      const fetchImpl = vi.fn(async (url: unknown, init?: RequestInit) => {
        capturedUrl = String(url);
        capturedInit = init;
        return new Response("{}", { status: 200 });
      });
      const channel = createResendEmailChannel({
        apiKey: "re_test_key",
        from: "Acme <notifications@acme.com>",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      await channel.send({ channel: "email", recipient: "user@example.com", subject: "Hi", body: "<p>hi</p>" });

      expect(capturedUrl).toBe("https://api.resend.com/emails");
      expect((capturedInit?.headers as Record<string, string>).authorization).toBe("Bearer re_test_key");
      const body = JSON.parse(capturedInit?.body as string);
      expect(body).toEqual({ from: "Acme <notifications@acme.com>", to: ["user@example.com"], subject: "Hi", html: "<p>hi</p>" });
    });

    it("sends the body under `text` instead of `html` when format is \"text\"", async () => {
      const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        expect(body.text).toBe("plain body");
        expect(body.html).toBeUndefined();
        return new Response("{}", { status: 200 });
      });
      const channel = createResendEmailChannel({
        apiKey: "k",
        from: "a@b.com",
        format: "text",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      await channel.send({ channel: "email", recipient: "user@example.com", body: "plain body" });
      expect(fetchImpl).toHaveBeenCalled();
    });
  });

  describe("createHttpEmailHealthCheck", () => {
    it("reports ok when the endpoint is reachable and down on a 5xx", async () => {
      const ok = createHttpEmailHealthCheck({
        endpoint: "https://api.resend.com/emails",
        fetchImpl: (async () => new Response(null, { status: 405 })) as unknown as typeof fetch,
      });
      expect((await ok()).status).toBe("ok");

      const down = createHttpEmailHealthCheck({
        endpoint: "https://api.resend.com/emails",
        fetchImpl: (async () => new Response(null, { status: 503 })) as unknown as typeof fetch,
      });
      expect((await down()).status).toBe("down");
    });
  });

  describe("createSmtpHealthCheck", () => {
    let closeServer: (() => Promise<void>) | undefined;

    afterEach(async () => {
      await closeServer?.();
      closeServer = undefined;
    });

    function startMockSmtpServer(script: { greeting?: string; onEhlo?: string; silent?: boolean }): Promise<{ port: number; close: () => Promise<void> }> {
      return new Promise((resolve) => {
        const server = net.createServer((socket) => {
          if (!script.silent) socket.write(`${script.greeting ?? "220 mock.local ESMTP"}\r\n`);
          let buffer = "";
          socket.on("data", (chunk: Buffer) => {
            buffer += chunk.toString("utf-8");
            const idx = buffer.indexOf("\r\n");
            if (idx === -1) return;
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            if (/^EHLO/i.test(line)) socket.write(`${script.onEhlo ?? "250 mock.local"}\r\n`);
            else if (/^STARTTLS/i.test(line)) socket.write("220 Go ahead\r\n");
            else if (/^QUIT/i.test(line)) socket.end();
          });
        });
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          const port = typeof address === "object" && address ? address.port : 0;
          resolve({ port, close: () => new Promise((r) => server.close(() => r())) });
        });
      });
    }

    it("reports down without a network call when host is missing", async () => {
      const check = createSmtpHealthCheck({ host: "" });
      expect((await check()).status).toBe("down");
    });

    it("reports ok after greeting + EHLO when startTls is disabled", async () => {
      const server = await startMockSmtpServer({});
      closeServer = server.close;
      const check = createSmtpHealthCheck({ host: "127.0.0.1", port: server.port, startTls: false });
      const result = await check();
      expect(result.status).toBe("ok");
      expect(result.details).toContain("EHLO");
    });

    it("reports down when the connection is refused", async () => {
      const check = createSmtpHealthCheck({ host: "127.0.0.1", port: 1, timeoutMs: 5000 });
      expect((await check()).status).toBe("down");
    });

    it("reports down when EHLO is rejected", async () => {
      const server = await startMockSmtpServer({ onEhlo: "550 no" });
      closeServer = server.close;
      const check = createSmtpHealthCheck({ host: "127.0.0.1", port: server.port, startTls: false });
      const result = await check();
      expect(result.status).toBe("down");
      expect(result.details).toContain("EHLO rejected");
    });

    it("reports down on timeout when the server never greets", async () => {
      const server = await startMockSmtpServer({ silent: true });
      closeServer = server.close;
      const check = createSmtpHealthCheck({ host: "127.0.0.1", port: server.port, timeoutMs: 100 });
      const result = await check();
      expect(result.status).toBe("down");
      expect(result.details).toMatch(/timed out/i);
    });

    it("reports down when STARTTLS is negotiated but the peer doesn't actually speak TLS", async () => {
      const server = await startMockSmtpServer({});
      closeServer = server.close;
      const check = createSmtpHealthCheck({ host: "127.0.0.1", port: server.port, startTls: true, timeoutMs: 800 });
      const result = await check();
      expect(result.status).toBe("down");
    });
  });
});
