import { classifyItem } from "./detector.js";
import type { RawResearchItem } from "../research/types.js";
import type { CategoryMatch } from "./types.js";

/**
 * Noise filter — a pre-classification pass that screens out raw research
 * items that are structurally NOT user problem signal (tutorials, official
 * docs, product announcements, marketing/SEO listicles, newsletters, event
 * promos, opinion pieces, pure how-to questions, spam, self-promotional
 * showcases, hiring posts, demo/walkthrough promos) before they ever reach
 * `groupByCategory`. Deterministic substring matching against fixed phrase
 * lists, same philosophy as detector.ts — no LLM call, no invented
 * certainty.
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
 * Loop 6, Part D — six ADDITIONAL noise archetypes, appended after the
 * original six (which are untouched: same phrases, same order, same safety-
 * valve threshold). Each gets the exact same treatment as the original six —
 * counted toward the multi-match/single-match rules below and protected by
 * the SAME safety valve (`NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE`,
 * unchanged) — no new logic branch was needed since `classifyDocumentType`
 * already iterates `NOISE_PHRASE_LISTS` generically.
 */

/** Opinion pieces without a concrete complaint: "in my opinion, X" is a stance, not a problem report. */
const OPINION_PHRASES = ["in my opinion", "i think", "imo", "personally i believe"];

/** Pure how-to questions: asking for help, distinct from tutorial CONTENT (which teaches; this just asks). */
const QUESTION_PHRASES = ["does anyone know how to", "can someone explain", "how do i"];

/** Spam/promotional copy unrelated to any specific product's real problem signal. */
const SPAM_PHRASES = ["click here", "limited time offer", "buy now", "free trial sign up now"];

/** Self-promotional project showcases ("look what I built"), not a problem report about an existing product. */
const SHOWCASE_PHRASES = ["check out my project", "built this over the weekend", "show hn:", "just launched"];

/** Recruiting/job-posting copy. */
const HIRING_PHRASES = ["we're hiring", "join our team", "now recruiting", "open position"];

/** Product-demo/walkthrough promotion — showing off a feature, not reporting a problem with one. */
const DEMO_PHRASES = ["watch this demo", "see it in action", "product walkthrough video"];

/**
 * Every fixed noise-phrase list, keyed by the noise archetype it detects.
 * `noiseType` on the result is the FIRST list (in this object's key order)
 * that matched at least one phrase — reported for explainability when an
 * item happens to match more than one archetype at once. The six Part D
 * entries are appended AFTER the original six, so any item that would have
 * matched one of the original six archetypes first keeps reporting that
 * exact same `noiseType` as before this change (byte-for-byte unchanged
 * behavior for all pre-existing noise types).
 */
const NOISE_PHRASE_LISTS: Record<string, string[]> = {
  tutorial: TUTORIAL_PHRASES,
  documentation: DOCUMENTATION_PHRASES,
  "product-launch": ANNOUNCEMENT_PHRASES,
  marketing: MARKETING_PHRASES,
  newsletter: NEWSLETTER_PHRASES,
  events: EVENT_PHRASES,
  opinion: OPINION_PHRASES,
  question: QUESTION_PHRASES,
  spam: SPAM_PHRASES,
  showcase: SHOWCASE_PHRASES,
  hiring: HIRING_PHRASES,
  demo: DEMO_PHRASES,
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
  /**
   * 0-1, deterministic — see `deriveFilterConfidence` below for the exact
   * formula. Additive sibling of `reasons` (Part 1): expresses HOW confident
   * this isNoise/kept verdict is, not just what it is.
   */
  filterConfidence: number;
  /** Populated only when `isNoise === false`. Explains WHY the item was kept — cites the safety-valve category match, or states no noise phrases matched. */
  keepReason?: string;
  /** Populated only when `isNoise === true`. Cites the matched noise archetype and the specific phrases that triggered it. */
  noiseReason?: string;
}

/**
 * Tiered "how many distinct phrase hits" strength, 0/1/2/3+ -> 0/0.3/0.55/0.8.
 * Mirrors detector.ts's own (private, not exported) `confidenceForMatchCount`
 * tiering verbatim, so this codebase has ONE consistent match-count-to-
 * strength scale rather than two independently-tuned magic-number tables.
 * Duplicated here (rather than imported) only because detector.ts doesn't
 * export it.
 */
function matchCountTierStrength(matchCount: number): number {
  if (matchCount >= 3) return 0.8;
  if (matchCount === 2) return 0.55;
  if (matchCount === 1) return 0.3;
  return 0;
}

/**
 * Deterministic `filterConfidence` derivation (Part 1, additive — does NOT
 * affect `isNoise` itself, which is decided entirely by the existing rule
 * above).
 *
 * Rule, exactly:
 *   1. noiseSignal = matchCountTierStrength(number of distinct noise-list
 *      phrases matched) — 0/0.3/0.55/0.8 for 0/1/2/3+ matches.
 *   2. realSignal = the item's best non-"other" ClassifiedItem category
 *      confidence (0 if it only matched "other").
 *   3. margin = clamp(noiseSignal - realSignal, -1, 1).
 *   4. If the FINAL isNoise === true: filterConfidence = clamp01(0.5 + margin/2).
 *      A strong noise signal with no competing real-category signal pushes
 *      confidence toward 1 (e.g. 3+ phrases, no real match -> 0.5+0.4=0.9).
 *      A borderline single noise-phrase match up against an equally weak
 *      real-category match nets to 0.5 (genuinely ambiguous).
 *   5. If the FINAL isNoise === false: filterConfidence = clamp01(0.5 - margin/2)
 *      — the symmetric mirror. A confident real-category match with zero
 *      noise phrases pushes confidence toward 1 (e.g. realSignal 0.8, no
 *      noise match -> 0.5+0.4=0.9, "high confidence it's a keeper" per the
 *      spec). Zero noise phrases AND zero real-category match (a bland,
 *      unclassified-but-not-noise item) nets to 0.5 — no signal either way.
 *      A safety-valve rescue with a STRONG opposing noise signal can net
 *      below 0.5 even though the item survives — that is intentional: it
 *      flags a genuinely borderline "kept, but noisy" case rather than
 *      claiming false certainty.
 */
function deriveFilterConfidence(params: { isNoise: boolean; noiseSignal: number; realSignal: number }): number {
  const { isNoise, noiseSignal, realSignal } = params;
  const margin = Math.max(-1, Math.min(1, noiseSignal - realSignal));
  const raw = isNoise ? 0.5 + margin / 2 : 0.5 - margin / 2;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Classifies whether a raw research item is structural "noise" (tutorial,
 * docs, announcement, marketing, newsletter, event promo) rather than user
 * problem signal.
 *
 * Rule (documented exactly, no hidden logic):
 *   1. Collect every DISTINCT noise-list phrase that appears in the item's
 *      title+body blob, across all twelve lists (see `NOISE_PHRASE_LISTS`).
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
  let singleMatchTitleWords: number | undefined;
  if (matchedPhrases.length >= MULTI_MATCH_NOISE_PHRASE_COUNT_THRESHOLD) {
    isNoise = true;
    reasons.push(
      `${matchedPhrases.length} distinct noise phrase(s) matched (>= ${MULTI_MATCH_NOISE_PHRASE_COUNT_THRESHOLD}) -> noise.`,
    );
  } else if (matchedPhrases.length === 1) {
    const words = titleWordCount(item.title);
    singleMatchTitleWords = words;
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

  // Always classify once now (previously only inside the isNoise branch, for
  // the safety-valve check) — the SAME classifyItem call is now also reused
  // to derive `filterConfidence`'s realSignal below, so this is still exactly
  // one classification call per item, just no longer conditional.
  const classified = classifyItem(item);
  const bestRealMatch: CategoryMatch | undefined = classified.categories
    .filter((match) => match.category !== "other")
    .reduce<CategoryMatch | undefined>((best, match) => (!best || match.confidence > best.confidence ? match : best), undefined);
  const realSignal = bestRealMatch?.confidence ?? 0;

  let safetyValveRescue: { category: string; confidence: number } | undefined;
  if (isNoise) {
    const realMatch = classified.categories.find(
      (match) => match.category !== "other" && match.confidence >= NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE,
    );
    if (realMatch) {
      isNoise = false;
      noiseType = undefined;
      safetyValveRescue = { category: realMatch.category, confidence: realMatch.confidence };
      reasons.push(
        `Safety valve: item also matches real category "${realMatch.category}" at confidence ${realMatch.confidence.toFixed(
          2,
        )} >= ${NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE} — not marked noise despite noise-phrase match(es).`,
      );
    }
  }

  const noiseSignal = matchCountTierStrength(matchedPhrases.length);
  const filterConfidence = deriveFilterConfidence({ isNoise, noiseSignal, realSignal });

  let keepReason: string | undefined;
  let noiseReason: string | undefined;
  if (isNoise) {
    noiseReason = `Classified as noise (archetype: "${noiseType}"); ${matchedPhrases.length} distinct noise phrase(s) matched: ${matchedPhrases.join(", ")}.`;
  } else if (safetyValveRescue) {
    keepReason = `Kept via safety valve: matches real category "${safetyValveRescue.category}" at confidence ${safetyValveRescue.confidence.toFixed(2)} >= ${NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE}, despite matching a noise-list phrase.`;
  } else if (matchedPhrases.length === 0) {
    keepReason = "No noise-list phrases matched any of the 12 noise archetypes.";
  } else {
    keepReason = `1 noise phrase matched ("${matchedPhrases[0]}") but title has ${singleMatchTitleWords} word(s), above the ${SINGLE_MATCH_MARKETING_TITLE_WORD_COUNT_THRESHOLD}-word single-match threshold — read as long-form content, not noise.`;
  }

  return { isNoise, noiseType, reasons, filterConfidence, keepReason, noiseReason };
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
