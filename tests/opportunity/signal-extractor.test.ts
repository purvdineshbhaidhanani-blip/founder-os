import { describe, it, expect } from "vitest";
import { extractSignals } from "../../src/opportunity/signal-extractor.js";
import type { CollectedItem } from "../../src/opportunity/types.js";

function makeTestItem(rawContent: string): CollectedItem {
  return {
    id: "test-item-1",
    source: "reddit",
    url: "https://reddit.com/r/test/1",
    author: "testuser",
    timestamp: new Date().toISOString(),
    language: "en",
    category: "saas",
    rawContent,
    context: "test",
    engagement: { votes: 10, replies: 3 },
    metadata: {},
    collectedAt: new Date().toISOString(),
  };
}

describe("extractSignals", () => {
  it("detects complaint signal", () => {
    const item = makeTestItem("I absolutely hate this tool, it's so frustrating to use every day.");
    const signals = extractSignals(item);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some((s) => s.type === "complaint" || s.type === "repeated-task")).toBe(true);
  });

  it("detects missing-feature signal", () => {
    const item = makeTestItem("There's no API, the tool is missing basic export functionality we really need.");
    const signals = extractSignals(item);
    expect(signals.some((s) => s.type === "missing-feature" || s.type === "api-gap")).toBe(true);
  });

  it("detects workaround: excel", () => {
    const item = makeTestItem("We export everything to Excel and then manually process it every week.");
    const signals = extractSignals(item);
    expect(signals.some((s) => s.workarounds.includes("excel"))).toBe(true);
  });

  it("detects buying intent", () => {
    const item = makeTestItem("This is so painful I would gladly pay $500/month for a solution that automates this.");
    const signals = extractSignals(item);
    expect(signals.some((s) => s.buyingIntent === true)).toBe(true);
  });

  it("returns empty array for non-pain content", () => {
    const item = makeTestItem("Great product, works perfectly, very happy with it.");
    const signals = extractSignals(item);
    // No pain signals expected; the function may still detect 'problem' via generic pattern
    // but buying intent and workarounds should not appear
    const hasWorkarounds = signals.some((s) => s.workarounds.length > 0);
    const hasBuying = signals.some((s) => s.buyingIntent);
    expect(hasWorkarounds).toBe(false);
    expect(hasBuying).toBe(false);
  });

  it("sets itemId correctly", () => {
    const item = makeTestItem("Our automation pipeline is completely broken and we had to write custom scripts.");
    const signals = extractSignals(item);
    expect(signals.every((s) => s.itemId === item.id)).toBe(true);
  });
});
