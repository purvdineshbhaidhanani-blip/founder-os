import { describe, it, expect } from "vitest";
import { OpportunityStore } from "../../src/opportunity/opportunity-store.js";
import type { SignalCluster } from "../../src/opportunity/repetition-engine.js";
import type { Signal, CollectedItem } from "../../src/opportunity/types.js";

function makeCluster(overrides: Partial<SignalCluster> = {}): SignalCluster {
  const sig: Signal = {
    id: "sig-1",
    itemId: "item-1",
    source: "reddit",
    type: "complaint",
    summary: "Export is broken, manual workaround required",
    rawQuote: "We have to manually export to Excel every day",
    workarounds: ["excel"],
    buyingIntent: true,
    buyingIntentEvidence: "would gladly pay",
    category: "saas",
    extractedAt: new Date().toISOString(),
  };
  return {
    clusterKey: "saas:export_broken_manual_excel",
    label: "Export is broken, manual workaround required",
    signals: [sig],
    workarounds: ["excel"],
    buyingIntentCount: 1,
    sources: new Set(["reddit"]),
    ...overrides,
  };
}

function makeItem(id = "item-1"): CollectedItem {
  return {
    id,
    source: "reddit",
    url: "https://reddit.com/r/test/1",
    author: "user",
    timestamp: new Date().toISOString(),
    language: "en",
    category: "saas",
    rawContent: "Export broken, using Excel workaround",
    context: "test",
    engagement: { votes: 42, replies: 5 },
    metadata: {},
    collectedAt: new Date().toISOString(),
  };
}

describe("OpportunityStore", () => {
  it("creates opportunity from cluster", () => {
    const store = new OpportunityStore();
    const opp = store.upsert(makeCluster(), [makeItem()]);
    expect(opp.id).toMatch(/^opp_/);
    expect(opp.status).toBe("discovered");
    expect(opp.buyingIntentSignals).toBe(1);
    expect(opp.workaroundsDetected).toContain("excel");
  });

  it("merges evidence on second upsert of same cluster", () => {
    const store = new OpportunityStore();
    const cluster = makeCluster();
    store.upsert(cluster, [makeItem()]);

    const sig2: Signal = {
      id: "sig-2",
      itemId: "item-2",
      source: "github-issues",
      type: "missing-feature",
      summary: "Export is broken, manual workaround required",
      rawQuote: "No export API available",
      workarounds: ["custom-scripts"],
      buyingIntent: false,
      category: "saas",
      extractedAt: new Date().toISOString(),
    };
    const cluster2: SignalCluster = {
      ...cluster,
      signals: [cluster.signals[0]!, sig2],
      workarounds: ["excel", "custom-scripts"],
      buyingIntentCount: 1,
      sources: new Set(["reddit", "github-issues"]),
    };
    const merged = store.upsert(cluster2, [makeItem(), makeItem("item-2")]);

    expect(merged.signalCount).toBe(2);
    expect(merged.workaroundsDetected).toContain("custom-scripts");
    expect(store.size()).toBe(1); // still one opportunity
  });

  it("lists opportunities sorted by quality", () => {
    const store = new OpportunityStore();
    const cluster1 = makeCluster({ clusterKey: "key-1", label: "Low signal", buyingIntentCount: 0 });
    const cluster2 = makeCluster({ clusterKey: "key-2", label: "High signal", buyingIntentCount: 5 });
    store.upsert(cluster1, [makeItem()]);
    store.upsert(cluster2, [makeItem()]);

    const list = store.list();
    expect(list[0]?.clusterKey).toBe("key-2");
  });

  it("toJSON produces plain objects", () => {
    const store = new OpportunityStore();
    store.upsert(makeCluster(), [makeItem()]);
    const json = store.toJSON();
    expect(Array.isArray(json)).toBe(true);
    expect(json[0]).toHaveProperty("id");
    expect(Array.isArray(json[0]?.sources)).toBe(true);
  });
});
