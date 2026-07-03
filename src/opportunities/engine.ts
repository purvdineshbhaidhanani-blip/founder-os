import { generateId, nowIso } from "../utils/id.js";
import { flattenSessionItems, groupByCategory } from "../problems/clustering.js";
import { computeBuyingIntentScore } from "./buying-intent.js";
import { extractCompetitionEvidence } from "./competition.js";
import { estimateBuildDifficulty } from "./difficulty.js";
import { extractPricingSignal } from "./pricing.js";
import { getRecommendedMvp, getTargetUsers } from "./mvp-template.js";
import { computeOpportunityScore } from "./scoring.js";
import { computeFois } from "./fois.js";
import { decideRecommendation } from "./recommendation.js";
import { dedupeOpportunities } from "./dedup.js";
import { buildFounderDecision } from "./decision.js";
import { mergeSynonymOpportunities } from "./semantic.js";
import type { OpportunityRepository } from "./repository.js";
import type { ProblemCluster, ProblemIntelligenceReport } from "../problems/types.js";
import type { ResearchSession } from "../research/types.js";
import type { FounderOpportunityReport, SemanticClusterInfo, TopOpportunitiesReport } from "./types.js";

export interface OpportunityEngineOptions {
  repository: OpportunityRepository;
}

const TOP_N = 10;

function topSourceIdOf(sourceBreakdown: Record<string, number>): string {
  let bestId = "unknown";
  let bestCount = -1;
  for (const [sourceId, count] of Object.entries(sourceBreakdown)) {
    if (count > bestCount) {
      bestId = sourceId;
      bestCount = count;
    }
  }
  return bestId;
}

function estimatedTimeToMvpFor(tier: "low" | "medium" | "high"): string {
  if (tier === "low") return "2-4 weeks (heuristic estimate)";
  if (tier === "medium") return "4-8 weeks (heuristic estimate)";
  return "8-16+ weeks (heuristic estimate)";
}

/**
 * Deterministic, rule-based translation of ProblemIntelligenceReport clusters
 * into founder-facing, ranked build opportunities. No LLM call — every
 * formula/threshold is delegated to the fixed-constant modules in this
 * directory.
 */
export class OpportunityEngine {
  private readonly repository: OpportunityRepository;

  constructor(options: OpportunityEngineOptions) {
    this.repository = options.repository;
  }

  async analyze(
    session: ResearchSession,
    problemReport: ProblemIntelligenceReport,
  ): Promise<TopOpportunitiesReport> {
    const allItems = flattenSessionItems(session);
    const byCategory = groupByCategory(allItems);

    const built: FounderOpportunityReport[] = [];

    for (const cluster of problemReport.clusters) {
      built.push(this.buildOpportunityReport(cluster, byCategory, session, problemReport));
    }

    // Ranking driver: Founder Opportunity Intelligence Score (fois.ts),
    // replacing scoreBreakdown.weightedTotal per the Loop 2 mission.
    // scoreBreakdown itself is left untouched for existing UI/export
    // consumers.
    built.sort((a, b) => b.fois.overall - a.fois.overall);

    // Final duplicate-opportunity safety net (Loop 4 Phase 3), run AFTER
    // ranking and BEFORE the Top-10 cut — see dedup.ts module doc for the
    // exact criteria and why dropping (not merging) was chosen.
    const deduped = dedupeOpportunities(built);

    // Loop 3 Part A: a second, semantic-level (canonical-alias) safety net,
    // run AFTER dedup's stricter URL/competitor-based pass and BEFORE the
    // Top-10 cut, so a synonym collision dedup's exact-match rules missed
    // still only occupies one Top-N slot. See semantic.ts module doc for
    // why this is expected to be a clean no-op given upstream category
    // clustering, and for why merging here preserves dedup's output order
    // instead of introducing a new sort.
    const { merged: semanticMerged, aliasGroups } = mergeSynonymOpportunities(deduped);
    const opportunities = semanticMerged.slice(0, TOP_N);

    const report: TopOpportunitiesReport = {
      id: generateId("opportunity-report"),
      sourceSessionId: session.id,
      sourceProblemReportId: problemReport.id,
      opportunities,
      totalClustersConsidered: problemReport.clusters.length,
      generatedAt: nowIso(),
      semanticMerge: { aliasGroupsApplied: aliasGroups.length, aliasGroups },
    };

    return this.repository.persist(report);
  }

  private buildOpportunityReport(
    cluster: ProblemCluster,
    byCategory: ReturnType<typeof groupByCategory>,
    session: ResearchSession,
    problemReport: ProblemIntelligenceReport,
  ): FounderOpportunityReport {
    const clusterItems = byCategory.get(cluster.category) ?? [];
    const rawItems = clusterItems.map((classified) => classified.item);

    const buyingIntent = computeBuyingIntentScore(clusterItems);
    const competition = extractCompetitionEvidence(rawItems);
    const difficulty = estimateBuildDifficulty(rawItems);
    const pricing = extractPricingSignal(rawItems);
    const scoreBreakdown = computeOpportunityScore({ cluster, buyingIntent, competition });
    const recommendation = decideRecommendation(scoreBreakdown, cluster, buyingIntent);
    const fois = computeFois({ cluster, clusterItems, rawItems, buyingIntent, competition, pricing });

    const recommendedMvp = getRecommendedMvp(cluster.category);
    const topSourceId = topSourceIdOf(cluster.evidence.sourceBreakdown);
    const targetUsers = getTargetUsers(cluster.category, topSourceId);
    const estimatedTimeToMvp = estimatedTimeToMvpFor(difficulty.tier);

    // Loop 3 Founder Decision layer (decision.ts, Parts B-G) — a
    // composition over the signals already computed above. Additive: none
    // of the fields above are modified by this call.
    const decision = buildFounderDecision({
      cluster,
      clusterItems,
      buyingIntent,
      competition,
      pricing,
      buildDifficulty: difficulty,
      fois,
      recommendation,
      targetUsers,
    });

    // Trivial "no merge yet" default — semantic.ts's mergeSynonymOpportunities
    // (run once over the whole ranked list, after dedup, in `analyze` below)
    // overwrites this on every surviving report, merged or not. Set here so
    // the object is fully and validly typed even between construction and
    // that later pass.
    const semanticCluster: SemanticClusterInfo = {
      canonicalTitle: cluster.normalizedStatement,
      aliases: [],
      mentionCount: cluster.evidence.evidenceCount,
      supportingSources: Object.keys(cluster.evidence.sourceBreakdown).sort(),
      mergedCount: 1,
    };

    const representativeQuotes = cluster.evidence.representativeExamples.map((item) => ({
      text: (item.title + (item.body ? ` — ${item.body}` : "")).slice(0, 280),
      url: item.url,
      source: item.sourceId,
    }));

    const summary = `${cluster.evidence.evidenceCount} mentions of "${cluster.normalizedStatement}" found across ${cluster.frequency.uniqueSources} source(s).`;

    const report: FounderOpportunityReport = {
      id: generateId("opportunity"),
      clusterId: cluster.id,
      category: cluster.category,
      problem: cluster.normalizedStatement,
      summary,
      painScore: scoreBreakdown.painFrequency,
      buyingIntent,
      competition,
      confidence: { band: cluster.confidence.band, score: cluster.confidence.score },
      scoreBreakdown,
      fois,
      supportingEvidence: {
        evidenceCount: cluster.evidence.evidenceCount,
        sourceBreakdown: cluster.evidence.sourceBreakdown,
        urls: cluster.evidence.originalUrls,
      },
      representativeQuotes,
      recommendedMvp,
      suggestedPricing: pricing,
      targetUsers,
      buildDifficulty: difficulty,
      estimatedTimeToMvp,
      recommendation,
      createdAt: nowIso(),
      sourceSessionId: session.id,
      sourceProblemReportId: problemReport.id,
      decision,
      semanticCluster,
    };

    return report;
  }
}
