import { classifyItem } from "./detector.js";
import { classifyDocumentType } from "./noise-filter.js";
import { computeAverageEvidenceQuality } from "./evidence-quality.js";
import {
  countCrossSourceDuplicateGroups,
  dedupeGroups,
  findNearDuplicates,
  findSemanticDuplicateGroups,
} from "./near-duplicate.js";
import type { SemanticDuplicateGroup } from "./near-duplicate.js";
import { extractProblemWithConcepts } from "./extractor.js";
import type { ConceptAwareExtraction } from "./extractor.js";
import type { RawResearchItem } from "../research/types.js";
import type { ClassifiedItem, ProblemCategory } from "./types.js";

/**
 * "AI Problem Intelligence" — the explicit, separately-addressable pipeline
 * stage between Research and Problems in this codebase's overall
 * architecture (`Research -> AI Problem Intelligence -> Problems -> Founder
 * Intelligence -> Report`). "AI" here means the same thing it has meant
 * throughout `src/problems/` since Loop 1: deterministic, rule-based
 * classification/scoring against fixed, documented thresholds — there is NO
 * LLM call anywhere in this module or anything it composes. Every field this
 * module produces is the VALUE of an already-existing, already-tested
 * function from noise-filter.ts / near-duplicate.ts / evidence-quality.ts /
 * extractor.ts (concept.ts), called here in sequence and assembled into an
 * explicit result shape — this file adds NO new classification/scoring
 * logic of its own.
 *
 * TWO-STAGE DESIGN (documented honestly, not glossed over):
 *
 *   Stage 1 — `runAiProblemIntelligence(items)`: operates on the FULL,
 *   flattened (pre-grouping) item list, exactly where the mission's
 *   architecture diagram places this stage: "after flattenSessionItems,
 *   before groupByCategory". This stage's only real work is noise filtering
 *   (noise-filter.ts) — the one enrichment step that is genuinely
 *   category-agnostic and must run before `groupByCategory` so noise never
 *   gets classified into a category cluster in the first place.
 *
 *   Stage 2 — `enrichCategoryIntelligence(category, classifiedItems)`: the
 *   near-duplicate/semantic-duplicate detection, evidence-quality scoring,
 *   and concept/root-cause extraction. These four things are INHERENTLY
 *   category-scoped in this codebase's existing (Loop 5/6) design — near-
 *   duplicate grouping, evidence quality, and concept extraction all operate
 *   over "this one category's items", not the full cross-category item
 *   list, and engine.ts's hard one-cluster-per-category invariant depends on
 *   that scoping. Computing them globally, pre-`groupByCategory`, would
 *   silently change their output (e.g. two items in DIFFERENT categories
 *   with similar body text would never have been compared before, and
 *   would now be) — a real behavior change forbidden by this loop's
 *   "byte-for-byte identical output" requirement. So this stage necessarily
 *   runs AFTER `groupByCategory`, once per category, called from inside
 *   `engine.ts`'s existing per-category loop — but it is still fully
 *   extracted, explicitly named, reused composition (not scattered inline
 *   calls), which is this Part's actual goal.
 *
 * Both stages together are "AI Problem Intelligence": every enrichment step
 * that runs before a `ProblemCluster` is built now lives in this one file
 * instead of being interleaved with cluster-building logic in engine.ts.
 */

// ---------------------------------------------------------------------------
// Stage 1 — noise filtering (global, pre-groupByCategory).
// ---------------------------------------------------------------------------

export interface EnrichedItemRecord {
  /** The item classified against every category pattern (detector.ts) — same shape `groupByCategory` itself produces per item. */
  classifiedItem: ClassifiedItem;
  isNoise: boolean;
  /** 0-1, deterministic — see noise-filter.ts's `classifyDocumentType` doc for the exact formula. */
  filterConfidence: number;
  keepReason?: string;
  noiseReason?: string;
}

export interface AiProblemIntelligenceResult {
  /** One record per ORIGINAL flattened item (both kept and filtered-as-noise), for full explainability of every verdict made. */
  enrichedItems: EnrichedItemRecord[];
  /**
   * Kept (non-noise) raw items, in original order — feeds `groupByCategory`
   * exactly as `filterNoiseItems(...).kept` did before this refactor.
   * Deliberately typed `RawResearchItem[]` (not `ClassifiedItem[]`) so the
   * untouched `groupByCategory` (clustering.ts), which takes
   * `RawResearchItem[]` and does its own classification internally, can be
   * called with this value completely unchanged — preserving the
   * "groupByCategory called exactly as before this loop" hard constraint.
   */
  filteredItems: RawResearchItem[];
  /** Raw items filtered out as noise, in original order. */
  noiseItems: RawResearchItem[];
  /** `noiseItems.length` — same value `ProblemIntelligenceReport.totalItemsRejectedAsNoise` gets fed. */
  totalItemsRejectedAsNoise: number;
}

/**
 * Stage 1 entry point. Composition, not new logic: for every item, calls
 * `classifyDocumentType` (noise-filter.ts) for the isNoise/filterConfidence/
 * keepReason/noiseReason verdict, and `classifyItem` (detector.ts) for the
 * per-item category classification, then partitions into
 * filteredItems/noiseItems by `verdict.isNoise` — the identical partition
 * `filterNoiseItems` already performs, inlined here in the SAME single pass
 * so the per-item verdict details don't require a second, redundant
 * classification pass over `items`.
 */
export function runAiProblemIntelligence(items: RawResearchItem[]): AiProblemIntelligenceResult {
  const enrichedItems: EnrichedItemRecord[] = [];
  const filteredItems: RawResearchItem[] = [];
  const noiseItems: RawResearchItem[] = [];

  for (const item of items) {
    const verdict = classifyDocumentType(item);
    const classifiedItem = classifyItem(item);

    enrichedItems.push({
      classifiedItem,
      isNoise: verdict.isNoise,
      filterConfidence: verdict.filterConfidence,
      ...(verdict.keepReason !== undefined ? { keepReason: verdict.keepReason } : {}),
      ...(verdict.noiseReason !== undefined ? { noiseReason: verdict.noiseReason } : {}),
    });

    if (verdict.isNoise) {
      noiseItems.push(item);
    } else {
      filteredItems.push(item);
    }
  }

  return { enrichedItems, filteredItems, noiseItems, totalItemsRejectedAsNoise: noiseItems.length };
}

// ---------------------------------------------------------------------------
// Stage 2 — per-category enrichment (near-duplicate, evidence quality,
// concept/root-cause extraction, symptoms). Runs once per category, from
// inside engine.ts's existing groupByCategory loop.
// ---------------------------------------------------------------------------

/**
 * Cap on `ProblemCluster.symptoms` length, for payload size — a category
 * with many distinct matched trigger phrases across many items is capped
 * rather than allowed to grow unbounded. 15 is a reasoned, round ceiling:
 * comfortably larger than any single category's realistic distinct-phrase
 * count in this codebase's fixed pattern lists (the largest,
 * "buying-intent", has ~35 phrases total, but any one cluster's ACTUALLY
 * matched, deduped subset is typically far smaller), while still being a
 * concrete, documented limit rather than "however many happen to match".
 */
export const MAX_SYMPTOMS_PER_CLUSTER = 15;

export interface CategoryIntelligenceResult {
  /** `classifiedItems.map(c => c.item)` — same array engine.ts's own `categoryItems` holds, provided here too so callers that only need this result don't need to re-derive it. */
  categoryItems: RawResearchItem[];
  /** near-duplicate.ts's `findNearDuplicates(categoryItems).groups` — reused below for BOTH the duplicate-adjusted count and the semantic/cross-source metrics, exactly as engine.ts did inline before this refactor. */
  nearDuplicateGroups: RawResearchItem[][];
  duplicateCount: number;
  /** `duplicateCount / categoryItems.length` (0 when categoryItems is empty). */
  duplicateRatio: number;
  /** `dedupeGroups(nearDuplicateGroups).length` — evidence count with near-duplicates collapsed to one representative each. */
  duplicateAdjustedEvidenceCount: number;
  /** evidence-quality.ts's `computeAverageEvidenceQuality(categoryItems)`. */
  evidenceQualityScore: number;
  /** extractor.ts's `extractProblemWithConcepts` result — normalizedStatement/rootCause/conceptBreakdown/dominant concept id+count. */
  extracted: ConceptAwareExtraction;
  /** near-duplicate.ts's `findSemanticDuplicateGroups(nearDuplicateGroups, category)`. */
  semanticDuplicateGroups: SemanticDuplicateGroup[];
  /** near-duplicate.ts's `countCrossSourceDuplicateGroups(nearDuplicateGroups)`. */
  crossSourceDuplicateCount: number;
  /**
   * Union, deduped, of `CategoryMatch.matchedPatterns` (detector.ts) for
   * THIS `category` across every item in `classifiedItems`, capped at
   * `MAX_SYMPTOMS_PER_CLUSTER`. Order is first-encountered-item order (same
   * deterministic, order-stable style used elsewhere in this codebase, e.g.
   * concept.ts's `pickDominantConcept` tie-break). One flatMap+dedupe over
   * `classifiedItems`, which the caller already has in hand — no new item
   * scan.
   */
  symptoms: string[];
}

/**
 * Stage 2 entry point. Composition over near-duplicate.ts / evidence-
 * quality.ts / extractor.ts, called ONCE per category from engine.ts's
 * existing `groupByCategory` loop, with the SAME `classifiedItems` array
 * engine.ts already holds for that category — no new pass over the full,
 * un-grouped item list, and no change to WHICH items are compared to which
 * (same category-scoped inputs as before this refactor).
 */
export function enrichCategoryIntelligence(
  category: ProblemCategory,
  classifiedItems: ClassifiedItem[],
): CategoryIntelligenceResult {
  const categoryItems = classifiedItems.map((classified) => classified.item);

  const { groups: nearDuplicateGroups, duplicateCount } = findNearDuplicates(categoryItems);
  const duplicateAdjustedEvidenceCount = dedupeGroups(nearDuplicateGroups).length;
  const duplicateRatio = categoryItems.length > 0 ? duplicateCount / categoryItems.length : 0;

  const evidenceQualityScore = computeAverageEvidenceQuality(categoryItems);

  const extracted = extractProblemWithConcepts(classifiedItems[0]!, categoryItems, category);

  const semanticDuplicateGroups = findSemanticDuplicateGroups(nearDuplicateGroups, category);
  const crossSourceDuplicateCount = countCrossSourceDuplicateGroups(nearDuplicateGroups);

  const symptoms = [
    ...new Set(
      classifiedItems.flatMap(
        (classified) => classified.categories.find((match) => match.category === category)?.matchedPatterns ?? [],
      ),
    ),
  ].slice(0, MAX_SYMPTOMS_PER_CLUSTER);

  return {
    categoryItems,
    nearDuplicateGroups,
    duplicateCount,
    duplicateRatio,
    duplicateAdjustedEvidenceCount,
    evidenceQualityScore,
    extracted,
    semanticDuplicateGroups,
    crossSourceDuplicateCount,
    symptoms,
  };
}
