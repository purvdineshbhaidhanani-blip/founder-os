import { nowIso } from "../../utils/id.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { CourtDecision } from "../decision/types.js";
import type { ChangeEvent } from "./types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Knowledge Updater — integrates with Founder OS knowledge graph
// ---------------------------------------------------------------------------

export interface KnowledgeNode {
  id: string;
  type: "opportunity" | "category" | "change" | "market-signal";
  label: string;
  attributes: Record<string, unknown>;
  updatedAt: string;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: string;
  weight: number;
}

export class KnowledgeUpdater {
  private readonly nodes = new Map<string, KnowledgeNode>();
  private readonly edges: KnowledgeEdge[] = [];

  constructor(private readonly audit: AuditLog) {}

  indexOpportunity(intel: OpportunityIntelligence, decision: CourtDecision): void {
    const nodeId = `opp:${intel.opportunityId}`;
    this.nodes.set(nodeId, {
      id: nodeId,
      type: "opportunity",
      label: intel.opportunityId,
      attributes: {
        category: intel.category,
        confidence: intel.overallConfidence,
        verdict: decision.verdict,
        isRejected: intel.rejected,
      },
      updatedAt: nowIso(),
    });

    // Category node
    const catId = `cat:${intel.category}`;
    if (!this.nodes.has(catId)) {
      this.nodes.set(catId, {
        id: catId,
        type: "category",
        label: intel.category,
        attributes: { count: 0 },
        updatedAt: nowIso(),
      });
    }
    const catNode = this.nodes.get(catId)!;
    (catNode.attributes.count as number);
    catNode.attributes.count = (catNode.attributes.count as number) + 1;
    catNode.updatedAt = nowIso();

    this.addEdge(nodeId, catId, "belongs-to", intel.overallConfidence);
  }

  indexChangeEvent(event: ChangeEvent): void {
    const nodeId = `chg:${event.id}`;
    this.nodes.set(nodeId, {
      id: nodeId,
      type: "change",
      label: event.changeType,
      attributes: { impactScore: event.impactScore, detectedAt: event.detectedAt },
      updatedAt: nowIso(),
    });
    this.addEdge(`opp:${event.opportunityId}`, nodeId, "affected-by", event.impactScore);
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  relatedOpportunities(category: string): KnowledgeNode[] {
    const catId = `cat:${category}`;
    return this.edges
      .filter((e) => e.to === catId && e.relation === "belongs-to")
      .map((e) => this.nodes.get(e.from))
      .filter((n): n is KnowledgeNode => n !== undefined);
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  edgeCount(): number {
    return this.edges.length;
  }

  private addEdge(from: string, to: string, relation: string, weight: number): void {
    const existing = this.edges.find((e) => e.from === from && e.to === to && e.relation === relation);
    if (existing) {
      existing.weight = weight;
    } else {
      this.edges.push({ from, to, relation, weight });
    }
  }
}
