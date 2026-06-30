import { describe, it, expect } from "vitest";
import { clusterSignals } from "../../src/opportunity/repetition-engine.js";
import type { Signal } from "../../src/opportunity/types.js";

function makeSignal(summary: string, overrides: Partial<Signal> = {}): Signal {
  return {
    id: `sig-${Math.random().toString(36).slice(2)}`,
    itemId: "item-1",
    source: "reddit",
    type: "complaint",
    summary,
    rawQuote: summary,
    workarounds: [],
    buyingIntent: false,
    category: "saas",
    extractedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("clusterSignals", () => {
  it("groups identical-problem signals together", () => {
    const s1 = makeSignal("export broken manual spreadsheet workaround");
    const s2 = makeSignal("export broken manual spreadsheet workaround");
    const clusters = clusterSignals([s1, s2]);
    expect(clusters[0]?.signals.length).toBe(2);
  });

  it("separates unrelated signals", () => {
    const s1 = makeSignal("authentication login oauth broken error");
    const s2 = makeSignal("invoice billing payment subscription pricing expensive");
    const clusters = clusterSignals([s1, s2]);
    expect(clusters.length).toBe(2);
  });

  it("respects minClusterSize", () => {
    const s1 = makeSignal("authentication broken login error");
    const clusters = clusterSignals([s1], 2);
    expect(clusters.length).toBe(0);
  });

  it("counts buying intent signals", () => {
    const s1 = makeSignal("export broken manual", { buyingIntent: true });
    const s2 = makeSignal("export broken manual", { buyingIntent: true });
    const s3 = makeSignal("export broken manual", { buyingIntent: false });
    const clusters = clusterSignals([s1, s2, s3]);
    expect(clusters[0]?.buyingIntentCount).toBe(2);
  });

  it("aggregates workarounds across signals", () => {
    const s1 = makeSignal("export manual process", { workarounds: ["excel"] });
    const s2 = makeSignal("export manual process", { workarounds: ["google-sheets"] });
    const clusters = clusterSignals([s1, s2]);
    const cluster = clusters[0]!;
    expect(cluster.workarounds).toContain("excel");
    expect(cluster.workarounds).toContain("google-sheets");
  });

  it("tracks unique sources", () => {
    const s1 = makeSignal("api integration broken", { source: "reddit" });
    const s2 = makeSignal("api integration broken", { source: "github-issues" });
    const clusters = clusterSignals([s1, s2]);
    expect(clusters[0]?.sources.has("reddit")).toBe(true);
    expect(clusters[0]?.sources.has("github-issues")).toBe(true);
  });
});
