import type { RawResearchItem } from "../research/types.js";
import type { CategoryMatch, ClassifiedItem, ProblemCategory } from "./types.js";

/**
 * Fixed keyword/phrase pattern lists per category. Substring matching
 * (`.includes()`) against a lowercased blob of `title` + `body`. These are
 * NOT regexes and NOT an LLM call — deterministic, explainable, and exactly
 * as specified.
 */
const CATEGORY_PATTERNS: Record<
  Exclude<ProblemCategory, "trend" | "other">,
  string[]
> = {
  complaint: [
    "hate",
    "annoying",
    "frustrat",
    "worst",
    "terrible",
    "sucks",
    "awful",
    "disappointing",
    "worst software",
    "so frustrating",
    "this is painful",
    "hate using this",
    "i hate this",
  ],
  "feature-request": [
    "wish it had",
    "would be great if",
    "please add",
    "feature request",
    "can you add",
    "would be nice if",
    "missing feature",
    "i wish it supported",
    "it should have",
    "i really need",
    "would love",
    "should be automatic",
  ],
  bug: [
    "bug",
    "crash",
    " error",
    "doesn't work",
    "not working",
    "broken",
    "glitch",
    "fails to",
    "keeps crashing",
    "always broken",
    "doesn't sync",
    "doesnt sync",
    "fails randomly",
    "timeout",
  ],
  "missing-capability": ["doesn't support", "no way to", "can't find a way", "lacks ", "no option to"],
  "workflow-friction": [
    "tedious",
    "takes too long",
    "so many steps",
    "clunky",
    "hard to use",
    "confusing",
    "friction",
    "takes forever",
    "so many manual steps",
    "too much clicking",
    "i waste hours",
    "this is repetitive",
  ],
  "pricing-complaint": [
    "too expensive",
    "pricing sucks",
    "overpriced",
    "not worth the price",
    "cost too much",
    "price increase",
    "pricing is insane",
    "can't justify paying",
    "not worth $",
    "cancelling because of the price",
    "cancelling because of price",
    "need a cheaper option",
  ],
  migration: [
    "switched from",
    "migrated from",
    "moved away from",
    "left for",
    "switching to",
    "i moved to",
    "i replaced",
    "we migrated away",
    "i'm leaving this tool",
    "im leaving this tool",
    "switched because",
    "the competitor is too expensive",
    "competitor is missing",
    "the alternative isn't good",
    "the alternative isnt good",
  ],
  "looking-for-alternative": [
    "alternative to",
    "looking for alternative",
    "replacement for",
    "any recommendations for",
    "i'm looking for an alternative",
    "im looking for an alternative",
    "i can't find a tool",
    "i cant find a tool",
    "there is no solution",
    "i've searched everywhere",
    "ive searched everywhere",
  ],
  "buying-intent": [
    "willing to pay",
    "would pay for",
    "looking to buy",
    "shut up and take my money",
    "where can i buy",
    "i'd happily pay",
    "id happily pay",
    "i'm ready to buy",
    "im ready to buy",
    "take my money",
    "i'd subscribe",
    "id subscribe",
    "i'd pay monthly",
    "id pay monthly",
    "i'd pay for this",
    "id pay for this",
    // Added in Loop 4 Phase 3 to cover more explicit purchase-intent phrasing
    // that the original 16-phrase list missed (see loop4-final-validation-report.md).
    "i'd switch if",
    "id switch if",
    "we're evaluating",
    "were evaluating",
    "our budget is",
    "sign me up",
    "where do i pay",
    "does this exist yet",
    "i'd pay for this right now",
    "id pay for this right now",
    "need this yesterday",
    "would switch today",
    "budget approved for",
    "looking to purchase",
    "ready to sign a contract",
    "get me a demo",
    "start a trial today",
  ],
  praise: ["love ", "amazing", "great job", "awesome", "best tool", "highly recommend"],
  "market-gap": [
    "why doesn't this exist",
    "why doesnt this exist",
    "someone should build this",
    "i can't find a tool",
    "i cant find a tool",
    "there is no solution",
    "i've searched everywhere",
    "ive searched everywhere",
  ],
  workaround: [
    "i built a spreadsheet",
    "i made my own script",
    "i hacked together",
    "i use notion for this",
    "i copy and paste",
    "i do this manually",
  ],
  "existing-spending": [
    "we already pay",
    "our company spends",
    "we currently use",
    "we pay every month",
    "we have a subscription",
  ],
};

const CATEGORY_ORDER = Object.keys(CATEGORY_PATTERNS) as Array<
  Exclude<ProblemCategory, "trend" | "other">
>;

/**
 * Urgency and emotional-intensity are informational properties attached to
 * every classified item — they never form their own cluster/category, they
 * just ride along on the ClassifiedItem for downstream prioritization.
 */
const URGENCY_PATTERNS = [
  "need this today",
  "asap",
  "critical",
  "blocking our team",
  "we can't ship",
  "we cant ship",
  "must fix",
];

const EMOTIONAL_INTENSITY_PATTERNS = [
  "i'm exhausted",
  "im exhausted",
  "i'm frustrated",
  "im frustrated",
  "drives me crazy",
  "i'm tired of",
  "im tired of",
  "i've given up",
  "ive given up",
  "i hate this",
];

export function detectUrgency(text: string): boolean {
  const blob = text.toLowerCase();
  return URGENCY_PATTERNS.some((p) => blob.includes(p));
}

export function computeEmotionalIntensity(text: string): number {
  const blob = text.toLowerCase();
  const matchCount = EMOTIONAL_INTENSITY_PATTERNS.filter((p) => blob.includes(p)).length;
  if (matchCount >= 3) return 0.8;
  if (matchCount === 2) return 0.55;
  if (matchCount === 1) return 0.3;
  return 0;
}

/** matchCount tiers -> confidence, per spec. */
function confidenceForMatchCount(matchCount: number): number {
  if (matchCount >= 3) return 0.8;
  if (matchCount === 2) return 0.55;
  if (matchCount === 1) return 0.3;
  return 0;
}

function blobOf(item: RawResearchItem): string {
  return `${item.title} ${item.body ?? ""}`.toLowerCase();
}

/**
 * Classifies a single raw research item against every fixed category
 * pattern list. An item can match zero, one, or many categories. Zero
 * matches falls back to a single "other" CategoryMatch at confidence 0.2.
 */
export function classifyItem(item: RawResearchItem): ClassifiedItem {
  const blob = blobOf(item);
  const categories: CategoryMatch[] = [];

  for (const category of CATEGORY_ORDER) {
    const patterns = CATEGORY_PATTERNS[category];
    const matchedPatterns = patterns.filter((pattern) => blob.includes(pattern));
    const matchCount = matchedPatterns.length;
    if (matchCount === 0) continue;
    categories.push({
      category,
      confidence: confidenceForMatchCount(matchCount),
      matchedPatterns,
    });
  }

  if (categories.length === 0) {
    categories.push({ category: "other", confidence: 0.2, matchedPatterns: [] });
  }

  const urgency = detectUrgency(blob);
  const emotionalIntensityScore = computeEmotionalIntensity(blob);

  return { item, categories, urgency, emotionalIntensityScore };
}
