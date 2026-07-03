import type { ProblemCategory } from "./types.js";
import type { RawResearchItem } from "../research/types.js";

/**
 * Sub-concept extraction — the layer that makes a single category's cluster
 * "sub-concept-aware" without ever splitting it into multiple clusters (see
 * the hard one-cluster-per-category constraint documented in engine.ts).
 *
 * A "concept group" is a finer-grained pattern WITHIN one ProblemCategory
 * (e.g. within `pricing-complaint`, "pricing is too expensive" is a
 * different sub-concept than "a price increase drove me away"). Concept
 * groups are fixed, small, and reuse a fixed root-cause taxonomy so the
 * output is always drawn from a bounded, explainable vocabulary — never
 * free-form generated text.
 */

/** Fixed, small, reused root-cause taxonomy — every concept group maps to exactly one of these. */
export type RootCause =
  | "Poor UX"
  | "Pricing Friction"
  | "Manual Process"
  | "Missing Integration"
  | "Reliability/Bugs"
  | "Support Gap"
  | "Onboarding Friction"
  | "Performance"
  | "Lack of Automation"
  | "Vendor Lock-in";

export interface ConceptGroup {
  id: string;
  category: ProblemCategory;
  triggerPhrases: string[];
  canonicalStatement: string;
  rootCause: RootCause;
}

/**
 * Fixed concept groups, ~20 total, spanning the realistic subset of
 * ProblemCategory values that actually carry founder-actionable nuance
 * (praise/trend/other are intentionally excluded — they don't decompose
 * into "root causes" the way a complaint or feature request does). Order
 * within a category matters: `extractConcept` returns the FIRST group (in
 * this array's order) whose trigger phrase matches, so more specific groups
 * are listed before more generic ones within the same category.
 */
export const CONCEPT_GROUPS: ConceptGroup[] = [
  // -- workflow-friction ---------------------------------------------------
  {
    id: "time-consuming-manual-work",
    category: "workflow-friction",
    triggerPhrases: ["takes forever", "too many clicks", "manual work", "slow workflow", "time-consuming", "spend hours", "tedious"],
    canonicalStatement: "Manual, repetitive workflow is time-consuming.",
    rootCause: "Manual Process",
  },
  {
    id: "clunky-many-steps",
    category: "workflow-friction",
    // Distinct from time-consuming-manual-work: this is about STEP COUNT / UI clunkiness, not raw time spent.
    triggerPhrases: ["so many steps", "clunky", "confusing", "friction", "so many manual steps", "too much clicking"],
    canonicalStatement: "Workflow is clunky and requires too many steps.",
    rootCause: "Poor UX",
  },

  // -- pricing-complaint ----------------------------------------------------
  {
    id: "automation-too-expensive",
    category: "pricing-complaint",
    // The mission's own canonical example: "Zapier expensive" / "can't afford Zapier" / "automation costs too much".
    triggerPhrases: ["too expensive", "can't afford", "costs too much", "pricing is too high", "overpriced"],
    canonicalStatement: "Automation/tooling pricing is too expensive for the value delivered.",
    rootCause: "Pricing Friction",
  },
  {
    id: "price-increase-backlash",
    category: "pricing-complaint",
    // Distinct from automation-too-expensive: this is a REACTION to a pricing CHANGE, not a static "it's expensive" complaint.
    triggerPhrases: ["price increase", "pricing is insane", "cancelling because of the price", "cancelling because of price", "not worth the price"],
    canonicalStatement: "A pricing change or price increase is driving users away.",
    rootCause: "Pricing Friction",
  },

  // -- complaint -------------------------------------------------------------
  {
    id: "poor-ux-hard-to-learn",
    category: "complaint",
    triggerPhrases: ["hard to learn", "confusing interface", "steep learning curve", "not intuitive", "hard to use"],
    canonicalStatement: "Poor UX makes the product hard to learn or use.",
    rootCause: "Poor UX",
  },
  {
    id: "general-frustration",
    category: "complaint",
    // Catch-all emotional-complaint sub-concept for items that don't cite a specific UX cause.
    triggerPhrases: ["so frustrating", "this is painful", "hate using this", "terrible", "awful"],
    canonicalStatement: "Users express strong general frustration with the product.",
    rootCause: "Poor UX",
  },

  // -- feature-request --------------------------------------------------------
  {
    id: "missing-integration",
    category: "feature-request",
    triggerPhrases: ["doesn't integrate with", "no integration for", "wish it connected to", "need an integration"],
    canonicalStatement: "Users need an integration this product lacks.",
    rootCause: "Missing Integration",
  },
  {
    id: "automation-feature-request",
    category: "feature-request",
    // Distinct from missing-integration: requesting the product DO something automatically, not connect to a third party.
    triggerPhrases: ["should be automatic", "would love", "would be great if", "would be nice if"],
    canonicalStatement: "Users are requesting the product automate a manual step.",
    rootCause: "Lack of Automation",
  },

  // -- bug ----------------------------------------------------------------------
  {
    id: "unreliable-buggy",
    category: "bug",
    triggerPhrases: ["keeps crashing", "breaks constantly", "unreliable", "buggy", "randomly fails"],
    canonicalStatement: "The product is unreliable / frequently broken.",
    rootCause: "Reliability/Bugs",
  },
  {
    id: "sync-timeout-failures",
    category: "bug",
    // Distinct sub-concept: sync/timeout failures point at backend/infra performance, not general flakiness.
    triggerPhrases: ["doesn't sync", "doesnt sync", "fails randomly", "timeout"],
    canonicalStatement: "The product fails to sync or times out under normal use.",
    rootCause: "Performance",
  },

  // -- missing-capability ---------------------------------------------------
  {
    id: "no-way-to-accomplish-task",
    category: "missing-capability",
    triggerPhrases: ["no way to", "can't find a way", "no option to"],
    canonicalStatement: "Users report there's no way to accomplish a specific task in the product.",
    rootCause: "Missing Integration",
  },
  {
    id: "product-lacks-capability",
    category: "missing-capability",
    triggerPhrases: ["doesn't support", "lacks "],
    canonicalStatement: "The product structurally lacks a capability users need.",
    rootCause: "Lack of Automation",
  },

  // -- migration ------------------------------------------------------------
  {
    id: "switched-due-to-price-or-gap",
    category: "migration",
    triggerPhrases: ["the competitor is too expensive", "switched because", "competitor is missing"],
    canonicalStatement: "Users switched providers due to pricing or a capability gap.",
    rootCause: "Pricing Friction",
  },
  {
    id: "migrated-away-entirely",
    category: "migration",
    triggerPhrases: ["switched from", "migrated from", "moved away from", "left for", "i moved to", "i replaced"],
    canonicalStatement: "Users migrated away from this product/category entirely.",
    rootCause: "Support Gap",
  },

  // -- looking-for-alternative ------------------------------------------------
  {
    id: "seeking-alternative",
    category: "looking-for-alternative",
    triggerPhrases: ["alternative to", "looking for alternative", "replacement for", "any recommendations for", "i'm looking for an alternative", "im looking for an alternative"],
    canonicalStatement: "Users are actively seeking an alternative solution.",
    rootCause: "Vendor Lock-in",
  },
  {
    id: "no-good-alternative-found",
    category: "looking-for-alternative",
    triggerPhrases: ["i can't find a tool", "i cant find a tool", "there is no solution", "i've searched everywhere", "ive searched everywhere"],
    canonicalStatement: "Users searched extensively but found no adequate alternative.",
    rootCause: "Missing Integration",
  },

  // -- buying-intent ----------------------------------------------------------
  {
    id: "ready-to-pay",
    category: "buying-intent",
    triggerPhrases: ["willing to pay", "would pay for", "take my money", "i'd happily pay", "id happily pay", "shut up and take my money"],
    canonicalStatement: "Users explicitly express willingness to pay for a solution.",
    rootCause: "Lack of Automation",
  },

  // -- market-gap -----------------------------------------------------------
  {
    id: "why-doesnt-this-exist",
    category: "market-gap",
    triggerPhrases: ["why doesn't this exist", "why doesnt this exist", "someone should build this"],
    canonicalStatement: "Users believe no product exists yet for a clear need.",
    rootCause: "Missing Integration",
  },

  // -- workaround -------------------------------------------------------------
  {
    id: "manual-workaround-built",
    category: "workaround",
    triggerPhrases: ["i built a spreadsheet", "i made my own script", "i hacked together", "i copy and paste", "i do this manually"],
    canonicalStatement: "Users built a manual workaround (spreadsheet/script) because no product solves this.",
    rootCause: "Manual Process",
  },

  // -- existing-spending -------------------------------------------------------
  {
    id: "already-paying-competitor",
    category: "existing-spending",
    triggerPhrases: ["we already pay", "our company spends", "we currently use", "we pay every month", "we have a subscription"],
    canonicalStatement: "Users already have budget allocated to a related paid solution.",
    rootCause: "Vendor Lock-in",
  },
];

function blobOf(item: RawResearchItem): string {
  return `${item.title} ${item.body ?? item.snippet ?? ""}`.toLowerCase();
}

export interface ExtractedConcept {
  conceptId: string;
  canonicalStatement: string;
  rootCause: RootCause;
}

/**
 * Matches a single item's title+body against the concept groups registered
 * for `category` (in `CONCEPT_GROUPS` order — first match wins). Returns
 * `null` when no concept group's trigger phrase is found, so callers always
 * have a safe fallback path to the category-level canonical statement
 * (`extractProblem` in extractor.ts) — no document is ever left without
 * SOME normalized statement.
 */
export function extractConcept(item: RawResearchItem, category: ProblemCategory): ExtractedConcept | null {
  const blob = blobOf(item);
  for (const group of CONCEPT_GROUPS) {
    if (group.category !== category) continue;
    if (group.triggerPhrases.some((phrase) => blob.includes(phrase))) {
      return { conceptId: group.id, canonicalStatement: group.canonicalStatement, rootCause: group.rootCause };
    }
  }
  return null;
}

export interface ConceptBreakdownEntry extends ExtractedConcept {
  count: number;
}

export interface DominantConceptResult {
  dominant: ConceptBreakdownEntry | null;
  breakdown: ConceptBreakdownEntry[];
}

/**
 * Runs `extractConcept` over every item in a category's item list and tallies
 * counts per matched concept id. The highest-count concept is returned as
 * `dominant`; ties are broken by FIRST-ENCOUNTERED concept id (i.e. the
 * concept whose first matching item appears earliest in `items`) — this
 * mirrors the deterministic, order-stable tie-break style used elsewhere in
 * this codebase (e.g. `groupByCategory`'s insertion order). Items with no
 * concept match do not contribute an entry to `breakdown` at all (they still
 * count toward the cluster's raw `evidenceCount` elsewhere, just not toward
 * this concept-level explainability breakdown).
 */
export function pickDominantConcept(items: RawResearchItem[], category: ProblemCategory): DominantConceptResult {
  const tally = new Map<string, ConceptBreakdownEntry>();
  const firstEncounteredOrder: string[] = [];

  for (const item of items) {
    const concept = extractConcept(item, category);
    if (!concept) continue;
    const existing = tally.get(concept.conceptId);
    if (existing) {
      existing.count += 1;
    } else {
      tally.set(concept.conceptId, { ...concept, count: 1 });
      firstEncounteredOrder.push(concept.conceptId);
    }
  }

  const breakdown = firstEncounteredOrder.map((id) => tally.get(id)!);

  let dominant: ConceptBreakdownEntry | null = null;
  let bestCount = -1;
  for (const id of firstEncounteredOrder) {
    const entry = tally.get(id)!;
    if (entry.count > bestCount) {
      bestCount = entry.count;
      dominant = entry;
    }
  }

  return { dominant, breakdown };
}
