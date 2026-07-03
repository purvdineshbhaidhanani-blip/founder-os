import { describe, expect, it } from "vitest";
import { ArtifactManager } from "../../src/runtime/artifacts/manager.js";
import { MemoryEngine } from "../../src/runtime/memory/engine.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import { ClusterRepository } from "../../src/problems/repository.js";
import { ProblemIntelligenceEngine } from "../../src/problems/engine.js";
import { flattenSessionItems, groupByCategory } from "../../src/problems/clustering.js";
import { filterNoiseItems } from "../../src/problems/noise-filter.js";
import {
  countCrossSourceDuplicateGroups,
  dedupeGroups,
  findNearDuplicates,
  findSemanticDuplicateGroups,
} from "../../src/problems/near-duplicate.js";
import { computeAverageEvidenceQuality } from "../../src/problems/evidence-quality.js";
import { extractProblemWithConcepts } from "../../src/problems/extractor.js";
import { buildClusterEvidence } from "../../src/problems/evidence.js";
import { computeFrequency } from "../../src/problems/frequency.js";
import { computeClusterConfidence } from "../../src/problems/confidence.js";
import { deriveCauseChain } from "../../src/problems/concept.js";
import { computeSeverity } from "../../src/problems/severity.js";
import type { FounderReport, Opportunity, RawResearchItem, ResearchSession } from "../../src/research/types.js";

class StubStorage {
  store = new Map<string, string>();
  async write(path: string, content: string) {
    this.store.set(path, content);
  }
  async read(path: string) {
    return this.store.get(path) ?? "";
  }
  async exists(path: string) {
    return this.store.has(path);
  }
}

function harness() {
  const artifacts = new ArtifactManager({ storage: new StubStorage() });
  const memory = new MemoryEngine(new InMemoryStore());
  const repository = new ClusterRepository({ artifacts, memory });
  const engine = new ProblemIntelligenceEngine({ repository });
  return { artifacts, memory, repository, engine };
}

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function makeReport(opportunities: Opportunity[]): FounderReport {
  return {
    topOpportunities: opportunities,
    evidence: [],
    confidenceScore: { band: "low", numericScore: 0 },
    sourceCoverage: { used: [], failed: [], skipped: [], ratio: 0 },
    generatedAt: new Date().toISOString(),
  };
}

function makeSession(opportunities: Opportunity[], windowDays = 30): ResearchSession {
  return {
    id: "research_fixture",
    windowDays,
    startedAt: new Date().toISOString(),
    sourcesUsed: [],
    sourcesFailed: [],
    sourcesSkipped: [],
    opportunities,
    report: makeReport(opportunities),
    totalItemsCollected: opportunities.flatMap((o) => o.supportingItems).length,
    durationMs: 0,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("ProblemIntelligenceEngine.analyze", () => {
  it("produces clusters sorted by evidenceCount descending, and persists the report", async () => {
    const now = Date.now();

    const complaintItems: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "This is so annoying and frustrating", sourceId: "reddit", author: "alice", engagement: 5 }),
      makeItem({ url: "https://example.com/2", title: "Terrible experience, hate it", sourceId: "hackernews", author: "bob", engagement: 3 }),
      makeItem({ url: "https://example.com/3", title: "Worst tool ever, awful", sourceId: "hackernews", author: "carol", engagement: 1 }),
    ];

    const praiseItems: RawResearchItem[] = [
      makeItem({ url: "https://example.com/4", title: "I love this, amazing product", sourceId: "reddit", author: "dave" }),
    ];

    const opportunities: Opportunity[] = [
      {
        id: "opp_1",
        title: "Complaints",
        summary: "s",
        keywords: [],
        supportingItems: complaintItems,
        sourceIds: ["reddit", "hackernews"],
      },
      {
        id: "opp_2",
        title: "Praise",
        summary: "s",
        keywords: [],
        supportingItems: praiseItems,
        sourceIds: ["reddit"],
      },
    ];

    const session = makeSession(opportunities);
    const { engine, artifacts, memory } = harness();

    const report = await engine.analyze(session);

    expect(report.sourceSessionId).toBe(session.id);
    expect(report.windowDays).toBe(session.windowDays);
    expect(report.totalItemsAnalyzed).toBe(4);
    expect(report.totalItemsClassified).toBe(4);
    expect(report.clusters.length).toBeGreaterThan(0);

    // sorted by evidenceCount descending
    for (let i = 1; i < report.clusters.length; i += 1) {
      expect(report.clusters[i - 1]!.evidence.evidenceCount).toBeGreaterThanOrEqual(
        report.clusters[i]!.evidence.evidenceCount,
      );
    }

    const complaintCluster = report.clusters.find((c) => c.category === "complaint");
    expect(complaintCluster).toBeDefined();
    expect(complaintCluster?.evidence.evidenceCount).toBe(3);
    // 2 of the 3 items ("Terrible experience...", "Worst tool ever, awful")
    // match concept.ts's "general-frustration" sub-concept ("terrible",
    // "awful"); the 3rd ("This is so annoying and frustrating") matches no
    // concept group, so it doesn't count toward the breakdown. Dominant
    // concept (count 2) replaces the old fixed category-level fallback
    // statement with a richer, sub-concept-aware one, and surfaces its root
    // cause — this is the Loop 5 Part 2/6 capability under test here.
    expect(complaintCluster?.normalizedStatement).toBe("Users express strong general frustration with the product.");
    expect(complaintCluster?.rootCause).toBe("Poor UX");
    expect(complaintCluster?.conceptBreakdown).toEqual([
      {
        conceptId: "general-frustration",
        canonicalStatement: "Users express strong general frustration with the product.",
        rootCause: "Poor UX",
        count: 2,
      },
    ]);

    const praiseCluster = report.clusters.find((c) => c.category === "praise");
    expect(praiseCluster).toBeDefined();
    // No concept group is registered for "praise" (concept.ts intentionally
    // excludes praise/trend/other — they don't decompose into root causes),
    // so it always falls back to the fixed category-level statement.
    expect(praiseCluster?.normalizedStatement).toBe("Users express satisfaction or praise.");
    expect(praiseCluster?.rootCause).toBeUndefined();
    expect(praiseCluster?.conceptBreakdown).toBeUndefined();

    // Part 8 additive report fields are always present and, for this clean
    // (no noise, no rejected clusters) fixture, both zero/empty.
    expect(report.totalItemsRejectedAsNoise).toBe(0);
    expect(report.rejectedClusters).toEqual([]);

    // Part 3/4 additive cluster fields: real, computed numbers.
    expect(complaintCluster?.evidenceQualityScore).toBeGreaterThan(0);
    expect(complaintCluster?.evidenceQualityScore).toBeLessThanOrEqual(1);
    expect(complaintCluster?.duplicateAdjustedEvidenceCount).toBe(3); // no near-duplicates in this fixture

    // persisted
    expect(report.artifactId).toBeTruthy();
    const artifact = artifacts.get(report.artifactId!);
    expect(artifact).toBeDefined();
    expect(artifact?.kind).toBe("report");
    expect(artifact?.owner).toBe("problem-intelligence-engine");

    const recalled = await memory.recall({ namespace: "project", tag: "problem-intelligence" });
    expect(recalled.some((entry) => entry.key === report.id)).toBe(true);
  });

  it("flags a rising-growth category with trending:true on a SINGLE cluster, instead of creating a duplicate trend cluster", async () => {
    const now = Date.now();
    const windowDays = 30;

    // 3 recent + 1 earlier bug-report items -> ratio 3, "rising"
    const items: RawResearchItem[] = [
      makeItem({
        url: "https://example.com/1",
        title: "App keeps crashing constantly",
        sourceId: "reddit",
        author: "alice",
        publishedAt: new Date(now).toISOString(),
      }),
      makeItem({
        url: "https://example.com/2",
        title: "Getting a crash every time I open it",
        sourceId: "hackernews",
        author: "bob",
        publishedAt: new Date(now - 1 * DAY_MS).toISOString(),
      }),
      makeItem({
        url: "https://example.com/3",
        title: "Another crash bug report",
        sourceId: "hackernews",
        author: "carol",
        publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
      }),
      makeItem({
        url: "https://example.com/4",
        title: "Old crash bug from a while ago",
        sourceId: "reddit",
        author: "dave",
        publishedAt: new Date(now - windowDays * DAY_MS + 1 * DAY_MS).toISOString(),
      }),
    ];

    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Bugs", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];

    const session = makeSession(opportunities, windowDays);
    const { engine } = harness();

    const report = await engine.analyze(session);

    // exactly ONE cluster is produced for this category, not two.
    const bugClusters = report.clusters.filter((c) => c.category === "bug");
    expect(bugClusters).toHaveLength(1);
    const bugCluster = bugClusters[0]!;
    expect(bugCluster.frequency.growth.label).toBe("rising");
    expect(bugCluster.trending).toBe(true);

    // no separate "trend"-category cluster is created anymore.
    expect(report.clusters.some((c) => c.category === "trend")).toBe(false);
  });

  it("leaves trending unset (falsy) when no category shows rising growth, and does not add a trend cluster", async () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "This is so annoying", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/2", title: "Terrible, hate it", sourceId: "reddit" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Complaints", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);
    expect(report.clusters.some((c) => c.category === "trend")).toBe(false);
    for (const cluster of report.clusters) {
      expect(cluster.trending).toBeFalsy();
    }
  });

  it("counts totalItemsClassified as items matching at least one non-other category", async () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "This is so annoying", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/2", title: "Quarterly earnings report published today", sourceId: "reddit" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Mixed", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);
    expect(report.totalItemsAnalyzed).toBe(2);
    expect(report.totalItemsClassified).toBe(1);
    expect(report.clusters.some((c) => c.category === "other")).toBe(true);
  });

  it("Part 7 quality gate 2: rejects a cluster whose evidence is mostly near-duplicate cross-posted content", async () => {
    // 6 "bug" items: 5 are near-identical cross-posts of the SAME underlying
    // complaint (same body text, different source/author/url/title) and 1
    // is a genuinely distinct bug report. That's one near-duplicate group of
    // 5 (duplicateCount 4) out of 6 total items -> duplicateRatio 4/6 =
    // 0.667, over the 0.6 MAX_DUPLICATE_RATIO gate.
    const duplicateBody =
      "The app crashes every time I try to export data to CSV format and I lose all my unsaved work";
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/d1", title: "Export crashes", body: duplicateBody, sourceId: "reddit", author: "a1" }),
      makeItem({ url: "https://example.com/d2", title: "App crashes on export", body: duplicateBody, sourceId: "hackernews", author: "a2" }),
      makeItem({ url: "https://example.com/d3", title: "CSV export is broken", body: duplicateBody, sourceId: "hackernews", author: "a3" }),
      makeItem({ url: "https://example.com/d4", title: "Losing work on export", body: duplicateBody, sourceId: "reddit", author: "a4" }),
      makeItem({ url: "https://example.com/d5", title: "Export crash again", body: duplicateBody, sourceId: "reddit", author: "a5" }),
      makeItem({
        url: "https://example.com/d6",
        title: "Different bug entirely",
        body: "The login page shows a timeout error whenever I try to sign in with SSO enabled",
        sourceId: "reddit",
        author: "a6",
      }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Bugs", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);

    expect(report.clusters.some((c) => c.category === "bug")).toBe(false);
    const rejection = report.rejectedClusters?.find((r) => r.category === "bug");
    expect(rejection).toBeDefined();
    expect(rejection!.reason).toContain("duplicate ratio");
    expect(rejection!.reason).toContain("0.67");

    // eslint-disable-next-line no-console
    console.log(`[quality gate 2 example] bug cluster rejected: "${rejection!.reason}"`);
  });

  it("Part 7 quality gate 3: rejects a category cluster whose surviving items are mostly noise-filtered away", async () => {
    // 5 items would classify into "feature-request" (each weakly, via a
    // single "would be great if" match, confidence 0.3 — below the noise
    // safety-valve's 0.55 threshold, so it does NOT protect them). 4 of the
    // 5 ALSO carry 2+ distinct tutorial-list noise phrases and get removed
    // by the Part 1 noise filter, leaving only 1/5 (20%) surviving —
    // below the 34% NOISE_DOMINATED_SURVIVAL_RATIO_FLOOR.
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/n1", title: "Would be great if there was a step by step tutorial guide to onboarding", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/n2", title: "Would be great if there was a step by step tutorial for setup", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/n3", title: "Would be great if there was a step by step tutorial walkthrough", sourceId: "hackernews" }),
      makeItem({ url: "https://example.com/n4", title: "Would be great if there was a step by step tutorial guide to billing", sourceId: "hackernews" }),
      makeItem({ url: "https://example.com/n5", title: "Would be great if it supported CSV import", sourceId: "reddit" }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Feature requests", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);

    expect(report.totalItemsRejectedAsNoise).toBe(4);
    expect(report.clusters.some((c) => c.category === "feature-request")).toBe(false);
    const rejection = report.rejectedClusters?.find((r) => r.category === "feature-request");
    expect(rejection).toBeDefined();
    expect(rejection!.reason).toContain("survived noise-filtering");
    expect(rejection!.reason).toContain("1/5");

    // eslint-disable-next-line no-console
    console.log(`[quality gate 3 example] feature-request cluster rejected: "${rejection!.reason}"`);
  });

  it("Loop 6: attaches causeChain, severity, and groupingReason to a real analyzed cluster (Zapier pricing example)", async () => {
    // Phrasing chosen so each item matches BOTH detector.ts's pricing-complaint
    // CATEGORY_PATTERNS (so it actually lands in the "pricing-complaint"
    // bucket via the real classifyItem/groupByCategory pipeline, not just
    // concept.ts's own trigger list) AND concept.ts's automation-too-expensive
    // trigger phrases ("too expensive"/"overpriced" are common to both lists).
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/p1", title: "Zapier is too expensive for a small team like ours", sourceId: "reddit", author: "alice", engagement: 10 }),
      makeItem({ url: "https://example.com/p2", title: "This tool is honestly overpriced for what it delivers, cancelling now", sourceId: "hackernews", author: "bob", engagement: 4 }),
      makeItem({ url: "https://example.com/p3", title: "Totally overpriced software, need this fixed asap before we lose more money", sourceId: "hackernews", author: "carol", engagement: 2 }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Pricing", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);
    const pricingCluster = report.clusters.find((c) => c.category === "pricing-complaint");
    expect(pricingCluster).toBeDefined();

    // Part B: causeChain, derived from the already-computed dominant rootCause "Pricing Friction".
    expect(pricingCluster?.causeChain).toEqual({
      observedProblem: "Automation/tooling pricing is too expensive for the value delivered.",
      underlyingCause: "Pricing Friction",
      businessCause: "Perceived value doesn't match price point.",
      technicalCause: "No usage-based tiering to capture willingness to pay.",
    });

    // Part C: severity — real computed numbers, not fabricated.
    expect(pricingCluster?.severity).toBeDefined();
    expect(pricingCluster!.severity!.severity).toBeGreaterThanOrEqual(0);
    expect(pricingCluster!.severity!.severity).toBeLessThanOrEqual(100);
    expect(pricingCluster!.severity!.moneyCost).toBe("high"); // Pricing Friction rootCause
    expect(pricingCluster!.severity!.timeCost).toBe("low");
    expect(pricingCluster!.severity!.urgency).toBeCloseTo((1 / 3) * 100, 0); // only p3 ("asap") carries an urgency phrase
    expect(pricingCluster!.severity!.reasons.length).toBeGreaterThan(0);

    // Part F: groupingReason cites the dominant concept id + match count.
    expect(pricingCluster?.groupingReason).toContain("automation-too-expensive");
    expect(pricingCluster?.groupingReason).toContain("3/3");

    // Part E: no near-duplicates in this fixture (distinct wording) -> both duplicate metrics are their "no signal" defaults.
    expect(pricingCluster?.crossSourceDuplicateCount).toBe(0);
    expect(pricingCluster?.semanticDuplicateGroupCount).toBeUndefined();

    // Part 1 (this loop, additive): symptoms — the raw, deduped trigger
    // phrases matched for "pricing-complaint" across p1/p2/p3 ("too
    // expensive" from p1; "overpriced" from both p2 and p3, deduped to one).
    expect(pricingCluster?.symptoms).toEqual(["too expensive", "overpriced"]);

    // eslint-disable-next-line no-console
    console.log(
      `[Loop 6 example] causeChain=${JSON.stringify(pricingCluster!.causeChain)}, severity=${pricingCluster!.severity!.severity}, groupingReason="${pricingCluster!.groupingReason}", symptoms=${JSON.stringify(pricingCluster!.symptoms)}`,
    );
  });

  it("Loop 6 Part E: surfaces crossSourceDuplicateCount and semanticDuplicateGroupCount on a surviving cluster", async () => {
    const slowLaggyBody =
      "The app is so slow and laggy, it takes too long to load every single time I open it and it feels completely broken, extremely frustrating";
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/x1", title: "Slow app", body: slowLaggyBody, sourceId: "reddit", author: "a1" }),
      makeItem({ url: "https://example.com/x2", title: "App feels laggy", body: slowLaggyBody, sourceId: "hackernews", author: "a2" }),
      makeItem({
        url: "https://example.com/x3",
        title: "Totally different report",
        body: "the login page shows a timeout error whenever I try to sign in with sso enabled",
        sourceId: "reddit",
        author: "a3",
      }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Bugs", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);
    const bugCluster = report.clusters.find((c) => c.category === "bug");
    expect(bugCluster).toBeDefined();

    // x1/x2 share IDENTICAL body text (near-duplicate) across 2 distinct sourceIds (reddit, hackernews) -> 1 cross-source group.
    expect(bugCluster?.crossSourceDuplicateCount).toBe(1);
    // x1/x2 ALSO both map to the "performance-app-is-slow" concept.ts group -> 1 semantic duplicate group.
    expect(bugCluster?.semanticDuplicateGroupCount).toBe(1);
    expect(bugCluster?.semanticDuplicateConceptIds).toEqual(["performance-app-is-slow"]);

    // eslint-disable-next-line no-console
    console.log(
      `[Loop 6 Part E example] crossSourceDuplicateCount=${bugCluster!.crossSourceDuplicateCount}, semanticDuplicateGroupCount=${bugCluster!.semanticDuplicateGroupCount}, conceptIds=${JSON.stringify(bugCluster!.semanticDuplicateConceptIds)}`,
    );
  });

  it("Part 3 — a real analyzed cluster has all 11 conceptual OUTPUT fields populated with real, non-placeholder values", async () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/c1", title: "This is so frustrating and I hate using this tool", sourceId: "reddit", author: "alice", engagement: 8 }),
      makeItem({ url: "https://example.com/c2", title: "Terrible experience, hate it, awful all around", sourceId: "hackernews", author: "bob", engagement: 5 }),
      makeItem({ url: "https://example.com/c3", title: "Absolutely awful, this is so frustrating too", sourceId: "hackernews", author: "carol", engagement: 2 }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Complaints", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    const report = await engine.analyze(session);
    const cluster = report.clusters.find((c) => c.category === "complaint");
    expect(cluster).toBeDefined();
    const c = cluster!;

    // 1. Canonical Problem
    expect(c.normalizedStatement).toBe("Users express strong general frustration with the product.");
    // 2. Root Cause
    expect(c.rootCause).toBe("Poor UX");
    // 3. Symptoms (Part 1, new) — real, deduped trigger phrases, not a placeholder.
    expect(c.symptoms).toBeDefined();
    expect(c.symptoms!.length).toBeGreaterThan(0);
    expect(c.symptoms).toEqual(["hate", "frustrat", "so frustrating", "hate using this", "terrible", "awful"]);
    // 4. Evidence Count
    expect(c.evidence.evidenceCount).toBe(3);
    // 5. Source Diversity
    expect(c.frequency.uniqueSources).toBe(2);
    // 6. Author Diversity
    expect(c.frequency.uniqueAuthors).toBe(3);
    // 7. Evidence Quality
    expect(c.evidenceQualityScore).toBeGreaterThan(0);
    expect(c.evidenceQualityScore).toBeLessThanOrEqual(1);
    // 8. Confidence
    expect(c.confidence.band).toBeDefined();
    expect(c.confidence.score).toBeGreaterThan(0);
    expect(c.confidence.explanation.length).toBeGreaterThan(0);
    // 9. Representative Quotes
    expect(c.evidence.representativeExamples.length).toBeGreaterThan(0);
    // 10. Problem Type
    expect(c.category).toBe("complaint");
    // 11. Cluster Size (duplicate-adjusted, more accurate than raw evidenceCount)
    expect(c.duplicateAdjustedEvidenceCount).toBe(3);

    // eslint-disable-next-line no-console
    console.log(
      `[Part 3 example] normalizedStatement="${c.normalizedStatement}", rootCause="${c.rootCause}", symptoms=${JSON.stringify(c.symptoms)}, evidenceCount=${c.evidence.evidenceCount}, uniqueSources=${c.frequency.uniqueSources}, uniqueAuthors=${c.frequency.uniqueAuthors}, evidenceQualityScore=${c.evidenceQualityScore!.toFixed(3)}, confidence=${JSON.stringify(c.confidence)}, category="${c.category}", duplicateAdjustedEvidenceCount=${c.duplicateAdjustedEvidenceCount}`,
    );
  });

  it("REGRESSION (Part 2 correctness proof): the new two-stage AI Problem Intelligence composition (ai-problem-intelligence.ts, called from the refactored engine.ts) produces a cluster IDENTICAL, field-for-field, to directly calling the exact OLD inline sequence of underlying functions — proving the refactor changed WHERE the logic lives, not WHAT it computes", async () => {
    const now = Date.now();
    const slowLaggyBody =
      "The app is so slow and laggy, it takes too long to load every single time I open it and it feels completely broken, extremely frustrating";
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/rx1", title: "Slow app", body: slowLaggyBody, sourceId: "reddit", author: "a1", publishedAt: new Date(now).toISOString() }),
      makeItem({ url: "https://example.com/rx2", title: "App feels laggy", body: slowLaggyBody, sourceId: "hackernews", author: "a2", publishedAt: new Date(now - 1 * DAY_MS).toISOString() }),
      makeItem({
        url: "https://example.com/rx3",
        title: "Totally different report",
        body: "the login page shows a timeout error whenever I try to sign in with sso enabled",
        sourceId: "reddit",
        author: "a3",
        publishedAt: new Date(now - 2 * DAY_MS).toISOString(),
      }),
    ];
    const opportunities: Opportunity[] = [
      { id: "opp_1", title: "Bugs", summary: "s", keywords: [], supportingItems: items, sourceIds: ["reddit", "hackernews"] },
    ];
    const session = makeSession(opportunities);
    const { engine } = harness();

    // ---- ACTUAL: the real engine, using the refactored two-stage pipeline ----
    const report = await engine.analyze(session);
    const actual = report.clusters.find((c) => c.category === "bug");
    expect(actual).toBeDefined();

    // ---- EXPECTED: shadow-computed by calling the EXACT OLD inline sequence
    // engine.ts used BEFORE this loop's Part 2 refactor — the very same
    // functions, called in the very same order, on the very same inputs.
    // Nothing here is new logic; it is the pre-refactor engine.ts code,
    // reproduced verbatim to prove the refactor is behavior-preserving.
    const rawItems = flattenSessionItems(session);
    const { kept } = filterNoiseItems(rawItems);
    const grouped = groupByCategory(kept);
    const classifiedItems = grouped.get("bug")!;
    const categoryItems = classifiedItems.map((c) => c.item);

    const { groups: nearDuplicateGroups, duplicateCount } = findNearDuplicates(categoryItems);
    const duplicateAdjustedEvidenceCount = dedupeGroups(nearDuplicateGroups).length;
    const duplicateRatio = categoryItems.length > 0 ? duplicateCount / categoryItems.length : 0;
    const evidenceQualityScore = computeAverageEvidenceQuality(categoryItems);
    const extracted = extractProblemWithConcepts(classifiedItems[0]!, categoryItems, "bug");
    const evidence = buildClusterEvidence(categoryItems);
    const frequency = computeFrequency(categoryItems, session.windowDays);
    const confidence = computeClusterConfidence(evidence, frequency, evidenceQualityScore, duplicateRatio);
    const causeChain = extracted.rootCause ? deriveCauseChain(extracted.normalizedStatement, extracted.rootCause) : undefined;
    const severity = computeSeverity({ category: "bug", rootCause: extracted.rootCause, frequency, classifiedItems });
    const semanticDuplicateGroups = findSemanticDuplicateGroups(nearDuplicateGroups, "bug");
    const crossSourceDuplicateCount = countCrossSourceDuplicateGroups(nearDuplicateGroups);
    const groupingReason = extracted.dominantConceptId
      ? `Grouped under concept "${extracted.dominantConceptId}" (${extracted.dominantConceptCount}/${categoryItems.length} item(s) in category "bug" matched its trigger phrases) — the dominant sub-concept for this cluster.`
      : `No concept.ts sub-pattern matched any of this category's ${categoryItems.length} item(s); grouped under the fixed category-level fallback statement for "bug".`;

    // Every field that existed BEFORE this loop must match exactly.
    expect(actual!.category).toBe("bug");
    expect(actual!.normalizedStatement).toBe(extracted.normalizedStatement);
    expect(actual!.evidence).toEqual(evidence);
    expect(actual!.frequency).toEqual(frequency);
    expect(actual!.confidence).toEqual(confidence);
    expect(actual!.rootCause).toEqual(extracted.rootCause);
    expect(actual!.conceptBreakdown).toEqual(extracted.conceptBreakdown.length > 0 ? extracted.conceptBreakdown : undefined);
    expect(actual!.duplicateAdjustedEvidenceCount).toBe(duplicateAdjustedEvidenceCount);
    expect(actual!.evidenceQualityScore).toBe(evidenceQualityScore);
    expect(actual!.causeChain).toEqual(causeChain);
    expect(actual!.severity).toEqual(severity);
    expect(actual!.crossSourceDuplicateCount).toBe(crossSourceDuplicateCount);
    if (semanticDuplicateGroups.length > 0) {
      expect(actual!.semanticDuplicateGroupCount).toBe(semanticDuplicateGroups.length);
      expect(actual!.semanticDuplicateConceptIds).toEqual([...new Set(semanticDuplicateGroups.map((g) => g.conceptId))]);
    } else {
      expect(actual!.semanticDuplicateGroupCount).toBeUndefined();
    }
    expect(actual!.groupingReason).toBe(groupingReason);
    expect(actual!.trending).toEqual(frequency.growth.label === "rising" ? true : undefined);

    // The ONLY additive field beyond this exact old computation: `symptoms`
    // (Part 1, new). Everything else above is byte-for-byte identical to
    // the pre-refactor engine.ts's own inline computation.
    expect(actual!.symptoms).toBeDefined();

    // eslint-disable-next-line no-console
    console.log(
      `[Regression proof] actual cluster field count matches shadow-computed old-path cluster exactly (plus 1 new additive field: symptoms=${JSON.stringify(actual!.symptoms)}).`,
    );
  });
});
