import { describe, expect, it } from "vitest";
import { extractCompetitionEvidence } from "../../src/opportunities/competition.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string; title: string }): RawResearchItem {
  return { sourceId: "src", ...overrides };
}

describe("extractCompetitionEvidence", () => {
  it("returns an empty result with competitionScore 1 when no competitor mentions are found", () => {
    const items: RawResearchItem[] = [makeItem({ url: "u1", title: "This tool is great and fast" })];
    const result = extractCompetitionEvidence(items);
    expect(result.competitors).toEqual([]);
    expect(result.competitionScore).toBe(1);
    expect(result.explanation).toContain("No competitor mentions found in evidence");
  });

  it("extracts, tallies, and sorts competitor mentions descending", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "u1", title: "I switched from Trello, love the new tool" }),
      makeItem({ url: "u2", title: "Another user switched from Trello, same story" }),
      makeItem({ url: "u3", title: "Somebody said this is an alternative to Notion, worth trying" }),
    ];

    const result = extractCompetitionEvidence(items);
    expect(result.competitors).toHaveLength(2);
    expect(result.competitors[0]!.name).toBe("Trello");
    expect(result.competitors[0]!.mentionCount).toBe(2);
    expect(result.competitors[0]!.evidenceUrls.sort()).toEqual(["u1", "u2"]);
    expect(result.competitors[1]!.name).toBe("Notion");
    expect(result.competitors[1]!.mentionCount).toBe(1);

    // competitionScore = 1 / (1 + 2) = 0.333...
    expect(result.competitionScore).toBeCloseTo(1 / 3, 5);
    expect(result.explanation).toContain("2 distinct competitor(s)");
  });

  it("discards captures that are purely numeric", () => {
    const items: RawResearchItem[] = [makeItem({ url: "u1", title: "switched from 12345, moving on" })];
    const result = extractCompetitionEvidence(items);
    expect(result.competitors).toEqual([]);
    expect(result.competitionScore).toBe(1);
  });

  it("caps the extracted name at up to two words to avoid capturing trailing sentences", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "u1", title: "We are looking for a replacement for Google Sheets right now" }),
    ];
    const result = extractCompetitionEvidence(items);
    expect(result.competitors).toHaveLength(1);
    expect(result.competitors[0]!.name).toBe("Google Sheets");
  });
});
