import { describe, expect, it } from "vitest";
import { estimateBuildDifficulty } from "../../src/opportunities/difficulty.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string; title: string }): RawResearchItem {
  return { sourceId: "src", ...overrides };
}

describe("estimateBuildDifficulty", () => {
  it("returns tier low with no matched signals when nothing matches", () => {
    const items: RawResearchItem[] = [makeItem({ url: "u1", title: "A simple to-do list app" })];
    const result = estimateBuildDifficulty(items);
    expect(result.tier).toBe("low");
    expect(result.matchedSignals).toEqual([]);
    expect(result.explanation).toContain("heuristic estimate, not an engineering estimate");
    expect(result.explanation).toContain("Tier: low");
  });

  it("returns tier medium for 1-2 distinct matched signals", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "u1", title: "Needs real-time updates and api integration" }),
    ];
    const result = estimateBuildDifficulty(items);
    expect(result.tier).toBe("medium");
    expect(result.matchedSignals.sort()).toEqual(["api integration", "real-time"]);
  });

  it("returns tier high for 3+ distinct matched signals, counting duplicates only once", () => {
    const items: RawResearchItem[] = [
      makeItem({
        url: "u1",
        title: "Needs api integration, api integration everywhere, real-time sync",
        body: "Also requires enterprise compliance and encryption",
      }),
    ];
    const result = estimateBuildDifficulty(items);
    expect(result.tier).toBe("high");
    expect(result.matchedSignals).toContain("api integration");
    expect(result.matchedSignals).toContain("real-time");
    expect(result.matchedSignals).toContain("enterprise");
    expect(result.matchedSignals).toContain("compliance");
    expect(result.matchedSignals).toContain("encryption");
    // distinct count, "api integration" mentioned twice counts once
    expect(result.matchedSignals.filter((s) => s === "api integration")).toHaveLength(1);
  });

  it("combines signals across all items into one blob", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "u1", title: "Needs a mobile app" }),
      makeItem({ url: "u2", title: "Also needs a native app and encryption" }),
    ];
    const result = estimateBuildDifficulty(items);
    expect(result.matchedSignals.sort()).toEqual(["encryption", "mobile app", "native app"].sort());
    expect(result.tier).toBe("high");
  });
});
