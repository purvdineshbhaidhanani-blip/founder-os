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
  complaint: ["hate", "annoying", "frustrat", "worst", "terrible", "sucks", "awful", "disappointing"],
  "feature-request": [
    "wish it had",
    "would be great if",
    "please add",
    "feature request",
    "can you add",
    "would be nice if",
    "missing feature",
  ],
  bug: ["bug", "crash", " error", "doesn't work", "not working", "broken", "glitch", "fails to"],
  "missing-capability": ["doesn't support", "no way to", "can't find a way", "lacks ", "no option to"],
  "workflow-friction": ["tedious", "takes too long", "so many steps", "clunky", "hard to use", "confusing", "friction"],
  "pricing-complaint": [
    "too expensive",
    "pricing sucks",
    "overpriced",
    "not worth the price",
    "cost too much",
    "price increase",
  ],
  migration: ["switched from", "migrated from", "moved away from", "left for", "switching to"],
  "looking-for-alternative": [
    "alternative to",
    "looking for alternative",
    "replacement for",
    "any recommendations for",
  ],
  "buying-intent": [
    "willing to pay",
    "would pay for",
    "looking to buy",
    "shut up and take my money",
    "where can i buy",
  ],
  praise: ["love ", "amazing", "great job", "awesome", "best tool", "highly recommend"],
};

const CATEGORY_ORDER = Object.keys(CATEGORY_PATTERNS) as Array<
  Exclude<ProblemCategory, "trend" | "other">
>;

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

  return { item, categories };
}
