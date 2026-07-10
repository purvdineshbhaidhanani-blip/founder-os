import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { calculateCostMicroCents, microCentsToDollars } from "../../src/ai/cost.js";
import { withRetry } from "../../src/ai/retry.js";
import { extractJson, parseStructuredResponse } from "../../src/ai/structured-output.js";
import { registerPrompt, getPrompt, listRegisteredPromptKeys } from "../../src/ai/prompts.js";
import { requiresHumanApproval } from "../../src/ai/approval.js";

describe("cost calculation", () => {
  it("calculates cost for a known model", () => {
    // claude-sonnet-4-5: 300 micro-cents/input token, 1500/output token
    const cost = calculateCostMicroCents("claude-sonnet-4-5", 1000, 500);
    expect(cost).toBe(1000 * 300 + 500 * 1500);
  });

  it("falls back to a default price for an unknown model rather than throwing", () => {
    expect(() => calculateCostMicroCents("some-future-model", 100, 100)).not.toThrow();
    expect(calculateCostMicroCents("some-future-model", 100, 100)).toBeGreaterThan(0);
  });

  it("converts micro-cents to dollars correctly", () => {
    // 1,000,000 micro-cents = 1 cent = $0.01
    expect(microCentsToDollars(1_000_000)).toBeCloseTo(0.01);
    expect(microCentsToDollars(100_000_000)).toBeCloseTo(1.0);
  });
});

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable (429) error up to maxAttempts, then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-retryable (400) error", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400 });
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws the last error once maxAttempts is exhausted", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503 });
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toMatchObject({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    expect(extractJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a fence without a language tag", () => {
    expect(extractJson('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("throws on invalid JSON", () => {
    expect(() => extractJson("not json at all")).toThrow();
  });
});

describe("parseStructuredResponse", () => {
  const schema = z.object({ recommendation: z.string(), confidence: z.number().min(0).max(1) });

  it("returns validated data for a well-formed response", () => {
    const result = parseStructuredResponse('{"recommendation": "consolidate vendors", "confidence": 0.9}', schema);
    expect(result.recommendation).toBe("consolidate vendors");
    expect(result.confidence).toBe(0.9);
  });

  it("throws when the response doesn't match the schema", () => {
    expect(() => parseStructuredResponse('{"recommendation": "x"}', schema)).toThrow();
  });
});

describe("prompt registry", () => {
  it("registers and retrieves a prompt by key", () => {
    registerPrompt("test.example_prompt", { version: "v1", system: "You are a helpful assistant." });
    const prompt = getPrompt("test.example_prompt");
    expect(prompt.version).toBe("v1");
    expect(listRegisteredPromptKeys()).toContain("test.example_prompt");
  });

  it("throws a clear error for an unregistered key", () => {
    expect(() => getPrompt("nonexistent.key")).toThrow(/No prompt registered/);
  });
});

describe("human-approval matrix", () => {
  it("read-only actions never require approval", () => {
    expect(requiresHumanApproval("read_only")).toBe(false);
  });

  it("draft and irreversible actions require approval", () => {
    expect(requiresHumanApproval("draft")).toBe(true);
    expect(requiresHumanApproval("irreversible")).toBe(true);
  });
});
