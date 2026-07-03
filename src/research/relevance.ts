import { createLogger } from "../utils/logger.js";
import type { Opportunity } from "./types.js";

const logger = createLogger("research.relevance");

/**
 * Deterministic keyword/phrase-pattern relevance filter. Same technique as
 * `src/problems/detector.ts`'s `classifyItem`: fixed phrase lists,
 * lowercased substring `.includes()` matching, an auditable explanation
 * string. NOT an LLM call — this module has zero dependency on any external
 * AI/LLM API and zero dependency on `src/problems/**` or
 * `src/opportunities/**` (the phrase lists below are hand-written for this
 * module, not imported from either).
 */

export type RelevanceDecision = "relevant" | "not-relevant" | "uncertain";
export type RelevanceThreshold = "strict" | "normal" | "lenient";

export interface RelevanceResult {
  decision: RelevanceDecision;
  reasons: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  evidenceCount: number;
}

export interface RelevanceFilterOutcome {
  kept: Opportunity[];
  rejected: Array<{ opportunity: Opportunity; result: RelevanceResult }>;
  threshold: RelevanceThreshold;
  totalEvaluated: number;
  relevantCount: number;
  uncertainCount: number;
  notRelevantCount: number;
}

/**
 * Positive signal phrase lists, keyed by category. Each list is a set of
 * lowercase substring trigger phrases. A category "matches" an opportunity
 * if ANY of its phrases appear in the opportunity's combined lowercased
 * text. `positiveScore` (see `evaluateRelevance`) counts distinct matched
 * CATEGORIES (0-14), not raw phrase-match count.
 */
const POSITIVE_PATTERNS: Record<string, string[]> = {
  "business-pain": [
    "costing us",
    "losing money",
    "wasting hours",
    "manual process",
    "no good solution",
    "eating into our margin",
    "burning cash on",
    "bleeding money",
    "hurting our revenue",
    "this is killing our team",
    "we're losing customers because",
    "cutting into our profit",
    "this problem costs us",
    "our team wastes",
    "draining our budget",
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
    "i really need a way to",
    "would love an option to",
    "can someone build",
    "hoping for an update that",
    "requesting support for",
  ],
  complaint: [
    "this is so frustrating",
    "hate using this tool",
    "worst experience",
    "terrible workflow",
    "constantly annoyed by",
    "keeps failing on us",
    "so disappointing to use",
    "awful process every time",
    "sick of dealing with",
    "fed up with this tool",
    "drives our team crazy",
    "painful every single time",
  ],
  "looking-for-alternative": [
    "looking for an alternative to",
    "any recommendations for a tool",
    "replacement for our current",
    "searching for a better tool",
    "does anyone know a good alternative",
    "trying to find a tool that",
    "what do you use instead of",
    "need to switch away from",
    "shopping for a new vendor",
    "evaluating alternatives to",
    "in the market for a tool",
  ],
  "manual-workaround": [
    "we built a spreadsheet for this",
    "i made my own script to",
    "hacked together a workaround",
    "we do this manually every",
    "i copy and paste this into",
    "we track this in a google sheet",
    "duct-taped a solution together",
    "cobbled together our own process",
    "our workaround is to",
    "manually stitching this together",
    "this is a temporary workaround",
  ],
  "high-frustration": [
    "i'm exhausted by",
    "i'm so tired of dealing with",
    "this is driving me crazy",
    "i've given up trying to",
    "at my wit's end with",
    "this is unbearable",
    "i can't take this anymore",
    "beyond frustrated with",
    "our team is burned out from",
    "this makes me want to scream",
  ],
  "buying-intent": [
    "willing to pay for",
    "would pay for a tool that",
    "shut up and take my money",
    "id happily pay for this",
    "we're ready to buy",
    "take my money",
    "id subscribe immediately",
    "our budget is approved for",
    "we're evaluating vendors for",
    "sign me up for this",
    "ready to sign a contract for",
    "get me a demo of this",
    "start a trial today for",
    "need this yesterday and will pay",
  ],
  "product-request": [
    "someone should build a tool for",
    "why doesn't a product exist for",
    "there's no product that does",
    "i'd use a product that",
    "wish there was an app for",
    "someone needs to build this",
    "this should be a saas product",
    "a tool for this would sell",
    "surprised nobody has built this",
  ],
  "automation-need": [
    "we need to automate this",
    "should be automatic",
    "manually triggering this every time",
    "automate this workflow",
    "no way to automate this",
    "this needs to run automatically",
    "we automate everything except this",
    "looking to automate our",
    "eliminate this manual step",
  ],
  "time-waste": [
    "wasting hours on",
    "takes forever to do",
    "eats up our whole day",
    "hours every week just to",
    "this takes way too long",
    "so much time lost doing",
    "burns half our day on",
    "we lose hours every week to",
    "time we could spend elsewhere",
  ],
  "repeated-workflow": [
    "every single week we have to",
    "every month we manually",
    "this repetitive task",
    "same tedious steps every time",
    "we do this over and over",
    "recurring process that",
    "every sprint we repeat",
    "day after day we redo",
    "this happens every billing cycle",
  ],
  "b2b-problem": [
    "our sales team struggles with",
    "our support team is overwhelmed by",
    "across our whole company",
    "our entire org deals with",
    "our clients keep asking about",
    "internal tooling problem",
    "our ops team manually",
    "enterprise workflow is broken",
    "our finance team spends hours",
  ],
  "creator-workflow": [
    "editing my videos takes",
    "scheduling posts is a nightmare",
    "managing my content calendar",
    "my audience keeps asking for",
    "creator burnout from",
    "juggling multiple platforms to post",
    "repurposing content across channels",
    "my newsletter workflow is",
    "uploading to every platform manually",
  ],
  "founder-workflow": [
    "as a solo founder i",
    "running my startup i have to",
    "bootstrapping and manually",
    "our founding team spends hours",
    "as a small team we manually",
    "our startup workflow for",
    "as an early-stage founder",
    "juggling investor updates and",
    "founder-led sales workflow",
  ],
};

const POSITIVE_CATEGORY_ORDER = Object.keys(POSITIVE_PATTERNS);

/**
 * Negative signal phrase lists — content that is off-topic for a
 * business/product opportunity, even if it happens to contain a stray word
 * that overlaps a positive category.
 */
const NEGATIVE_PATTERNS: Record<string, string[]> = {
  politics: [
    "election",
    "senator",
    "president",
    "congress",
    "the president said",
    "political party",
    "voters",
    "campaign trail",
    "impeachment",
    "supreme court ruling",
    "parliament",
    "prime minister",
    "government shutdown",
    "partisan",
  ],
  sports: [
    "touchdown",
    "world cup",
    "final score",
    "the referee",
    "playoffs",
    "championship game",
    "the coach announced",
    "home run",
    "olympic medal",
    "transfer window",
    "the match ended",
    "season opener",
  ],
  celebrity: [
    "red carpet",
    "breakup",
    "divorce announcement",
    "celebrity couple",
    "paparazzi",
    "reality tv star",
    "engagement ring reveal",
    "award show",
    "the actor revealed",
    "the singer announced",
    "tabloid",
    "gossip column",
  ],
  "memes-viral": [
    "went viral",
    "internet meme",
    "trending on tiktok",
    "the meme format",
    "viral tweet",
    "this meme is",
    "viral video of",
    "the internet can't stop laughing",
    "broke the internet",
    "viral challenge",
  ],
  "general-opinion-news": [
    "in unrelated news",
    "breaking news today",
    "weather forecast",
    "traffic update",
    "local news report",
    "just my opinion but",
    "unpopular opinion",
    "hot take of the day",
    "random thought for the day",
    "general life update",
  ],
  "stock-crypto": [
    "stock price surged",
    "crypto pump",
    "bitcoin price",
    "to the moon",
    "hodl",
    "nft drop",
    "altcoin season",
    "the stock market today",
    "shares rallied",
    "day trading gains",
    "meme coin",
    "crypto crash",
  ],
  "ai-hype-no-business": [
    "ai will change everything",
    "the future of ai",
    "ai is taking over",
    "ai is coming for",
    "singularity is near",
    "ai will replace us all",
    "is ai going to take my job",
    "ai is the future of humanity",
    "artificial general intelligence will",
    "ai apocalypse",
    "ai is so cool",
    "just played with the new ai model",
  ],
};

const NEGATIVE_CATEGORY_ORDER = Object.keys(NEGATIVE_PATTERNS);

function blobOf(opportunity: Opportunity): string {
  const supporting = opportunity.supportingItems
    .map((item) => `${item.snippet ?? ""} ${item.body ?? ""}`)
    .join(" ");
  return `${opportunity.title} ${opportunity.summary} ${supporting}`.toLowerCase();
}

/** Distinct matched category names, in fixed declaration order, not a raw phrase-match count. */
function matchedCategories(blob: string, patterns: Record<string, string[]>, order: string[]): string[] {
  const matched: string[] = [];
  for (const category of order) {
    const phrases = patterns[category] ?? [];
    if (phrases.some((phrase) => blob.includes(phrase))) matched.push(category);
  }
  return matched;
}

/**
 * Evaluates a single opportunity against the fixed positive/negative phrase
 * lists and produces a deterministic, auditable relevance decision.
 *
 * Decision logic (in priority order):
 *  1. negativeScore > 0 AND negativeScore >= positiveScore -> "not-relevant"
 *     (negative signal present and not clearly outweighed by positive signal).
 *  2. positiveScore >= 2 -> "relevant" (at least two independent positive
 *     categories corroborate each other).
 *  3. positiveScore === 1 AND negativeScore === 0 -> threshold-dependent:
 *     "strict" treats a single, uncorroborated positive category as
 *     "uncertain"; "normal"/"lenient" treat it as "relevant".
 *  4. Otherwise (positiveScore === 0, negativeScore === 0) -> "uncertain".
 */
export function evaluateRelevance(
  opportunity: Opportunity,
  threshold: RelevanceThreshold = "normal",
): RelevanceResult {
  const blob = blobOf(opportunity);
  const positiveSignals = matchedCategories(blob, POSITIVE_PATTERNS, POSITIVE_CATEGORY_ORDER);
  const negativeSignals = matchedCategories(blob, NEGATIVE_PATTERNS, NEGATIVE_CATEGORY_ORDER);
  const positiveScore = positiveSignals.length;
  const negativeScore = negativeSignals.length;

  const reasons: string[] = [];
  let decision: RelevanceDecision;

  if (negativeScore > 0 && negativeScore >= positiveScore) {
    decision = "not-relevant";
    reasons.push(
      `${negativeScore} negative signal categor${negativeScore === 1 ? "y" : "ies"} matched (${negativeSignals.join(", ")})`,
    );
    reasons.push(
      positiveScore > 0
        ? `negative signal count (${negativeScore}) outweighs or matches positive signal count (${positiveScore}) -> rule "negativeScore >= positiveScore" fired`
        : `no positive signal found to offset the negative signal(s) -> rule "negativeScore >= positiveScore" fired`,
    );
  } else if (positiveScore >= 2) {
    decision = "relevant";
    reasons.push(
      `${positiveScore} positive signal categories matched (${positiveSignals.join(", ")}) -> rule "positiveScore >= 2" fired`,
    );
    reasons.push(negativeScore === 0 ? "no negative signals found" : `${negativeScore} negative signal(s) present but outweighed by positive signal count`);
  } else if (positiveScore === 1 && negativeScore === 0) {
    decision = threshold === "strict" ? "uncertain" : "relevant";
    reasons.push(
      `exactly 1 positive signal category matched (${positiveSignals[0]}), no negative signals -> rule "positiveScore === 1 && negativeScore === 0" fired`,
    );
    reasons.push(
      threshold === "strict"
        ? `threshold "strict" treats a single uncorroborated positive category as uncertain`
        : `threshold "${threshold}" treats a single uncorroborated positive category as relevant`,
    );
  } else {
    decision = "uncertain";
    reasons.push("no positive or negative signal categories matched -> insufficient evidence to decide");
  }

  return {
    decision,
    reasons,
    positiveSignals,
    negativeSignals,
    evidenceCount: opportunity.supportingItems.length,
  };
}

/** Per-decision policy for what gets KEPT at each threshold. */
function shouldKeep(
  result: RelevanceResult,
  threshold: RelevanceThreshold,
): boolean {
  if (threshold === "strict") {
    return result.decision === "relevant";
  }
  if (threshold === "lenient") {
    return result.negativeSignals.length < 2;
  }
  // normal (default)
  return result.decision === "relevant" || result.decision === "uncertain";
}

export function filterOpportunitiesByRelevance(
  opportunities: Opportunity[],
  threshold: RelevanceThreshold = "normal",
): RelevanceFilterOutcome {
  const kept: Opportunity[] = [];
  const rejected: Array<{ opportunity: Opportunity; result: RelevanceResult }> = [];

  let relevantCount = 0;
  let uncertainCount = 0;
  let notRelevantCount = 0;

  for (const opportunity of opportunities) {
    const result = evaluateRelevance(opportunity, threshold);

    if (result.decision === "relevant") relevantCount += 1;
    else if (result.decision === "uncertain") uncertainCount += 1;
    else notRelevantCount += 1;

    if (shouldKeep(result, threshold)) {
      kept.push(opportunity);
    } else {
      rejected.push({ opportunity, result });
    }
  }

  return {
    kept,
    rejected,
    threshold,
    totalEvaluated: opportunities.length,
    relevantCount,
    uncertainCount,
    notRelevantCount,
  };
}

const VALID_THRESHOLDS: RelevanceThreshold[] = ["strict", "normal", "lenient"];

/**
 * Resolves the active relevance threshold from `RELEVANCE_FILTER_THRESHOLD`
 * (case-insensitive `strict`/`normal`/`lenient`). Defaults to `"normal"`
 * when unset; logs a warning and falls back to `"normal"` on any other
 * invalid value, mirroring `resolveSecret` in `src/server/session.ts` and
 * `resolveGoogleRedirectUri` in `src/server/routes/auth.ts`'s
 * "sensible default, explicit override" env-var resolution pattern.
 */
export function resolveRelevanceThreshold(): RelevanceThreshold {
  const raw = process.env.RELEVANCE_FILTER_THRESHOLD;
  if (!raw || raw.length === 0) return "normal";
  const normalized = raw.toLowerCase() as RelevanceThreshold;
  if (VALID_THRESHOLDS.includes(normalized)) return normalized;
  logger.warn(
    `RELEVANCE_FILTER_THRESHOLD="${raw}" is not one of strict/normal/lenient — falling back to "normal".`,
  );
  return "normal";
}
