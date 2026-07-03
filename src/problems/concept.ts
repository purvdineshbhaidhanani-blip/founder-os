import type { CauseChain, ProblemCategory } from "./types.js";
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

/**
 * Fixed, small, reused root-cause taxonomy — every concept group maps to
 * exactly one of these.
 *
 * "Security/Compliance" added in Loop 6 (Part A): the ONE genuinely new
 * taxonomy value in this loop, needed because none of the original 10
 * values honestly name a security-vulnerability/compliance-certification
 * concern (the closest existing candidates — "Reliability/Bugs", "Poor UX"
 * — would mischaracterize it as a generic defect/usability issue rather
 * than a trust/regulatory blocker). Every OTHER new concept group added in
 * this loop reuses one of the original 10 values (see each group's
 * rationale comment below) per the mission's explicit "reuse existing
 * unless genuinely needed" instruction.
 */
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
  | "Vendor Lock-in"
  | "Security/Compliance";

export interface ConceptGroup {
  id: string;
  category: ProblemCategory;
  triggerPhrases: string[];
  canonicalStatement: string;
  rootCause: RootCause;
}

/**
 * Fixed concept groups. Originally ~20, spanning the realistic subset of
 * ProblemCategory values that actually carry founder-actionable nuance
 * (praise/trend/other are intentionally excluded — they don't decompose
 * into "root causes" the way a complaint or feature request does). Order
 * within a category matters: `extractConcept` returns the FIRST group (in
 * this array's order) whose trigger phrase matches, so more specific groups
 * are listed before more generic ones within the same category.
 *
 * Loop 6 (Part A) appended ~28 MORE concept groups (below, after the
 * original 20 — none of the original 20 groups/ids were modified) to widen
 * topic coverage: pricing (2 more), authentication, billing (2), app
 * performance, API latency, broken integrations, recurring-task automation,
 * API DX complaints, import, export, permissions, notifications, analytics/
 * reporting, security/compliance, severe reliability failures (outage/data
 * loss), enterprise readiness, mobile, cluttered UX, AI accuracy, cross-tool
 * workflow friction, support responsiveness, migration data loss, search,
 * customization/white-labeling, scheduling, and collaboration/sharing. Every
 * new group's trigger-phrase list was checked against every EARLIER group
 * registered for the same category to avoid one group's phrase silently
 * shadowing another's (first-match-wins is unforgiving of substring overlap
 * — see e.g. how the existing `product-lacks-capability` group's generic
 * `"lacks "` trigger would have swallowed a naive `"lacks enterprise
 * features"` phrase; the actual `enterprise-readiness-gaps` group below
 * avoids the word "lacks" for exactly this reason).
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

  // =====================================================================
  // Loop 6, Part A — ~28 additional concept groups, appended after the
  // original 20 (none of which were modified). Grouped below by the topic
  // headers from the mission brief, not strictly by ProblemCategory, since
  // several topics (e.g. "Billing") span more than one nuance within the
  // same category.
  // =====================================================================

  // -- pricing (2 more, beyond automation-too-expensive / price-increase-backlash) --
  {
    id: "hidden-fees-and-surprise-costs",
    category: "pricing-complaint",
    // Distinct from automation-too-expensive: this is about UNDISCLOSED extra costs, not the advertised sticker price.
    triggerPhrases: ["hidden fees", "surprise charges", "nickel and dime", "extra costs i wasn't expecting", "extra costs i wasnt expecting"],
    canonicalStatement: "Pricing carries hidden fees or surprise charges beyond the advertised price.",
    rootCause: "Pricing Friction",
  },
  {
    id: "confusing-pricing-tiers",
    category: "pricing-complaint",
    // Pricing-complaint category, but the root cause is presentation/clarity, not the price level itself.
    triggerPhrases: ["confusing pricing tiers", "pricing is confusing", "can't tell which plan", "cant tell which plan", "too many pricing tiers"],
    canonicalStatement: "Users can't tell which pricing plan/tier fits their needs.",
    rootCause: "Poor UX",
  },

  // -- authentication (new) --
  {
    id: "authentication-login-failures",
    category: "bug",
    // Distinct from unreliable-buggy: scoped specifically to the auth path (login/2FA/SSO/password reset), not general flakiness.
    triggerPhrases: ["can't log in", "cant log in", "2fa broken", "sso doesn't work", "sso doesnt work", "password reset fails"],
    canonicalStatement: "Users cannot authenticate: login, 2FA, SSO, or password reset is broken.",
    rootCause: "Reliability/Bugs",
  },

  // -- billing (new, 2 groups) --
  {
    id: "billing-invoice-errors",
    category: "pricing-complaint",
    // Pricing-complaint category (it's about money), but the root cause is a billing-system defect, not the price level.
    triggerPhrases: ["wrong invoice", "incorrect invoice", "double charged", "charged twice", "billed twice"],
    canonicalStatement: "Billing produced a wrong invoice or a duplicate charge.",
    rootCause: "Reliability/Bugs",
  },
  {
    id: "cant-cancel-or-unresponsive-billing-support",
    category: "pricing-complaint",
    // The common thread across these phrases: resolving them requires support, and support isn't responding.
    triggerPhrases: [
      "can't cancel subscription",
      "cant cancel subscription",
      "won't let me cancel",
      "wont let me cancel",
      "billing support unresponsive",
      "billing support is unresponsive",
    ],
    canonicalStatement: "Users can't cancel their subscription and billing support doesn't respond to help.",
    rootCause: "Support Gap",
  },

  // -- performance (new) --
  {
    id: "performance-app-is-slow",
    category: "bug",
    // Distinct from sync-timeout-failures: general perceived slowness, not a specific sync/timeout failure.
    triggerPhrases: ["app is slow", "the app is slow", "laggy", "feels laggy", "takes too long to load", "slow to load"],
    canonicalStatement: "The app is slow/laggy or takes too long to load.",
    rootCause: "Performance",
  },

  // -- latency (new) --
  {
    id: "api-latency-under-load",
    category: "bug",
    // Distinct from performance-app-is-slow: specifically backend/API response-time degradation, not general UI slowness.
    triggerPhrases: ["high latency", "slow api response", "api response is slow", "requests take too long under load"],
    canonicalStatement: "API/requests exhibit high latency or slow responses, especially under load.",
    rootCause: "Performance",
  },

  // -- integrations (new, beyond missing-integration) --
  {
    id: "integration-broken",
    category: "bug",
    // Distinct from missing-integration (feature-request): this is an integration that EXISTS but has broken, not one that's absent.
    triggerPhrases: ["zapier integration broken", "integration is broken", "webhook not firing", "webhooks aren't firing", "webhooks arent firing"],
    canonicalStatement: "An existing integration or webhook has stopped working.",
    rootCause: "Reliability/Bugs",
  },

  // -- automation (new, beyond automation-feature-request) --
  {
    id: "recurring-manual-task-automation-request",
    category: "feature-request",
    // Distinct from automation-feature-request: names a CONCRETE recurring task to automate, not a generic "would be nice" wish.
    triggerPhrases: ["automate this for me", "this should run on a schedule", "needs to auto-sync", "i have to do this manually every time"],
    canonicalStatement: "Users want a specific recurring manual task automated end-to-end.",
    rootCause: "Lack of Automation",
  },

  // -- api (new) --
  {
    id: "api-undocumented-and-limited",
    category: "complaint",
    // "Poor UX" generalized to developer experience: an undocumented, rate-limited, unstable API is a usability problem for its developer-audience.
    triggerPhrases: [
      "api is undocumented",
      "api documentation is missing",
      "api rate limits too low",
      "rate limit is too low",
      "breaking api changes",
      "api keeps breaking",
    ],
    canonicalStatement: "Developers are frustrated with undocumented APIs, low rate limits, or breaking API changes.",
    rootCause: "Poor UX",
  },

  // -- import (new) --
  {
    id: "import-failures",
    category: "bug",
    // "Silently drops rows" is an especially dangerous reliability failure: no error is shown, so users don't know data is missing.
    triggerPhrases: ["csv import fails", "can't import data", "cant import data", "import silently drops rows", "import drops rows"],
    canonicalStatement: "Data import fails outright or silently drops rows.",
    rootCause: "Reliability/Bugs",
  },

  // -- export (new) --
  {
    id: "export-failures",
    category: "bug",
    // Groups both a broken export AND a wholly absent export option under one "can't get my data out" sub-concept.
    triggerPhrases: ["can't export data", "cant export data", "export is broken", "no export option", "there's no export option", "theres no export option"],
    canonicalStatement: "Users cannot reliably export their data, or export functionality is missing entirely.",
    rootCause: "Reliability/Bugs",
  },

  // -- permissions (new) --
  {
    id: "permissions-and-access-control-gaps",
    category: "missing-capability",
    // Reuses "Missing Integration" as this codebase's existing generic "product structurally lacks X" bucket (see no-way-to-accomplish-task).
    triggerPhrases: ["role permissions broken", "can't set granular access", "cant set granular access", "admin controls missing", "no granular permissions"],
    canonicalStatement: "The product lacks granular role/permission controls administrators need.",
    rootCause: "Missing Integration",
  },

  // -- notifications (new) --
  {
    id: "notifications-broken-or-overwhelming",
    category: "complaint",
    // Complaint category: notification volume/control is a UX-of-attention problem, not a hard structural gap.
    triggerPhrases: ["too many notifications", "notifications don't work", "notifications dont work", "can't customize alerts", "cant customize alerts"],
    canonicalStatement: "Notifications are either broken, un-customizable, or overwhelming.",
    rootCause: "Poor UX",
  },

  // -- analytics (new) --
  {
    id: "analytics-and-reporting-gaps",
    category: "missing-capability",
    // Missing-capability category (no reporting exists), but rootCause Reliability/Bugs: "inaccurate analytics" is a data-quality defect, not an absence.
    triggerPhrases: ["no reporting", "analytics are inaccurate", "can't track usage", "cant track usage", "no usage dashboard"],
    canonicalStatement: "Users can't get reliable reporting or usage analytics out of the product.",
    rootCause: "Reliability/Bugs",
  },

  // -- security (new — the one group that genuinely needs the new "Security/Compliance" root cause) --
  {
    id: "security-and-compliance-concerns",
    category: "complaint",
    triggerPhrases: ["security vulnerability", "data breach concern", "not soc2 compliant", "not soc 2 compliant", "no compliance certification"],
    canonicalStatement: "Users are concerned about a security vulnerability or a missing compliance certification (e.g. SOC2).",
    rootCause: "Security/Compliance",
  },

  // -- reliability (new, beyond unreliable-buggy / sync-timeout-failures) --
  {
    id: "outages-and-data-loss",
    category: "bug",
    // Distinct from unreliable-buggy/sync-timeout-failures: names SEVERE reliability failure modes (outage, data loss), not generic flakiness.
    triggerPhrases: ["frequent downtime", "data loss", "lost my data", "random errors", "randomly errors out"],
    canonicalStatement: "The product suffers frequent downtime, data loss, or unexplained random errors.",
    rootCause: "Reliability/Bugs",
  },

  // -- enterprise (new) --
  {
    id: "enterprise-readiness-gaps",
    category: "missing-capability",
    // Reuses the generic-gap rootCause bucket; "enterprise" here names WHO the gap blocks, not a different root cause.
    triggerPhrases: ["no sso for enterprise", "missing enterprise features", "no sla offered", "no enterprise plan available"],
    canonicalStatement: "The product lacks enterprise-required capabilities: SSO, SLA, or an enterprise plan.",
    rootCause: "Missing Integration",
  },

  // -- mobile (new) --
  {
    id: "mobile-experience-gaps",
    category: "missing-capability",
    // Missing-capability category (no app may exist), rootCause Poor UX: the unifying complaint is a substandard mobile experience.
    triggerPhrases: ["no mobile app", "mobile experience is bad", "doesn't work on phone", "doesnt work on phone", "not optimized for mobile"],
    canonicalStatement: "There's no mobile app, or the mobile experience is substandard relative to desktop.",
    rootCause: "Poor UX",
  },

  // -- ux (new, beyond poor-ux-hard-to-learn / general-frustration) --
  {
    id: "cluttered-inconsistent-ui",
    category: "complaint",
    // Distinct from poor-ux-hard-to-learn: about VISUAL clutter/inconsistency, not the steepness of the learning curve.
    triggerPhrases: ["cluttered interface", "overwhelming number of options", "inconsistent design", "too much going on in the ui"],
    canonicalStatement: "The interface is cluttered, inconsistent, or overwhelming, independent of any specific learning-curve complaint.",
    rootCause: "Poor UX",
  },

  // -- ai (new) --
  {
    id: "ai-features-inaccurate",
    category: "bug",
    // Bug category: an AI feature giving wrong answers is a functional defect from the user's point of view, same as any other incorrect output.
    triggerPhrases: ["ai features are useless", "hallucinates", "the ai hallucinates", "ai is inaccurate", "ai gives wrong answers"],
    canonicalStatement: "AI features hallucinate or produce inaccurate output.",
    rootCause: "Reliability/Bugs",
  },

  // -- workflow (new, beyond time-consuming-manual-work / clunky-many-steps) --
  {
    id: "cross-tool-context-switching",
    category: "workflow-friction",
    // Distinct from time-consuming-manual-work/clunky-many-steps: the friction here is specifically CROSS-TOOL disconnection, not step count or raw time.
    triggerPhrases: [
      "have to switch between apps",
      "constantly copy data between tools",
      "juggling multiple tools for one task",
      "context switching between systems",
    ],
    canonicalStatement: "Users must manually switch between disconnected tools to complete one workflow.",
    rootCause: "Missing Integration",
  },

  // -- support (new) --
  {
    id: "support-slow-and-unresponsive",
    category: "complaint",
    triggerPhrases: ["support is slow", "no live support", "tickets go unanswered", "support never responds", "waited days for a reply"],
    canonicalStatement: "Customer support is slow, unresponsive, or unavailable live.",
    rootCause: "Support Gap",
  },

  // -- migration (new, beyond switched-due-to-price-or-gap / migrated-away-entirely) --
  {
    id: "data-loss-during-migration",
    category: "migration",
    // Distinct from switched-due-to-price-or-gap/migrated-away-entirely: about the PROCESS of leaving being broken/lossy, not why they left.
    triggerPhrases: ["lost data when migrating", "migration was a nightmare", "couldn't export my data to switch", "export tool didn't work when i left"],
    canonicalStatement: "Users lost data or had a painful experience migrating away from the product.",
    rootCause: "Reliability/Bugs",
  },

  // -- search (new) --
  {
    id: "search-doesnt-work",
    category: "bug",
    // Bug category (search malfunctioning), rootCause Poor UX: result-relevance quality is fundamentally a UX/relevance issue, not a crash.
    triggerPhrases: ["search doesn't work", "search doesnt work", "search results are bad", "can't find anything", "cant find anything"],
    canonicalStatement: "Search is broken, returns bad results, or can't find anything.",
    rootCause: "Poor UX",
  },

  // -- customization (new) --
  {
    id: "customization-too-rigid",
    category: "missing-capability",
    // Reuses the generic-gap rootCause bucket for "the product structurally can't be configured/customized."
    triggerPhrases: ["can't customize", "cant customize", "too rigid", "no white-labeling", "no white labeling"],
    canonicalStatement: "The product is too rigid to customize, including lacking white-labeling.",
    rootCause: "Missing Integration",
  },

  // -- scheduling (new) --
  {
    id: "scheduling-and-calendar-issues",
    category: "bug",
    triggerPhrases: ["scheduling is broken", "calendar sync fails", "can't reschedule", "cant reschedule"],
    canonicalStatement: "Scheduling or calendar sync is broken, or users can't reschedule.",
    rootCause: "Reliability/Bugs",
  },

  // -- collaboration (new) --
  {
    id: "collaboration-and-sharing-gaps",
    category: "missing-capability",
    triggerPhrases: [
      "can't share with team",
      "cant share with team",
      "no multiplayer editing",
      "permissions for collaborators broken",
      "can't collaborate in real time",
    ],
    canonicalStatement: "Users can't share or collaborate with their team in real time.",
    rootCause: "Missing Integration",
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

/**
 * Loop 6, Part B — root-cause chain. `CAUSE_CHAIN_MAPPING` is a small, fixed
 * lookup table, ONE ROW PER ROOT CAUSE (all 11 RootCause values, including
 * "Security/Compliance" added in Part A), composing a `businessCause` (why
 * this matters commercially) and a `technicalCause` (what's likely broken/
 * missing under the hood) for that root cause. `deriveCauseChain` composes
 * these with the cluster's already-computed `normalizedStatement` and
 * dominant `rootCause` — no new classification pass, just a lookup.
 *
 * businessCause/technicalCause per root cause (documented one line each):
 *   - Poor UX             -> business: users churn/disengage because the product feels harder to use than it should.
 *                             technical: UI/UX flows were not validated against real user workflows before shipping.
 *   - Pricing Friction     -> business: perceived value doesn't match price point.
 *                             technical: no usage-based tiering to capture willingness to pay.
 *   - Manual Process       -> business: customers pay for the outcome, not the manual labor to get there, so unpaid effort erodes perceived value.
 *                             technical: no automation layer exists for this repetitive task.
 *   - Missing Integration  -> business: customers can't fit the product into their existing stack, so it's excluded from consideration or abandoned.
 *                             technical: no integration/connector has been built for the systems customers actually use.
 *   - Reliability/Bugs     -> business: trust erosion from repeated failures.
 *                             technical: insufficient test coverage or monitoring on the failing path.
 *   - Support Gap          -> business: customers feel abandoned post-purchase, driving churn and negative word-of-mouth.
 *                             technical: support staffing/tooling hasn't scaled with the customer base or ticket volume.
 *   - Onboarding Friction  -> business: new users fail to reach their first value moment, so activation/conversion drop.
 *                             technical: onboarding flow lacks guided setup or contextual help at the point of confusion.
 *   - Performance          -> business: slow experiences directly reduce usage frequency and satisfaction.
 *                             technical: unoptimized queries/rendering paths, or missing caching/scaling under load.
 *   - Lack of Automation   -> business: customers pay for outcomes, not for manually re-triggering the same action every time.
 *                             technical: the workflow requires manual triggering because no event-driven automation exists.
 *   - Vendor Lock-in       -> business: customers feel trapped rather than retained, which breeds resentment instead of loyalty.
 *                             technical: no self-service export/cancellation path exists, or switching costs are artificially high.
 *   - Security/Compliance  -> business: enterprise/regulated buyers can't adopt the product without certifications, capping the addressable market.
 *                             technical: no security audit, vulnerability-remediation process, or compliance certification (e.g. SOC2) is in place.
 */
export const CAUSE_CHAIN_MAPPING: Record<RootCause, { businessCause: string; technicalCause: string }> = {
  "Poor UX": {
    businessCause: "Users churn or disengage because the product feels harder to use than it should.",
    technicalCause: "UI/UX flows were not validated against real user workflows before shipping.",
  },
  "Pricing Friction": {
    businessCause: "Perceived value doesn't match price point.",
    technicalCause: "No usage-based tiering to capture willingness to pay.",
  },
  "Manual Process": {
    businessCause: "Customers pay for the outcome, not the manual labor required to get there, so unpaid effort erodes perceived value.",
    technicalCause: "No automation layer exists for this repetitive task.",
  },
  "Missing Integration": {
    businessCause: "Customers can't fit the product into their existing stack, so it's excluded from consideration or abandoned.",
    technicalCause: "No integration/connector has been built for the systems customers actually use.",
  },
  "Reliability/Bugs": {
    businessCause: "Trust erosion from repeated failures.",
    technicalCause: "Insufficient test coverage or monitoring on the failing path.",
  },
  "Support Gap": {
    businessCause: "Customers feel abandoned post-purchase, which drives churn and negative word-of-mouth.",
    technicalCause: "Support staffing/tooling hasn't scaled with the customer base or ticket volume.",
  },
  "Onboarding Friction": {
    businessCause: "New users fail to reach their first value moment, so activation and conversion drop.",
    technicalCause: "Onboarding flow lacks guided setup or contextual help at the point of confusion.",
  },
  Performance: {
    businessCause: "Slow experiences directly reduce usage frequency and satisfaction.",
    technicalCause: "Unoptimized queries/rendering paths or missing caching/scaling under load.",
  },
  "Lack of Automation": {
    businessCause: "Customers pay for outcomes, not manual re-triggering of the same action every time.",
    technicalCause: "The workflow requires manual triggering because no event-driven automation exists.",
  },
  "Vendor Lock-in": {
    businessCause: "Customers feel trapped rather than retained, which converts into resentment instead of loyalty.",
    technicalCause: "No self-service export/cancellation path exists, or switching costs are artificially high.",
  },
  "Security/Compliance": {
    businessCause: "Enterprise/regulated buyers can't adopt the product without certifications, capping the addressable market.",
    technicalCause: "No security audit, vulnerability-remediation process, or compliance certification (e.g. SOC2) is in place.",
  },
};

/**
 * Composes a cluster's already-computed `normalizedStatement` (the
 * "observedProblem") and dominant `rootCause` (the "underlyingCause") with
 * the fixed `CAUSE_CHAIN_MAPPING` lookup to produce a full `CauseChain`. Pure
 * function, one dictionary lookup — no re-classification, no new pass over
 * items (see engine.ts's Part B wiring, which calls this once per cluster
 * using values ALREADY computed earlier in the same loop iteration).
 */
export function deriveCauseChain(observedProblem: string, rootCause: RootCause): CauseChain {
  const mapped = CAUSE_CHAIN_MAPPING[rootCause];
  return {
    observedProblem,
    underlyingCause: rootCause,
    businessCause: mapped.businessCause,
    technicalCause: mapped.technicalCause,
  };
}
