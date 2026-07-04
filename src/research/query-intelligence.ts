import { createLogger } from "../utils/logger.js";

/**
 * Deterministic query-understanding layer that turns a raw founder-typed
 * query string (e.g. "AI SaaS") into a structured search intent, and then
 * into per-source search queries.
 *
 * This module is intentionally standalone/additive: nothing in the existing
 * collection pipeline (`ResearchEngine.run` in engine.ts, or any adapter in
 * `src/research/sources/**`) calls it yet. It performs NO network requests
 * and NO LLM calls — industry/entity detection is a fixed, documented
 * keyword-substring lookup table, the same technique used by
 * `src/problems/concept.ts`'s `CONCEPT_GROUPS` and `src/problems/
 * detector.ts`.
 */

const logger = createLogger("research.query-intelligence");

// ---------------------------------------------------------------------------
// 1. Structured search intent
// ---------------------------------------------------------------------------

export type IndustryConfidence = "high" | "medium" | "low";

export interface StructuredSearchIntent {
  rawQuery: string;
  /** e.g. "AI Software", or the honest fallback "General/Unclassified" when nothing matches. */
  industry: string;
  industryConfidence: IndustryConfidence;
  /** e.g. ["LLM", "AI Tools", "Generative AI", "AI Startup", "AI Automation"] */
  entities: string[];
  /**
   * Fixed vocabulary, intentionally the SAME for every query regardless of
   * industry/entities — this is a deliberate design choice (not a bug/TODO):
   * these are the generic angles a founder always wants covered
   * ("complaints", "pricing", "alternatives", etc.), independent of what
   * product category the query happens to be about.
   */
  searchTerms: string[];
}

/**
 * Fixed, query-independent search-terms vocabulary. Every call to
 * `buildSearchIntent` returns exactly this array (new array instance each
 * time, same contents) — see the field doc above for why this is
 * intentional rather than adaptive.
 */
export const FIXED_SEARCH_TERMS: readonly string[] = [
  "complaints",
  "feature requests",
  "pricing",
  "alternatives",
  "migration",
  "reviews",
  "problems",
  "limitations",
  "pain points",
];

export const GENERAL_UNCLASSIFIED_INDUSTRY = "General/Unclassified";

/**
 * One row per industry trigger. `strongKeywords` cause an immediate
 * `industryConfidence: "high"` match (an unambiguous, exact-ish signal for
 * that industry, e.g. "saas" or "fintech"). `weakKeywords` cause a
 * `industryConfidence: "medium"` match when no strong keyword hit but a
 * weaker/partial one did (a term that's suggestive but could plausibly
 * appear in other contexts too, e.g. "app" alone). Matching is a lowercase
 * substring scan of the raw query, same technique as `CONCEPT_GROUPS` in
 * `src/problems/concept.ts`. Rows are checked in array order; the first row
 * with ANY keyword hit (strong or weak) wins — no attempt to force-fit a
 * query into multiple industries at once.
 *
 * ~10 real startup-relevant industries, each with 3-6 realistic entity
 * terms a founder researching that space would actually search for.
 */
export interface IndustryPattern {
  industry: string;
  strongKeywords: string[];
  weakKeywords: string[];
  entities: string[];
}

export const INDUSTRY_PATTERNS: IndustryPattern[] = [
  {
    industry: "AI Software",
    strongKeywords: ["ai saas", "artificial intelligence", "machine learning", "llm", "generative ai", "chatgpt", "gpt"],
    weakKeywords: ["ai ", " ai", "ml "],
    entities: ["LLM", "AI Tools", "Generative AI", "AI Startup", "AI Automation"],
  },
  {
    industry: "SaaS/Software",
    strongKeywords: ["saas", "software as a service", "b2b software"],
    weakKeywords: ["software", "app", "platform"],
    entities: ["SaaS Platform", "B2B Software", "Cloud Software", "Software Subscription"],
  },
  {
    industry: "E-commerce",
    strongKeywords: ["e-commerce", "ecommerce", "online store", "shopify"],
    weakKeywords: ["retail", "marketplace", "storefront"],
    entities: ["Online Store", "Shopify App", "Marketplace", "Checkout", "Inventory Management"],
  },
  {
    industry: "Fintech",
    strongKeywords: ["fintech", "banking app", "payments platform", "digital wallet"],
    weakKeywords: ["finance", "payments", "banking"],
    entities: ["Digital Wallet", "Payments API", "Neobank", "Lending Platform", "Fraud Detection"],
  },
  {
    industry: "Healthtech",
    strongKeywords: ["healthtech", "telehealth", "digital health", "ehr"],
    weakKeywords: ["health", "medical", "clinic"],
    entities: ["Telehealth Platform", "EHR System", "Patient Portal", "Health App"],
  },
  {
    industry: "Devtools/API",
    strongKeywords: ["devtools", "developer tools", "api platform", "sdk"],
    weakKeywords: ["api", "developer", "cli"],
    entities: ["API Platform", "SDK", "Developer Tools", "CI/CD Tool", "Observability Tool"],
  },
  {
    industry: "Marketing/Martech",
    strongKeywords: ["martech", "marketing automation", "ad platform", "email marketing"],
    weakKeywords: ["marketing", "advertising", "campaign"],
    entities: ["Marketing Automation", "Email Marketing Tool", "Ad Platform", "Analytics Tool", "CRM"],
  },
  {
    industry: "HR/Recruiting",
    strongKeywords: ["recruiting software", "hr software", "applicant tracking", "hris"],
    weakKeywords: ["recruiting", "hiring", "hr "],
    entities: ["Applicant Tracking System", "HRIS", "Recruiting Platform", "Payroll Software"],
  },
  {
    industry: "Productivity/Collaboration",
    strongKeywords: ["productivity app", "team collaboration", "project management tool"],
    weakKeywords: ["productivity", "collaboration", "workflow"],
    entities: ["Project Management Tool", "Team Chat App", "Task Manager", "Collaboration Suite"],
  },
  {
    industry: "Education/Edtech",
    strongKeywords: ["edtech", "e-learning", "online course platform", "lms"],
    weakKeywords: ["education", "learning", "course"],
    entities: ["LMS", "Online Course Platform", "Tutoring App", "Student Portal"],
  },
  {
    industry: "Real Estate/Proptech",
    strongKeywords: ["proptech", "real estate software", "property management software"],
    weakKeywords: ["real estate", "property", "landlord"],
    entities: ["Property Management Software", "Real Estate CRM", "Listing Platform", "Tenant Portal"],
  },
];

/**
 * Maps a raw founder query to a `StructuredSearchIntent`. Matching is a
 * lowercase substring scan over `INDUSTRY_PATTERNS` in array order: the
 * first pattern with a strong-keyword hit wins outright (`"high"`
 * confidence); otherwise the first pattern with a weak-keyword hit wins
 * (`"medium"` confidence); if nothing matches at all, falls back honestly to
 * `GENERAL_UNCLASSIFIED_INDUSTRY` with `"low"` confidence and an empty
 * `entities` list — this function never invents an industry/entity that
 * doesn't fit the query.
 */
export function buildSearchIntent(rawQuery: string): StructuredSearchIntent {
  const lowered = rawQuery.toLowerCase();

  let strongMatch: IndustryPattern | undefined;
  let weakMatch: IndustryPattern | undefined;

  for (const pattern of INDUSTRY_PATTERNS) {
    if (!strongMatch && pattern.strongKeywords.some((kw) => lowered.includes(kw))) {
      strongMatch = pattern;
      break;
    }
    if (!weakMatch && pattern.weakKeywords.some((kw) => lowered.includes(kw))) {
      weakMatch = pattern;
    }
  }

  const matched = strongMatch ?? weakMatch;

  const intent: StructuredSearchIntent = matched
    ? {
        rawQuery,
        industry: matched.industry,
        industryConfidence: strongMatch ? "high" : "medium",
        entities: [...matched.entities],
        searchTerms: [...FIXED_SEARCH_TERMS],
      }
    : {
        rawQuery,
        industry: GENERAL_UNCLASSIFIED_INDUSTRY,
        industryConfidence: "low",
        entities: [],
        searchTerms: [...FIXED_SEARCH_TERMS],
      };

  return intent;
}

// ---------------------------------------------------------------------------
// 2. Source-specific queries
// ---------------------------------------------------------------------------

export interface SourceSpecificQueries {
  github: string[];
  reddit: string[];
  youtube: string[];
  hackernews: string[];
  rss: string[];
}

/**
 * Fixed, per-source "flavor suffix" lists — documented here and nowhere
 * else. Each suffix is appended to an entity (`"${entity} ${suffix}"`) to
 * produce a realistic source-specific search string, e.g. entity "LLM" +
 * GitHub suffix "issues" -> "LLM issues".
 */
export const SOURCE_SUFFIXES: Record<keyof SourceSpecificQueries, string[]> = {
  github: ["issues", "feature requests", "bugs"],
  reddit: ["complaints", "alternatives", "pricing"],
  youtube: ["reviews", "comparison", "problems"],
  hackernews: ["Show HN", "launch", "discussion"],
  rss: ["news", "product updates"],
};

/**
 * Caps the number of queries generated per source. Combination rule is
 * "every (capped) entity x every suffix for that source": with up to 6
 * entities and up to 3 suffixes per source, an uncapped cross product could
 * reach 18 queries for a single source, which is more than a caller
 * realistically wants to issue. Instead, entities are taken in list order
 * (top-N, per `INDUSTRY_PATTERNS`' authored order — no ranking/scoring) and
 * combined with ALL of that source's suffixes, taking the first
 * `MAX_QUERIES_PER_SOURCE` results in entity-major, suffix-minor order. This
 * keeps output bounded and useful rather than combinatorially exploding.
 */
export const MAX_QUERIES_PER_SOURCE = 10;

/**
 * Builds realistic combined query strings per source by crossing
 * `intent.entities` with each source's fixed suffix list (see
 * `SOURCE_SUFFIXES`), capped at `MAX_QUERIES_PER_SOURCE` per source (see
 * that constant's doc for the exact combination/truncation rule). When
 * `intent.entities` is empty (the `GENERAL_UNCLASSIFIED_INDUSTRY` fallback
 * case), every source's query list is empty too — this function never
 * fabricates a query from an industry/entity it doesn't have.
 */
export function buildSourceSpecificQueries(intent: StructuredSearchIntent): SourceSpecificQueries {
  const build = (suffixes: string[]): string[] => {
    const combined: string[] = [];
    for (const entity of intent.entities) {
      for (const suffix of suffixes) {
        combined.push(`${entity} ${suffix}`);
        if (combined.length >= MAX_QUERIES_PER_SOURCE) return combined;
      }
    }
    return combined;
  };

  return {
    github: build(SOURCE_SUFFIXES.github),
    reddit: build(SOURCE_SUFFIXES.reddit),
    youtube: build(SOURCE_SUFFIXES.youtube),
    hackernews: build(SOURCE_SUFFIXES.hackernews),
    rss: build(SOURCE_SUFFIXES.rss),
  };
}

// ---------------------------------------------------------------------------
// 3. Logging entry point
// ---------------------------------------------------------------------------

export interface QueryIntelligenceResult {
  intent: StructuredSearchIntent;
  queries: SourceSpecificQueries;
}

/**
 * Single public entry point: builds the structured intent, derives
 * per-source queries from it, and logs every generated query (one log line
 * per source listing its queries, plus one line for the structured intent
 * itself) via the shared `createLogger` scoped to
 * `"research.query-intelligence"`. Reuses the existing logging mechanism —
 * no new logging path is introduced.
 */
export function generateAndLogQueries(rawQuery: string): QueryIntelligenceResult {
  const intent = buildSearchIntent(rawQuery);
  logger.info("built structured search intent", {
    rawQuery: intent.rawQuery,
    industry: intent.industry,
    industryConfidence: intent.industryConfidence,
    entities: intent.entities,
    searchTerms: intent.searchTerms,
  });

  const queries = buildSourceSpecificQueries(intent);
  for (const source of Object.keys(queries) as Array<keyof SourceSpecificQueries>) {
    logger.info(`generated ${source} queries`, { source, queries: queries[source] });
  }

  return { intent, queries };
}
