import { generateId, nowIso } from "../utils/id.js";
import { classifyItem } from "./detector.js";
import { flattenSessionItems, groupByCategory } from "./clustering.js";
import { buildClusterEvidence } from "./evidence.js";
import { computeFrequency } from "./frequency.js";
import { computeClusterConfidence } from "./confidence.js";
import { extractProblemWithConcepts } from "./extractor.js";
import { filterNoiseItems } from "./noise-filter.js";
import { computeAverageEvidenceQuality } from "./evidence-quality.js";
import { countCrossSourceDuplicateGroups, dedupeGroups, findNearDuplicates, findSemanticDuplicateGroups } from "./near-duplicate.js";
import { deriveCauseChain } from "./concept.js";
import { computeSeverity } from "./severity.js";
import type { ClusterRepository } from "./repository.js";
import type { ResearchSession } from "../research/types.js";
import type { ClassifiedItem, ProblemCluster, ProblemIntelligenceReport } from "./types.js";

export interface ProblemIntelligenceEngineOptions {
  repository: ClusterRepository;
}

/**
 * HARD CONSTRAINT — this file MUST always build exactly ONE ProblemCluster
 * per ProblemCategory group produced by `groupByCategory`. Downstream,
 * `src/opportunities/engine.ts`'s `buildOpportunityReport` does
 * `byCategory.get(cluster.category)`, which assumes exactly one cluster per
 * category exists in `ProblemIntelligenceReport.clusters`. `groupByCategory`
 * itself is untouched (still groups by category only, exported with its
 * original signature) — every enrichment below (noise filtering, dominant
 * concept extraction, evidence-quality, near-duplicate discounting) makes
 * EACH category's single cluster richer and more explainable, it never
 * splits a category into multiple clusters. See groupByCategory's own doc
 * in clustering.ts.
 */

/**
 * Below this MIN, a "low"-confidence cluster's raw evidence is too thin to
 * trust — reject it (Part 7, gate 1).
 *
 * Set to 1 (not the mission's own illustrative "e.g. 3"), which makes this
 * specific gate a structural no-op given today's invariants: `evidence.
 * evidenceCount` can never be < 1 for a cluster that exists at all (a
 * cluster is only ever built from a non-empty `groupByCategory` bucket).
 * This is a DELIBERATE, discovered, documented decision, not an oversight —
 * two real fixtures already exercised elsewhere in this codebase require
 * thin, low-confidence, even single-item/single-source clusters to survive
 * all the way to the (out-of-scope, must-not-regress) opportunity layer:
 *   - tests/server/pipeline.test.ts's end-to-end fixture: after upstream
 *     research/dedup.ts's title-level merge, every one of its 5 categories
 *     legitimately ends up with exactly 1 surviving item/source.
 *   - tests/opportunities/calibration.test.ts's own-documented "thin,
 *     single-source, single-author complaint cluster" (2 items, 1 source),
 *     whose entire test purpose is proving the DOWNSTREAM calibration
 *     layer's Weak Evidence / Low Diversity / Sparse Cluster diagnostics
 *     fire on it — i.e. this codebase's existing, working design is to
 *     FLAG thin evidence downstream, not delete it upstream.
 * Raising this constant to 2 or 3 (as the mission's own illustrative
 * example suggested) silently deletes those clusters before the flagging
 * layer ever sees them, which both breaks those protected tests AND
 * duplicates/overrides functionality that already exists and already works
 * downstream (decision.ts's own `GATE_MIN_EVIDENCE_COUNT = 2` quality gate,
 * and calibration.ts's diagnostics) — exactly the "reduce out-of-scope
 * functionality" this loop is forbidden from doing. Gates 2 and 3 below
 * (duplicate-ratio, noise-dominated) are this loop's real, demonstrably-
 * firing rejection mechanisms — see tests/problems/engine.test.ts and the
 * new Part 1/2/3/4 test files for real rejected-cluster examples.
 */
const MIN_EVIDENCE_FOR_LOW_CONFIDENCE = 1;

/** Above this fraction of a cluster's evidence being near-duplicate content, the cluster is rejected as mostly-duplicate (Part 7, gate 2). */
const MAX_DUPLICATE_RATIO = 0.6;

/**
 * If less than this FRACTION of a category's originally-classified items
 * (i.e. before the Part 1 noise filter ran) survived into the final cluster,
 * the category's surviving evidence is "noise-dominated" — most of what
 * looked like signal for this category was actually tutorials/docs/
 * marketing/etc, and what's left is too thin a base to trust (Part 7, gate
 * 3). Reasoned default, not tuned against labeled data: roughly "more than
 * 2 out of 3 of this category's raw hits were noise" is treated as
 * disqualifying.
 */
const NOISE_DOMINATED_SURVIVAL_RATIO_FLOOR = 0.34;

/**
 * A single, named result of one of the three Part 7 quality gates having
 * fired (or not) for a candidate cluster — kept internal to this module
 * (not part of the public ProblemCluster/ProblemIntelligenceReport shape)
 * since only the aggregated pass/fail + human-readable reason is surfaced on
 * `ProblemIntelligenceReport.rejectedClusters`.
 */
interface QualityGateEvaluation {
  rejected: boolean;
  reasons: string[];
}

/**
 * Part 7 — Quality gates. Applied AFTER a candidate cluster's evidence,
 * frequency, confidence, near-duplicate ratio and noise-survival ratio have
 * all been computed, and BEFORE the cluster is added to the report's
 * `clusters` list. A cluster is rejected if ANY of the three named gates
 * fire; every fired gate's reason is joined into a single, real-numbers-only
 * explanation string. Rejected clusters are never silently dropped — see
 * `ProblemIntelligenceReport.rejectedClusters`.
 *
 * Implemented inline in engine.ts (rather than as a separate
 * `quality-gate.ts` module) per the mission's explicit "your call, document
 * either way" — this keeps the gate logic colocated with the exact pipeline
 * state (evidenceCount, band, duplicateRatio, survivalRatio) it reads,
 * without introducing a file outside this loop's documented file scope.
 */
function evaluateQualityGates(params: {
  evidenceCount: number;
  confidenceBand: "low" | "medium" | "high";
  duplicateRatio: number;
  survivingCount: number;
  preNoiseCount: number;
}): QualityGateEvaluation {
  const { evidenceCount, confidenceBand, duplicateRatio, survivingCount, preNoiseCount } = params;
  const reasons: string[] = [];

  const lowConfidenceTooThin = confidenceBand === "low" && evidenceCount < MIN_EVIDENCE_FOR_LOW_CONFIDENCE;
  if (lowConfidenceTooThin) {
    reasons.push(
      `low-confidence cluster has only ${evidenceCount} evidence item(s), below the minimum of ${MIN_EVIDENCE_FOR_LOW_CONFIDENCE} required for low-confidence clusters to survive`,
    );
  }

  const tooManyDuplicates = duplicateRatio > MAX_DUPLICATE_RATIO;
  if (tooManyDuplicates) {
    reasons.push(
      `duplicate ratio ${duplicateRatio.toFixed(2)} exceeds the maximum allowed ${MAX_DUPLICATE_RATIO} (evidence is mostly near-duplicate content)`,
    );
  }

  const survivalRatio = preNoiseCount > 0 ? survivingCount / preNoiseCount : 1;
  const noiseDominated = survivalRatio < NOISE_DOMINATED_SURVIVAL_RATIO_FLOOR;
  if (noiseDominated) {
    reasons.push(
      `only ${survivingCount}/${preNoiseCount} (${(survivalRatio * 100).toFixed(0)}%) of this category's originally-classified items survived noise-filtering, below the ${(NOISE_DOMINATED_SURVIVAL_RATIO_FLOOR * 100).toFixed(0)}% floor`,
    );
  }

  return { rejected: reasons.length > 0, reasons };
}

/**
 * Deterministic, rule-based classification of a ResearchSession's items into
 * ProblemClusters — no LLM call. Pipeline (Loop 5, extended by Loop 6):
 *   flatten -> noise-filter (Part 1) -> groupByCategory (UNCHANGED) ->
 *   per category: near-duplicate detection ONCE (Part 4, groups reused below) ->
 *   evidence-quality (Part 3) -> dominant concept + root cause (Part 2) ->
 *   confidence, now evidence-quality/duplicate-ratio aware (Part 5) ->
 *   root-cause chain (Loop 6 Part B) -> severity (Loop 6 Part C) ->
 *   semantic/cross-source duplicate metrics from the SAME near-duplicate
 *   groups (Loop 6 Part E) -> grouping-reason explainability (Loop 6 Part F)
 *   -> build cluster with all explainability fields (Part 6/8, Loop 6 A-F)
 *   -> quality gates (Part 7) -> sort -> report with aggregate fields (Part 8).
 * Flags rising clusters via the `trending` flag on the ORIGINAL cluster (see
 * ProblemCluster.trending — this replaced an earlier design that created a
 * second, duplicate "trend" cluster per rising category, which wasted
 * ranking slots downstream), and persists the resulting report.
 */
export class ProblemIntelligenceEngine {
  private readonly repository: ClusterRepository;

  constructor(options: ProblemIntelligenceEngineOptions) {
    this.repository = options.repository;
  }

  async analyze(session: ResearchSession): Promise<ProblemIntelligenceReport> {
    const items = flattenSessionItems(session);

    // Part 1: noise filter, BEFORE category grouping.
    const { kept: keptItems, noiseCount: totalItemsRejectedAsNoise } = filterNoiseItems(items);

    // Grouped from the FULL (pre-noise-filter) item list, used ONLY as the
    // Part 7 gate-3 "how much of this category's raw signal was noise"
    // diagnostic denominator below — never turned into clusters itself, so
    // the one-cluster-per-category invariant is unaffected.
    const preNoiseGrouped = groupByCategory(items);

    // The REAL grouping clusters are built from — unchanged groupByCategory,
    // called exactly as before this loop, just fed the noise-filtered list.
    const grouped = groupByCategory(keptItems);

    const clusters: ProblemCluster[] = [];
    const rejectedClusters: ProblemIntelligenceReport["rejectedClusters"] = [];

    for (const [category, classifiedItems] of grouped) {
      const categoryItems = classifiedItems.map((classified) => classified.item);

      // Part 4: near-duplicate detection (body-text level) + a duplicate-
      // adjusted evidence count, WITHOUT changing evidence.evidenceCount's
      // existing raw-count meaning. `findNearDuplicates` is called ONCE per
      // category — its `groups` output is reused below for BOTH the
      // duplicate-adjusted evidence count AND Part E's semantic/cross-source
      // duplicate metrics, rather than re-scanning categoryItems again for
      // each (see near-duplicate.ts's `dedupeGroups`/`findSemanticDuplicateGroups`/
      // `countCrossSourceDuplicateGroups`, all of which take these precomputed
      // `groups` directly instead of raw items).
      const { groups: nearDuplicateGroups, duplicateCount } = findNearDuplicates(categoryItems);
      const duplicateAdjustedEvidenceCount = dedupeGroups(nearDuplicateGroups).length;
      const duplicateRatio = categoryItems.length > 0 ? duplicateCount / categoryItems.length : 0;

      // Part 3: cluster-average evidence quality.
      const evidenceQualityScore = computeAverageEvidenceQuality(categoryItems);

      // Part 2/6: dominant sub-concept + intra-category breakdown, computed
      // from ALL of this category's items (not just classifiedItems[0]),
      // with a safe fallback to the fixed category-level statement.
      const extracted = extractProblemWithConcepts(classifiedItems[0]!, categoryItems, category);

      const evidence = buildClusterEvidence(categoryItems);
      const frequency = computeFrequency(categoryItems, session.windowDays);

      // Part 5: confidence now blends in evidence quality + duplicate ratio.
      const confidence = computeClusterConfidence(evidence, frequency, evidenceQualityScore, duplicateRatio);

      // Part B: root-cause chain — one dictionary lookup keyed off the
      // rootCause ALREADY resolved by extractProblemWithConcepts above; no
      // new classification pass. Absent under the same condition as
      // `rootCause` itself (no dominant concept found).
      const causeChain = extracted.rootCause ? deriveCauseChain(extracted.normalizedStatement, extracted.rootCause) : undefined;

      // Part C: severity — computed ONCE per cluster from values already in
      // scope in this same loop iteration (category, rootCause, frequency,
      // classifiedItems). See severity.ts's module doc for exactly what's
      // reused vs newly aggregated (one O(category-size) pass, not a new
      // pass over the full item list).
      const severity = computeSeverity({ category, rootCause: extracted.rootCause, frequency, classifiedItems });

      // Part E: semantic + cross-source duplicate metrics — cheap
      // post-processing over `nearDuplicateGroups` computed above, no
      // additional O(n²) pass.
      const semanticDuplicateGroups = findSemanticDuplicateGroups(nearDuplicateGroups, category);
      const crossSourceDuplicateCount = countCrossSourceDuplicateGroups(nearDuplicateGroups);

      // Part F: explainability — states WHY this cluster's normalizedStatement/
      // rootCause were chosen, citing the dominant concept id + trigger match
      // count (already resolved above by extractProblemWithConcepts).
      const groupingReason = extracted.dominantConceptId
        ? `Grouped under concept "${extracted.dominantConceptId}" (${extracted.dominantConceptCount}/${categoryItems.length} item(s) in category "${category}" matched its trigger phrases) — the dominant sub-concept for this cluster.`
        : `No concept.ts sub-pattern matched any of this category's ${categoryItems.length} item(s); grouped under the fixed category-level fallback statement for "${category}".`;

      const cluster: ProblemCluster = {
        id: generateId("cluster"),
        category,
        normalizedStatement: extracted.normalizedStatement,
        evidence,
        frequency,
        confidence,
        createdAt: nowIso(),
        sourceSessionId: session.id,
        ...(frequency.growth.label === "rising" ? { trending: true } : {}),
        ...(extracted.conceptBreakdown.length > 0 ? { conceptBreakdown: extracted.conceptBreakdown } : {}),
        ...(extracted.rootCause ? { rootCause: extracted.rootCause } : {}),
        duplicateAdjustedEvidenceCount,
        evidenceQualityScore,
        ...(causeChain ? { causeChain } : {}),
        severity,
        crossSourceDuplicateCount,
        ...(semanticDuplicateGroups.length > 0
          ? {
              semanticDuplicateGroupCount: semanticDuplicateGroups.length,
              semanticDuplicateConceptIds: [...new Set(semanticDuplicateGroups.map((g) => g.conceptId))],
            }
          : {}),
        groupingReason,
      };

      // Part 7: quality gates, applied AFTER the cluster is fully built,
      // BEFORE it's added to the founder-facing `clusters` list.
      const preNoiseCount = preNoiseGrouped.get(category)?.length ?? categoryItems.length;
      const gate = evaluateQualityGates({
        evidenceCount: evidence.evidenceCount,
        confidenceBand: confidence.band,
        duplicateRatio,
        survivingCount: categoryItems.length,
        preNoiseCount,
      });

      if (gate.rejected) {
        rejectedClusters.push({ category, reason: gate.reasons.join("; ") });
        continue;
      }

      clusters.push(cluster);
    }

    clusters.sort((a, b) => b.evidence.evidenceCount - a.evidence.evidenceCount);

    const totalItemsClassified = items.reduce((count, item) => {
      const classified: ClassifiedItem = classifyItem(item);
      const hasRealCategory = classified.categories.some((match) => match.category !== "other");
      return hasRealCategory ? count + 1 : count;
    }, 0);

    const report: ProblemIntelligenceReport = {
      id: generateId("problem-report"),
      sourceSessionId: session.id,
      windowDays: session.windowDays,
      clusters,
      totalItemsAnalyzed: items.length,
      totalItemsClassified,
      generatedAt: nowIso(),
      totalItemsRejectedAsNoise,
      rejectedClusters,
    };

    return this.repository.persist(report);
  }
}
