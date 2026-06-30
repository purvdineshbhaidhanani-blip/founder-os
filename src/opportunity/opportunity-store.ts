import { generateId, nowIso } from "../utils/id.js";
import type { CollectedItem, Opportunity, OpportunityEvidence, PainScore, Signal, WorkaroundKind } from "./types.js";
import type { SignalCluster } from "./repetition-engine.js";
import { calculatePainScore } from "./pain-detector.js";

// ---------------------------------------------------------------------------
// Opportunity Store — builds and persists Opportunity records from clusters.
// In-memory for Phase 1; can be swapped for a persistent backend later.
// ---------------------------------------------------------------------------

export class OpportunityStore {
  private readonly opportunities = new Map<string, Opportunity>();

  /**
   * Upserts an Opportunity from a SignalCluster.
   * If a matching clusterKey already exists it merges new evidence.
   */
  upsert(cluster: SignalCluster, items: CollectedItem[]): Opportunity {
    const existing = this.byKey(cluster.clusterKey);
    const itemMap = new Map<string, CollectedItem>(items.map((i) => [i.id, i]));
    const painScore = calculatePainScore(cluster.signals, items, cluster.signals.length);
    const evidence = buildEvidence(cluster.signals, itemMap);
    const sources = [...cluster.sources] as Opportunity["sources"];
    const workarounds = uniqueWorkarounds(cluster.workarounds);

    if (existing) {
      // Merge new evidence
      const mergedEvidence = mergeEvidence(existing.evidence, evidence);
      const mergedSources = [...new Set([...existing.sources, ...sources])] as Opportunity["sources"];
      const mergedWorkarounds = [...new Set([...existing.workaroundsDetected, ...workarounds])] as WorkaroundKind[];
      const updated: Opportunity = {
        ...existing,
        evidence: mergedEvidence,
        painScore,
        buyingIntentSignals: cluster.buyingIntentCount,
        workaroundsDetected: mergedWorkarounds,
        sources: mergedSources,
        confidence: painScore.confidence,
        signalCount: cluster.signals.length,
        updatedAt: nowIso(),
      };
      this.opportunities.set(existing.id, updated);
      return updated;
    }

    const opportunity: Opportunity = {
      id: generateId("opp"),
      status: "discovered",
      problemSummary: cluster.label,
      category: cluster.signals[0]?.category ?? "other",
      evidence,
      painScore,
      buyingIntentSignals: cluster.buyingIntentCount,
      workaroundsDetected: workarounds,
      sources,
      confidence: painScore.confidence,
      signalCount: cluster.signals.length,
      clusterKey: cluster.clusterKey,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.opportunities.set(opportunity.id, opportunity);
    return opportunity;
  }

  get(id: string): Opportunity | undefined {
    return this.opportunities.get(id);
  }

  byKey(clusterKey: string): Opportunity | undefined {
    for (const opp of this.opportunities.values()) {
      if (opp.clusterKey === clusterKey) return opp;
    }
    return undefined;
  }

  list(): Opportunity[] {
    return [...this.opportunities.values()].sort((a, b) => {
      // Sort: buying intent → confidence → signal count
      const aScore = a.buyingIntentSignals * 5 + a.confidence * 3 + Math.log(a.signalCount + 1);
      const bScore = b.buyingIntentSignals * 5 + b.confidence * 3 + Math.log(b.signalCount + 1);
      return bScore - aScore;
    });
  }

  size(): number {
    return this.opportunities.size;
  }

  /** Serialise all opportunities to a JSON-safe structure. */
  toJSON(): Opportunity[] {
    return this.list().map((o) => ({
      ...o,
      sources: [...o.sources],
    }));
  }
}

function buildEvidence(signals: Signal[], itemMap: Map<string, CollectedItem>): OpportunityEvidence[] {
  return signals.slice(0, 20).map((sig) => {
    const item = itemMap.get(sig.itemId);
    return {
      signalId: sig.id,
      itemId: sig.itemId,
      source: sig.source,
      url: item?.url ?? "",
      quote: sig.rawQuote,
      signalType: sig.type,
      engagement: item?.engagement ?? {},
    };
  });
}

function mergeEvidence(existing: OpportunityEvidence[], incoming: OpportunityEvidence[]): OpportunityEvidence[] {
  const seen = new Set(existing.map((e) => e.signalId));
  const novel = incoming.filter((e) => !seen.has(e.signalId));
  return [...existing, ...novel].slice(0, 50);
}

function uniqueWorkarounds(kinds: WorkaroundKind[]): WorkaroundKind[] {
  return [...new Set(kinds)];
}
