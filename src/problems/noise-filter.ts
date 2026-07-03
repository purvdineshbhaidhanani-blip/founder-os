import { classifyItem } from "./detector.js";
import type { RawResearchItem } from "../research/types.js";

/**
 * Noise filter — a pre-classification pass that screens out raw research
 * items that are structurally NOT user problem signal (tutorials, official
 * docs, product announcements, marketing/SEO listicles, newsletters, event
 * promos) before they ever reach `groupByCategory`. Deterministic substring
 * matching against fixed phrase lists, same philosophy as detector.ts — no
 * LLM call, no invented certainty.
 *
 * This module is intentionally conservative: every noise-list phrase list
 * below exists to catch ONE recognizable document archetype, and a SAFETY
 * VALVE (see `NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE`) guarantees a
 * document is never discarded if it also carries a real, confident problem
 * signal — a "how to fix this annoying bug" post that also contains a
 * genuine complaint must survive.
 */

/** Tutorial/how-to content: instructional, not a problem report. */
const TUTORIAL_PHRASES = ["how to", "step by step", "tutorial", "guide to", "walkthrough"];

/** Official/reference documentation: describes the product, doesn't report a problem with it. */
const DOCUMENTATION_PHRASES = ["official docs", "documentation for", "api reference", "getting started guide"];

/** Product launch/announcement copy: promotional, first-party "look what we shipped" content. */
const ANNOUNCEMENT_PHRASES = [
  "we're excited to announce",
  "introducing",
  "proud to launch",
  "release notes",
  "changelog",
  "now available",
];

/** Marketing/SEO listicle content: written to rank/sell, not to report a real user's problem. */
const MARKETING_PHRASES = ["top 10", "best tools for", "ultimate guide to", "reasons why"];

/** Newsletter/roundup digests: aggregated third-party summaries, not first-person signal. */
const NEWSLETTER_PHRASES = ["this week in", "weekly roundup", "newsletter", "digest"];

/** Event/webinar promotion: calls to attend, not problem reports. */
const EVENT_PHRASES = ["webinar", "join us at", "register now for", "conference"];

/**
 * Every fixed noise-phrase list, keyed by the noise archetype it detects.
 * `noiseType` on the result is the FIRST list (in this object's key order)
 * that matched at least one phrase — reported for explainability when an
 * item happens to match more than one archetype at once.
 */
const NOISE_PHRASE_LISTS: Record<string, string[]> = {
  tutorial: TUTORIAL_PHRASES,
  documentation: DOCUMENTATION_PHRASES,
  "product-launch": ANNOUNCEMENT_PHRASES,
  marketing: MARKETING_PHRASES,
  newsletter: NEWSLETTER_PHRASES,
  events: EVENT_PHRASES,
};

/**
 * A document matching exactly ONE noise-list phrase is only treated as noise
 * if its title is also short/headline-like (<= this many words) — a single
 * incidental phrase match inside a long-form article body (e.g. a bug report
 * that happens to mention "getting started") is not strong enough signal on
 * its own, but a short punchy title alongside one clear noise phrase is
 * typical of marketing/announcement copy.
 */
const SINGLE_MATCH_MARKETING_TITLE_WORD_COUNT_THRESHOLD = 8;

/**
 * A document matching 2+ DISTINCT noise-list phrases (regardless of which
 * list(s) they come from) is noise outright — multiple structural markers
 * of non-problem content is strong enough signal without needing the title
 * heuristic.
 */
const MULTI_MATCH_NOISE_PHRASE_COUNT_THRESHOLD = 2;

/**
 * Safety valve: an item is NEVER marked noise if it also carries a real
 * (non-"other") category match at or above this confidence, even if noise
 * phrases matched — e.g. a tutorial post that also contains a genuine
 * complaint must survive. Exported so other Problem Intelligence Engine
 * modules (e.g. evidence-quality.ts's "problem clarity" heuristic) reuse the
 * exact same threshold rather than redefining a second magic number for the
 * same concept.
 */
export const NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE = 0.55;

function blobOf(item: RawResearchItem): string {
  return `${item.title} ${item.body ?? item.snippet ?? ""}`.toLowerCase();
}

function titleWordCount(title: string): number {
  return title.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

export interface DocumentTypeVerdict {
  isNoise: boolean;
  noiseType?: string;
  reasons: string[];
}

/**
 * Classifies whether a raw research item is structural "noise" (tutorial,
 * docs, announcement, marketing, newsletter, event promo) rather than user
 * problem signal.
 *
 * Rule (documented exactly, no hidden logic):
 *   1. Collect every DISTINCT noise-list phrase that appears in the item's
 *      title+body blob, across all six lists.
 *   2. If 2+ distinct phrases matched -> noise.
 *   3. Else if exactly 1 phrase matched -> noise ONLY IF the title is <= 8
 *      words (SINGLE_MATCH_MARKETING_TITLE_WORD_COUNT_THRESHOLD): a short,
 *      headline-style title alongside one clear noise phrase reads as
 *      marketing/announcement copy; a long title with an incidental match
 *      does not.
 *   4. Else (0 matches) -> not noise.
 *   5. SAFETY VALVE (always applied last): if the item independently
 *      matches a real (non-"other") ClassifiedItem category at confidence
 *      >= NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE, it is never marked
 *      noise, regardless of steps 1-4.
 */
export function classifyDocumentType(item: RawResearchItem): DocumentTypeVerdict {
  const blob = blobOf(item);
  const reasons: string[] = [];

  const matchedPhrases: string[] = [];
  let noiseType: string | undefined;
  for (const [type, phrases] of Object.entries(NOISE_PHRASE_LISTS)) {
    const matched = phrases.filter((phrase) => blob.includes(phrase));
    if (matched.length > 0) {
      if (!noiseType) noiseType = type;
      matchedPhrases.push(...matched);
      reasons.push(`Matched ${type} phrase(s): ${matched.join(", ")}`);
    }
  }

  let isNoise: boolean;
  if (matchedPhrases.length >= MULTI_MATCH_NOISE_PHRASE_COUNT_THRESHOLD) {
    isNoise = true;
    reasons.push(
      `${matchedPhrases.length} distinct noise phrase(s) matched (>= ${MULTI_MATCH_NOISE_PHRASE_COUNT_THRESHOLD}) -> noise.`,
    );
  } else if (matchedPhrases.length === 1) {
    const words = titleWordCount(item.title);
    isNoise = words <= SINGLE_MATCH_MARKETING_TITLE_WORD_COUNT_THRESHOLD;
    reasons.push(
      `1 noise phrase matched; title has ${words} word(s) (threshold <= ${SINGLE_MATCH_MARKETING_TITLE_WORD_COUNT_THRESHOLD}) -> ${
        isNoise ? "noise (short, headline-style title)" : "not noise (long-form title, incidental match)"
      }.`,
    );
  } else {
    isNoise = false;
    reasons.push("No noise-list phrases matched.");
  }

  if (isNoise) {
    const classified = classifyItem(item);
    const realMatch = classified.categories.find(
      (match) => match.category !== "other" && match.confidence >= NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE,
    );
    if (realMatch) {
      isNoise = false;
      noiseType = undefined;
      reasons.push(
        `Safety valve: item also matches real category "${realMatch.category}" at confidence ${realMatch.confidence.toFixed(
          2,
        )} >= ${NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE} — not marked noise despite noise-phrase match(es).`,
      );
    }
  }

  return { isNoise, noiseType, reasons };
}

export interface NoiseFilterResult {
  kept: RawResearchItem[];
  noiseItems: RawResearchItem[];
  noiseCount: number;
}

/**
 * Applies `classifyDocumentType` across a list of raw items, partitioning
 * them into `kept` (survives to category grouping) and `noiseItems`
 * (filtered out). Pure function — called once from
 * `ProblemIntelligenceEngine.analyze`, right after `flattenSessionItems`,
 * before `groupByCategory`.
 */
export function filterNoiseItems(items: RawResearchItem[]): NoiseFilterResult {
  const kept: RawResearchItem[] = [];
  const noiseItems: RawResearchItem[] = [];
  for (const item of items) {
    const verdict = classifyDocumentType(item);
    if (verdict.isNoise) {
      noiseItems.push(item);
    } else {
      kept.push(item);
    }
  }
  return { kept, noiseItems, noiseCount: noiseItems.length };
}
