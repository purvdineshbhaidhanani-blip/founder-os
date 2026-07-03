import type {
  AliasGroupSummary,
  CanonicalizationResult,
  FounderOpportunityReport,
  SemanticClusterInfo,
  SemanticMergeResult,
} from "./types.js";

/**
 * Loop 3, Part A — semantic (canonical-alias) clustering, at the
 * OPPORTUNITY level (not the raw-item level).
 *
 * Honesty note (do not oversell): `src/problems/clustering.ts` already
 * groups raw items by category, and `src/problems/extractor.ts` maps every
 * category to ONE of 15 fixed `normalizedStatement` strings (see
 * CANONICAL_STATEMENTS in extractor.ts). That means, within a single
 * `OpportunityEngine.analyze()` run, `FounderOpportunityReport.problem` is
 * already one of at most 15 distinct fixed sentences — most synonym
 * collapsing has therefore ALREADY happened upstream, before this module
 * ever runs. None of the 15 fixed category statements contain any of the
 * alias phrases below (deliberately — see the "no accidental collisions"
 * check in tests/opportunities/semantic.test.ts), so running this module
 * against a REAL pipeline run is, honestly, expected to be a clean no-op
 * (`aliasGroups: []`, every report's `semanticCluster.mergedCount === 1`).
 * That is not a bug — it's evidence the upstream category clustering is
 * already doing its job. This module exists as:
 *   (a) a second, semantic-level safety net for cases the fixed 15-category
 *       taxonomy doesn't cover as one category (e.g. two founder-facing
 *       problem phrasings that a future, richer `problem` field — or a
 *       caller applying `canonicalizeProblem` directly to raw item titles —
 *       might produce as literally different text), and
 *   (b) a small, reusable, conservative phrase-canonicalization utility
 *       (`canonicalizeProblem`) other callers can use directly.
 *
 * Deterministic, substring-based (same technique as
 * src/problems/detector.ts and src/research/relevance.ts) — no LLM call,
 * no fuzzy/edit-distance matching, no invented canonical names beyond the
 * fixed map below.
 */

interface AliasGroup {
  canonical: string;
  phrases: string[];
}

/**
 * Fixed alias map — a small, conservative set of "obvious" founder-problem
 * synonym groups, each a canonical name plus the lowercase substring
 * phrases that map to it. Deliberately narrow (multi-word, specific
 * phrases) rather than broad single words, to avoid false-positive merges
 * — matching the codebase's existing "conservative substring list" style
 * (see fois.ts's AUTOMATION_SIGNAL_PHRASES, difficulty.ts's
 * DIFFICULTY_SIGNALS). Not empirically tuned against real founder-problem
 * text (no labeled dataset was available) — a reasoned, defensible
 * starting set.
 */
const ALIAS_GROUPS: AliasGroup[] = [
  {
    canonical: "Product Launch / GTM",
    phrases: ["launch product", "product launch", "go to market", "gtm", "mvp release", "launching our product"],
  },
  {
    canonical: "Customer Onboarding",
    phrases: ["user onboarding", "customer onboarding", "onboarding flow", "onboarding experience", "getting started flow"],
  },
  {
    canonical: "Billing & Payments",
    phrases: ["billing system", "payment processing", "subscription billing", "payment integration", "invoicing workflow"],
  },
  {
    canonical: "Customer Support Automation",
    phrases: ["customer support automation", "support ticket triage", "helpdesk automation", "automate support tickets"],
  },
  {
    canonical: "Data Migration / Import-Export",
    phrases: ["data migration", "migrate our data", "import data from", "export data to", "csv import workflow"],
  },
  {
    canonical: "Team Collaboration",
    phrases: ["team collaboration tool", "collaboration workflow", "shared workspace tool", "working together on"],
  },
  {
    canonical: "Reporting & Analytics",
    phrases: ["reporting dashboard", "analytics dashboard", "business intelligence tool", "data visualization tool"],
  },
  {
    canonical: "Hiring & Recruiting",
    phrases: ["hiring pipeline", "recruiting process", "applicant tracking", "candidate pipeline tool"],
  },
];

/**
 * Canonicalizes a single founder-problem phrase against the fixed alias
 * map. Case-insensitive substring match, first group/phrase in
 * declaration order wins (deterministic). Falls back to the trimmed,
 * UNMODIFIED input text (never lowercased or reworded) with
 * `matchedAlias: null` when nothing matches — so un-aliased text always
 * canonicalizes to itself, never accidentally collides with another
 * un-aliased report via a shared fallback value.
 */
export function canonicalizeProblem(text: string): CanonicalizationResult {
  const blob = text.toLowerCase();
  for (const group of ALIAS_GROUPS) {
    for (const phrase of group.phrases) {
      if (blob.includes(phrase)) {
        return { canonical: group.canonical, matchedAlias: phrase };
      }
    }
  }
  return { canonical: text.trim(), matchedAlias: null };
}

function unionSourceBreakdown(reports: FounderOpportunityReport[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const report of reports) {
    for (const [sourceId, count] of Object.entries(report.supportingEvidence.sourceBreakdown)) {
      merged[sourceId] = (merged[sourceId] ?? 0) + count;
    }
  }
  return merged;
}

/**
 * Merges opportunity reports whose `problem` statements canonicalize to the
 * same alias group, keeping the higher-`fois.overall` report as the
 * survivor and unioning aliases/sourceBreakdown/mention counts into it —
 * dropping (not silently discarding) the rest, mirroring dedup.ts's
 * "drop, don't blend two independently-computed score breakdowns"
 * philosophy for the same auditability reason.
 *
 * Ordering: the returned `merged` array preserves the INPUT order (each
 * surviving group is emitted at the position of its first-seen member),
 * rather than introducing a new sort. Callers (engine.ts) run this AFTER
 * dedupeOpportunities and BEFORE the Top-N slice specifically so that: (1)
 * dedup's own exact/near-duplicate pass runs first (a stricter, URL/
 * competitor-based check), and (2) this looser, text-canonicalization pass
 * runs as a final semantic-level safety net without disturbing whatever
 * order the pipeline had already settled on, in the (expected) common case
 * where it changes nothing at all (see module doc).
 */
export function mergeSynonymOpportunities(reports: FounderOpportunityReport[]): SemanticMergeResult {
  const groupOrder: string[] = [];
  const groups = new Map<
    string,
    { canonical: string; matchedAlias: string | null; members: FounderOpportunityReport[] }
  >();

  for (const report of reports) {
    const { canonical, matchedAlias } = canonicalizeProblem(report.problem);
    const existing = groups.get(canonical);
    if (existing) {
      existing.members.push(report);
    } else {
      groups.set(canonical, { canonical, matchedAlias, members: [report] });
      groupOrder.push(canonical);
    }
  }

  const merged: FounderOpportunityReport[] = [];
  const aliasGroups: AliasGroupSummary[] = [];

  for (const key of groupOrder) {
    const group = groups.get(key)!;
    const sortedMembers = [...group.members].sort((a, b) => b.fois.overall - a.fois.overall);
    const survivor = sortedMembers[0]!;
    const rest = sortedMembers.slice(1);

    const aliases = [...new Set(sortedMembers.map((member) => member.problem))].filter(
      (problem) => problem !== survivor.problem,
    );
    const mentionCount = sortedMembers.reduce((sum, member) => sum + member.supportingEvidence.evidenceCount, 0);
    const supportingSources = Object.keys(unionSourceBreakdown(sortedMembers)).sort();

    const semanticCluster: SemanticClusterInfo = {
      canonicalTitle: group.canonical,
      aliases,
      mentionCount,
      supportingSources,
      mergedCount: sortedMembers.length,
    };

    merged.push({ ...survivor, semanticCluster });

    if (rest.length > 0) {
      aliasGroups.push({
        canonical: group.canonical,
        matchedAlias: group.matchedAlias ?? "",
        memberProblems: sortedMembers.map((member) => member.problem),
        survivorId: survivor.id,
        mergedReportIds: rest.map((member) => member.id),
      });
    }
  }

  return { merged, aliasGroups };
}
