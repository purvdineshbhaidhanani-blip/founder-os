import { describe, expect, it, vi } from "vitest";
import {
  ContextWindowManager,
  InMemoryAIMemoryStore,
  InMemoryTokenAccountant,
  MockProvider,
  ModelRouter,
  PromptManager,
  ToolRegistry,
  OpenAIProvider,
  AnthropicProvider,
  createOpenAIHealthCheck,
  createAnthropicHealthCheck,
  isAIProviderError,
} from "../src/ai/index.js";

/** A fetch stub whose pending request only settles when the caller's AbortSignal fires — mirrors real fetch's abort contract. */
function neverResolvingFetch(): typeof fetch {
  return vi.fn(
    (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        const rejectAborted = () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        };
        if (signal.aborted) rejectAborted();
        else signal.addEventListener("abort", rejectAborted);
      }),
  ) as unknown as typeof fetch;
}

const openAiSuccessBody = {
  id: "chatcmpl-1",
  choices: [{ message: { role: "assistant", content: "hi" }, finish_reason: "stop" }],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

const anthropicSuccessBody = {
  id: "msg-1",
  content: [{ type: "text", text: "hi" }],
  stop_reason: "end_turn",
  usage: { input_tokens: 1, output_tokens: 1 },
};

const request = { messages: [{ role: "user" as const, content: "hi" }], config: { model: "x" } };

describe("AI Engine", () => {
  it("MockProvider completes and streams deterministically", async () => {
    const provider = new MockProvider();
    const request = {
      messages: [{ role: "user" as const, content: "hello" }],
      config: { model: "mock-1" },
    };
    const response = await provider.complete(request);
    expect(response.message.content).toBe("Echo: hello");
    expect(response.usage.totalTokens).toBeGreaterThan(0);

    const chunks: string[] = [];
    for await (const chunk of provider.stream(request)) {
      if (chunk.type === "text-delta") chunks.push(chunk.delta);
    }
    expect(chunks.join("")).toBe("Echo: hello");
  });

  it("ModelRouter falls back to a secondary provider on retryable failure", async () => {
    const failing = new MockProvider({
      respond: () => {
        throw Object.assign(new Error("boom"), { providerId: "primary", retryable: true });
      },
    });
    const backup = new MockProvider({ respond: () => "backup response" });
    const router = new ModelRouter({ routes: [{ model: "*", provider: failing, fallbacks: [backup] }] });

    const response = await router.complete({
      messages: [{ role: "user", content: "hi" }],
      config: { model: "any-model" },
    });
    expect(response.message.content).toBe("backup response");
  });

  it("PromptManager renders versioned templates", () => {
    const manager = new PromptManager();
    manager.register({ id: "greeting", version: "1.0.0", template: "Hello {{name}}!" });
    expect(manager.renderById("greeting", { name: "Ada" })).toBe("Hello Ada!");
    expect(() => manager.renderById("greeting", {})).toThrow();
  });

  it("ContextWindowManager trims oldest messages to fit a token budget", () => {
    const manager = new ContextWindowManager({ maxTokens: 5, reserveLeading: 1 });
    const messages = [
      { role: "system" as const, content: "sys" },
      { role: "user" as const, content: "a".repeat(100) },
      { role: "user" as const, content: "hi" },
    ];
    const fitted = manager.fit(messages);
    expect(fitted[0]!.role).toBe("system");
    expect(fitted[fitted.length - 1]!.content).toBe("hi");
  });

  it("ToolRegistry executes registered tools and reports unknown tools", async () => {
    const registry = new ToolRegistry();
    registry.register(
      { name: "add", description: "adds two numbers", parameters: { type: "object", properties: {} } },
      (args: { a: number; b: number }) => args.a + args.b,
    );
    const [ok, missing] = await registry.executeAll([
      { id: "1", name: "add", arguments: { a: 2, b: 3 } },
      { id: "2", name: "missing", arguments: {} },
    ]);
    expect(ok!.content).toBe("5");
    expect(missing!.content).toContain("Unknown tool");
  });

  it("InMemoryTokenAccountant totals cost and usage across records", () => {
    const accountant = new InMemoryTokenAccountant({ "gpt-x": { inputPerMillion: 1, outputPerMillion: 2 } });
    accountant.record("gpt-x", { inputTokens: 1_000_000, outputTokens: 500_000, totalTokens: 1_500_000 });
    expect(accountant.totalCostUsd()).toBe(2);
    expect(accountant.totalUsage().totalTokens).toBe(1_500_000);
  });

  it("InMemoryAIMemoryStore recalls by session and tag", async () => {
    const memory = new InMemoryAIMemoryStore();
    await memory.remember({ sessionId: "s1", content: "likes cats", tags: ["preference"] });
    await memory.remember({ sessionId: "s1", content: "lives in SF", tags: ["fact"] });
    const recalled = await memory.recall({ sessionId: "s1", tags: ["preference"] });
    expect(recalled).toHaveLength(1);
    expect(recalled[0]!.content).toBe("likes cats");
  });
});

describe.each([
  { name: "OpenAIProvider", Provider: OpenAIProvider, successBody: openAiSuccessBody },
  { name: "AnthropicProvider", Provider: AnthropicProvider, successBody: anthropicSuccessBody },
])("$name hardening", ({ Provider, successBody }) => {
  it("throws immediately on a missing apiKey", () => {
    expect(() => new Provider({ apiKey: "" })).toThrow(/apiKey/);
  });

  it("completes successfully with a mocked fetch", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(successBody), { status: 200 }));
    const provider = new Provider({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    const response = await provider.complete(request);
    expect(response.message.content).toBe("hi");
  });

  it("does not retry by default, even on a 500 (retrying is an opt-in)", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return new Response("server error", { status: 500 });
    });
    const provider = new Provider({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(provider.complete(request)).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("retries a 500 up to maxAttempts once retryPolicy is opted into, then succeeds", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls < 2) return new Response("server error", { status: 500 });
      return new Response(JSON.stringify(successBody), { status: 200 });
    });
    const provider = new Provider({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
    });
    const response = await provider.complete(request);
    expect(response.message.content).toBe("hi");
    expect(calls).toBe(2);
  });

  it("never retries a non-retryable 400, even with retryPolicy opted in", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return new Response("bad request", { status: 400 });
    });
    const provider = new Provider({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
    });
    await expect(provider.complete(request)).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("aborts and reports a retryable timeout when the request hangs", async () => {
    const provider = new Provider({ apiKey: "k", fetchImpl: neverResolvingFetch(), timeoutMs: 20 });
    const error = await provider.complete(request).catch((e: unknown) => e);
    expect(isAIProviderError(error)).toBe(true);
    expect((error as Error).message).toMatch(/timed out/i);
    expect((error as { retryable: boolean }).retryable).toBe(true);
  });

  it("reports a non-retryable cancellation (not a timeout) when the caller aborts, and never retries past it", async () => {
    const controller = new AbortController();
    let calls = 0;
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const provider = new Provider({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
    });
    const pending = provider.complete({ ...request, signal: controller.signal });
    controller.abort();
    const error = await pending.catch((e: unknown) => e);
    expect(isAIProviderError(error)).toBe(true);
    expect((error as { retryable: boolean }).retryable).toBe(false);
    expect((error as Error).message).toMatch(/cancelled/i);
    expect(calls).toBe(1);
  });

  it("disables the timeout when timeoutMs is 0", async () => {
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.signal).toBeUndefined();
      return new Response(JSON.stringify(successBody), { status: 200 });
    });
    const provider = new Provider({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 0 });
    await provider.complete(request);
    expect(fetchImpl).toHaveBeenCalled();
  });
});

describe("AI provider diagnostics", () => {
  it("createOpenAIHealthCheck reports down without a network call when apiKey is missing", async () => {
    const fetchImpl = vi.fn();
    const check = createOpenAIHealthCheck({ apiKey: "", fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await check();
    expect(result.status).toBe("down");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("createOpenAIHealthCheck reports ok on a successful /models call", async () => {
    const fetchImpl = vi.fn(async (url: unknown) => {
      expect(String(url)).toContain("/models");
      return new Response("{}", { status: 200 });
    });
    const check = createOpenAIHealthCheck({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect((await check()).status).toBe("ok");
  });

  it("createOpenAIHealthCheck reports down on 401", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 401 }));
    const check = createOpenAIHealthCheck({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect((await check()).status).toBe("down");
  });

  it("createAnthropicHealthCheck reports degraded on 404 (endpoint shape unverified, not necessarily broken)", async () => {
    const fetchImpl = vi.fn(async () => new Response("not found", { status: 404 }));
    const check = createAnthropicHealthCheck({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect((await check()).status).toBe("degraded");
  });

  it("createAnthropicHealthCheck reports down on a network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("DNS failure");
    });
    const check = createAnthropicHealthCheck({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await check();
    expect(result.status).toBe("down");
    expect(result.details).toContain("DNS failure");
  });
});
