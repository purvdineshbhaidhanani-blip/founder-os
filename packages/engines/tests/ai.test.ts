import { describe, expect, it } from "vitest";
import {
  ContextWindowManager,
  InMemoryAIMemoryStore,
  InMemoryTokenAccountant,
  MockProvider,
  ModelRouter,
  PromptManager,
  ToolRegistry,
} from "../src/ai/index.js";

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
