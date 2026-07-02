import { generateId, nowIso } from "../utils/id.js";
import { classifyItem } from "./detector.js";
import { flattenSessionItems, groupByCategory } from "./clustering.js";
import { buildClusterEvidence } from "./evidence.js";
import { computeFrequency } from "./frequency.js";
import { computeClusterConfidence } from "./confidence.js";
import { extractProblem } from "./extractor.js";
import type { ClusterRepository } from "./repository.js";
import type { ResearchSession } from "../research/types.js";
import type { ClassifiedItem, ProblemCluster, ProblemIntelligenceReport } from "./types.js";

export interface ProblemIntelligenceEngineOptions {
  repository: ClusterRepository;
}

/**
 * Deterministic, rule-based classification of a ResearchSession's items into
 * ProblemClusters — no LLM call. Groups items by category, computes
 * evidence/frequency/confidence per cluster, flags rising clusters via the
 * `trending` flag on the ORIGINAL cluster (see ProblemCluster.trending —
 * this replaced an earlier design that created a second, duplicate "trend"
 * cluster per rising category, which wasted ranking slots downstream), and
 * persists the resulting report.
 */
export class ProblemIntelligenceEngine {
  private readonly repository: ClusterRepository;

  constructor(options: ProblemIntelligenceEngineOptions) {
    this.repository = options.repository;
  }

  async analyze(session: ResearchSession): Promise<ProblemIntelligenceReport> {
    const items = flattenSessionItems(session);
    const grouped = groupByCategory(items);

    const clusters: ProblemCluster[] = [];

    for (const [category, classifiedItems] of grouped) {
      const categoryItems = classifiedItems.map((classified) => classified.item);
      const evidence = buildClusterEvidence(categoryItems);
      const frequency = computeFrequency(categoryItems, session.windowDays);
      const confidence = computeClusterConfidence(evidence, frequency);
      const extracted = extractProblem(classifiedItems[0]!, category);

      // A cluster with rising mention volume is flagged `trending: true` on
      // itself rather than spawning a second, duplicate "trend" cluster
      // (see ProblemCluster.trending doc comment for why).
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
      };
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
    };

    return this.repository.persist(report);
  }
}
