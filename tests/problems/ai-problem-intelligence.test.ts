import { describe, expect, it } from "vitest";
import {
  runAiProblemIntelligence,
  enrichCategoryIntelligence,
  MAX_SYMPTOMS_PER_CLUSTER,
} from "../../src/problems/ai-problem-intelligence.js";
import { classifyItem } from "../../src/problems/detector.js";
import { filterNoiseItems } from "../../src/problems/noise-filter.js";
import { findNearDuplicates, dedupeGroups } from "../../src/problems/near-duplicate.js";
import { computeAverageEvidenceQuality } from "../../src/problems/evidence-quality.js";
import { extractProblemWithConcepts } from "../../src/problems/extractor.js";
import type { RawResearchItem } from "../../src/research/types.js";
import type { ProblemCategory } from "../../src/problems/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

describe("runAiProblemIntelligence (Stage 1 — noise filter, composition)", () => {
  it("produces exactly one enrichedItem record per input item", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "How to get started: a step by step tutorial for beginners" }),
      makeItem({ url: "https://example.com/2", title: "This app keeps crashing every time I open it" }),
      makeItem({ url: "https://example.com/3", title: "Would be great if it supported dark mode" }),
    ];
    const result = runAiProblemIntelligence(items);
    expect(result.enrichedItems).toHaveLength(3);
  });

  it("partitions filteredItems/noiseItems identically to noise-filter.ts's own filterNoiseItems", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/n1", title: "How to get started: a step by step tutorial for beginners" }),
      makeItem({ url: "https://example.com/n2", title: "Official docs: API reference for the SDK" }),
      makeItem({ url: "https://example.com/r1", title: "This app keeps crashing every time I open it" }),
      makeItem({ url: "https://example.com/r2", title: "Would be great if it supported dark mode" }),
    ];
    const aiResult = runAiProblemIntelligence(items);
    const legacyResult = filterNoiseItems(items);

    expect(aiResult.filteredItems.map((i) => i.url)).toEqual(legacyResult.kept.map((i) => i.url));
    expect(aiResult.noiseItems.map((i) => i.url)).toEqual(legacyResult.noiseItems.map((i) => i.url));
    expect(aiResult.totalItemsRejectedAsNoise).toBe(legacyResult.noiseCount);
  });

  it("each enrichedItem.classifiedItem matches detector.ts's own classifyItem output for that item", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "This is so annoying and frustrating", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/2", title: "Willing to pay for a tool that fixes this" }),
    ];
    const result = runAiProblemIntelligence(items);
    for (let i = 0; i < items.length; i += 1) {
      expect(result.enrichedItems[i]!.classifiedItem).toEqual(classifyItem(items[i]!));
    }
  });

  it("every enrichedItem carries a real filterConfidence in [0,1] and exactly one of keepReason/noiseReason", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "Official docs: API reference for the SDK" }),
      makeItem({ url: "https://example.com/2", title: "This is so annoying and frustrating" }),
    ];
    const result = runAiProblemIntelligence(items);
    for (const record of result.enrichedItems) {
      expect(record.filterConfidence).toBeGreaterThanOrEqual(0);
      expect(record.filterConfidence).toBeLessThanOrEqual(1);
      if (record.isNoise) {
        expect(record.noiseReason).toBeDefined();
        expect(record.keepReason).toBeUndefined();
      } else {
        expect(record.keepReason).toBeDefined();
        expect(record.noiseReason).toBeUndefined();
      }
    }
  });

  it("returns everything empty for an empty item list", () => {
    const result = runAiProblemIntelligence([]);
    expect(result).toEqual({ enrichedItems: [], filteredItems: [], noiseItems: [], totalItemsRejectedAsNoise: 0 });
  });
});

describe("enrichCategoryIntelligence (Stage 2 — per-category composition)", () => {
  const category: ProblemCategory = "bug";

  it("every field's VALUE matches directly calling the underlying existing functions (pure composition, no new logic)", () => {
    const duplicateBody =
      "The app crashes every time I try to export data to CSV format and I lose all my unsaved work";
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/d1", title: "Export crashes", body: duplicateBody, sourceId: "reddit", author: "a1" }),
      makeItem({ url: "https://example.com/d2", title: "App crashes on export", body: duplicateBody, sourceId: "hackernews", author: "a2" }),
      makeItem({
        url: "https://example.com/d3",
        title: "Different bug entirely",
        body: "The login page shows a timeout error whenever I try to sign in with SSO enabled",
        sourceId: "reddit",
        author: "a3",
      }),
    ];
    const classifiedItems = items.map((item) => classifyItem(item));

    const intel = enrichCategoryIntelligence(category, classifiedItems);

    // categoryItems is exactly classifiedItems.map(c => c.item)
    expect(intel.categoryItems).toEqual(items);

    // near-duplicate metrics match calling near-duplicate.ts directly.
    const expectedNearDup = findNearDuplicates(items);
    expect(intel.nearDuplicateGroups).toEqual(expectedNearDup.groups);
    expect(intel.duplicateCount).toBe(expectedNearDup.duplicateCount);
    expect(intel.duplicateRatio).toBeCloseTo(expectedNearDup.duplicateCount / items.length, 10);
    expect(intel.duplicateAdjustedEvidenceCount).toBe(dedupeGroups(expectedNearDup.groups).length);

    // evidence quality matches calling evidence-quality.ts directly.
    expect(intel.evidenceQualityScore).toBeCloseTo(computeAverageEvidenceQuality(items), 10);

    // concept/root-cause extraction matches calling extractor.ts directly.
    const expectedExtracted = extractProblemWithConcepts(classifiedItems[0]!, items, category);
    expect(intel.extracted).toEqual(expectedExtracted);
  });

  it("computes symptoms as the deduped union of matchedPatterns across every item, first-encountered order", () => {
    const wfCategory: ProblemCategory = "workflow-friction";
    const itemA = makeItem({ url: "https://example.com/s1", title: "This is so tedious, so many steps, clunky UI" });
    const itemB = makeItem({ url: "https://example.com/s2", title: "So many steps and very confusing, this is repetitive" });
    const classifiedItems = [classifyItem(itemA), classifyItem(itemB)];

    const matchedA = classifiedItems[0]!.categories.find((m) => m.category === wfCategory)?.matchedPatterns ?? [];
    const matchedB = classifiedItems[1]!.categories.find((m) => m.category === wfCategory)?.matchedPatterns ?? [];
    const expectedUnion = [...new Set([...matchedA, ...matchedB])];

    const intel = enrichCategoryIntelligence(wfCategory, classifiedItems);
    expect(intel.symptoms).toEqual(expectedUnion);
    // real overlap exists ("so many steps" matched by both items) -> union is strictly smaller than the sum of both lists.
    expect(intel.symptoms.length).toBeLessThan(matchedA.length + matchedB.length);

    // eslint-disable-next-line no-console
    console.log(`[symptoms example] matchedA=${JSON.stringify(matchedA)}, matchedB=${JSON.stringify(matchedB)}, symptoms=${JSON.stringify(intel.symptoms)}`);
  });

  it("caps symptoms at MAX_SYMPTOMS_PER_CLUSTER when a category's real match-pattern union exceeds the cap", () => {
    const biCategory: ProblemCategory = "buying-intent";
    const bodyA =
      "willing to pay would pay for looking to buy shut up and take my money where can i buy i'd happily pay id happily pay i'm ready to buy im ready to buy take my money";
    const bodyB =
      "i'd subscribe id subscribe i'd pay monthly id pay monthly we're evaluating were evaluating our budget is sign me up where do i pay does this exist yet";
    const itemA = makeItem({ url: "https://example.com/b1", title: "Buying intent A", body: bodyA });
    const itemB = makeItem({ url: "https://example.com/b2", title: "Buying intent B", body: bodyB });
    const classifiedItems = [classifyItem(itemA), classifyItem(itemB)];

    const matchedA = classifiedItems[0]!.categories.find((m) => m.category === biCategory)?.matchedPatterns ?? [];
    const matchedB = classifiedItems[1]!.categories.find((m) => m.category === biCategory)?.matchedPatterns ?? [];
    const unionSize = new Set([...matchedA, ...matchedB]).size;

    // sanity: this fixture's real union genuinely exceeds the cap, so the test proves the cap actually fires.
    expect(unionSize).toBeGreaterThan(MAX_SYMPTOMS_PER_CLUSTER);

    const intel = enrichCategoryIntelligence(biCategory, classifiedItems);
    expect(intel.symptoms).toHaveLength(MAX_SYMPTOMS_PER_CLUSTER);
    for (const symptom of intel.symptoms) {
      expect([...matchedA, ...matchedB]).toContain(symptom);
    }
  });

  it("returns an empty symptoms array for the 'other' category (matchedPatterns is always [] for 'other')", () => {
    const items: RawResearchItem[] = [makeItem({ url: "https://example.com/o1", title: "Quarterly earnings report published today" })];
    const classifiedItems = items.map((item) => classifyItem(item));
    const intel = enrichCategoryIntelligence("other", classifiedItems);
    expect(intel.symptoms).toEqual([]);
  });
});
