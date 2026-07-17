import { afterEach, describe, expect, it, vi } from "vitest";
import { OllamaProvider } from "../../src/llm/ollama-provider.js";
import { LlmClient, createDefaultLlmClient } from "../../src/llm/client.js";
import { LlmError } from "../../src/llm/types.js";

function stubFetch(handler: (url: string, init: RequestInit) => Partial<Response> & { jsonBody?: unknown; textBody?: string }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const r = handler(url, init);
      return {
        ok: r.ok ?? true,
        status: r.status ?? 200,
        statusText: r.statusText ?? "",
        json: async () => r.jsonBody ?? {},
        text: async () => r.textBody ?? "",
      } as unknown as Response;
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OllamaProvider.complete", () => {
  it("maps a chat response into an LlmCompletionResult", async () => {
    stubFetch(() => ({
      ok: true,
      jsonBody: {
        model: "llama3.1",
        message: { role: "assistant", content: "A SaaS for dentists: automated recall scheduling." },
        done: true,
        done_reason: "stop",
        prompt_eval_count: 12,
        eval_count: 20,
      },
    }));
    const provider = new OllamaProvider({ host: "http://127.0.0.1:11434" });
    const result = await provider.complete({ model: "llama3.1", messages: [{ role: "user", content: "idea?" }] });
    expect(result).toMatchObject({
      provider: "ollama",
      model: "llama3.1",
      text: "A SaaS for dentists: automated recall scheduling.",
      promptTokens: 12,
      completionTokens: 20,
      finishReason: "stop",
    });
  });

  it("sends temperature/maxTokens/stop as Ollama options", async () => {
    let sentBody: Record<string, unknown> = {};
    stubFetch((_url, init) => {
      sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
      return { ok: true, jsonBody: { message: { content: "ok" } } };
    });
    const provider = new OllamaProvider();
    await provider.complete({
      model: "llama3.1",
      messages: [{ role: "user", content: "x" }],
      temperature: 0.2,
      maxTokens: 256,
      stop: ["\n\n"],
    });
    expect(sentBody.stream).toBe(false);
    expect(sentBody.options).toEqual({ temperature: 0.2, num_predict: 256, stop: ["\n\n"] });
  });

  it("throws LlmError(unavailable) when the daemon is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const provider = new OllamaProvider();
    await expect(
      provider.complete({ model: "llama3.1", messages: [{ role: "user", content: "x" }] }),
    ).rejects.toMatchObject({ name: "LlmError", reason: "unavailable" });
  });

  it("throws LlmError(model-not-found) on a 404", async () => {
    stubFetch(() => ({ ok: false, status: 404, textBody: "model 'nope' not found" }));
    const provider = new OllamaProvider();
    await expect(
      provider.complete({ model: "nope", messages: [{ role: "user", content: "x" }] }),
    ).rejects.toMatchObject({ reason: "model-not-found", status: 404 });
  });

  it("throws LlmError(bad-response) when content is missing", async () => {
    stubFetch(() => ({ ok: true, jsonBody: { done: true } }));
    const provider = new OllamaProvider();
    await expect(
      provider.complete({ model: "llama3.1", messages: [{ role: "user", content: "x" }] }),
    ).rejects.toMatchObject({ reason: "bad-response" });
  });

  it("isAvailable reflects the /api/tags reachability", async () => {
    stubFetch(() => ({ ok: true, jsonBody: { models: [{ name: "llama3.1" }] } }));
    expect(await new OllamaProvider().isAvailable()).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await new OllamaProvider().isAvailable()).toBe(false);
  });
});

describe("LlmClient", () => {
  it("dispatches complete() to the default provider", async () => {
    stubFetch(() => ({ ok: true, jsonBody: { message: { content: "hi" } } }));
    const client = createDefaultLlmClient();
    expect(client.defaultProvider).toBe("ollama");
    const res = await client.complete({ model: "llama3.1", messages: [{ role: "user", content: "x" }] });
    expect(res.text).toBe("hi");
  });

  it("throws a typed error for an unknown provider id", async () => {
    const client = new LlmClient();
    await expect(
      client.complete({ model: "m", messages: [{ role: "user", content: "x" }] }, "does-not-exist"),
    ).rejects.toBeInstanceOf(LlmError);
  });

  it("supports registering an additional provider and making it default", () => {
    const client = createDefaultLlmClient();
    const fake = {
      id: "fake",
      isAvailable: async () => true,
      complete: async () => ({ text: "", provider: "fake", model: "m" }),
    };
    client.register(fake, true);
    expect(client.defaultProvider).toBe("fake");
    expect(client.list()).toContain("ollama");
    expect(client.list()).toContain("fake");
  });
});
