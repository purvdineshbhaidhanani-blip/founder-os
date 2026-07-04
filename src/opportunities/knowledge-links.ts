import { ALL_MONITOR_PROVIDERS } from "../monitoring/index.js";
import type { FounderOpportunityReport } from "./types.js";

/**
 * Phase 8 — Knowledge Links relationship layer.
 *
 * A RELATIONSHIP layer, NOT a graph database (none exists in this codebase,
 * none is added here — the architecture is final). This module composes a
 * small set of typed, directed, ID-reference edges between report sections
 * that are ALREADY computed, following the fixed chain:
 *
 *   Problem -> Competitors -> Customer -> Market -> Revenue -> Execution -> Monitoring
 *
 * Every node/edge below is built ONLY from field VALUES already present on
 * an already-populated `FounderOpportunityReport` (`report.competition`,
 * `report.businessIntelligence`, `report.aiDecisionValidation`,
 * `report.marketIntelligence`, `report.revenueIntelligence`,
 * `report.mvpPlan`, `report.goToMarket`, `report.founderIntelligence`) plus
 * the static, read-only monitoring-provider registry
 * (`src/monitoring`'s `ALL_MONITOR_PROVIDERS`, imported for its `id`/
 * `category` fields only — never called, never given live network access
 * here). No LLM call, no network, no re-derivation of clustering/FOIS/
 * decision/calibration/founderIntelligence/aiDecisionValidation/the 6
 * founder-business-intelligence bundles, no re-scan of raw evidence items,
 * no O(n) raw-evidence scan of any kind. A node or edge is NEVER fabricated:
 * every `id`/`label`/`reason` traces back to a real, already-computed field,
 * and every "monitoring" edge is explicitly framed as a CAPABILITY
 * reference ("this could be watched by provider X going forward") — it
 * NEVER asserts that a real monitoring event has occurred, since no live
 * monitoring data exists anywhere in this module's inputs.
 */

/* ========================================================================= */
/* Node / edge shapes                                                       */
/* ========================================================================= */

export type KnowledgeNodeType = "problem" | "competitor" | "customer" | "market" | "revenue" | "execution" | "monitoring-capability";

export interface KnowledgeNode {
  /** Stable, typed id — e.g. "problem:<clusterId>", "competitor:<name>", "monitoring:<providerId>". Always built from a real, already-computed value; never invented. */
  id: string;
  type: KnowledgeNodeType;
  /** Human-readable label, reused verbatim (or lightly composed) from the real field(s) this node is grounded in. */
  label: string;
  /** Cites the exact already-computed field(s) this node is grounded in. */
  reason: string;
}

/**
 * Fixed, documented relation taxonomy. Every relation name describes a
 * REFERENCE between two already-computed report sections — never a claim
 * about a real-world event that hasn't itself been evidenced elsewhere on
 * the report. `could-be-watched-by` is the one CAPABILITY relation (see
 * `monitoringEdgesFor`): it is explicitly never an assertion that a real
 * monitored change has occurred.
 */
export type KnowledgeRelation =
  | "threatens"
  | "affects"
  | "competes-for-attention-of"
  | "operates-in"
  | "shapes-monetization-of"
  | "funds-scope-of"
  | "sequenced-before"
  | "could-be-watched-by";

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: KnowledgeRelation;
  /** Cites the exact already-computed field(s) that back this edge. */
  reason: string;
}

export interface KnowledgeLinksResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

/* ========================================================================= */
/* Node builders                                                            */
/* ========================================================================= */

function problemNodeFor(report: FounderOpportunityReport): KnowledgeNode {
  return {
    id: `problem:${report.clusterId}`,
    type: "problem",
    label: report.problem,
    reason: `report.clusterId="${report.clusterId}"; report.problem="${report.problem}" (the source ProblemCluster's normalizedStatement).`,
  };
}

function customerNodeFor(report: FounderOpportunityReport): KnowledgeNode {
  const icp = report.aiDecisionValidation.founderOpportunity.idealCustomerProfile;
  const buyer = report.businessIntelligence.primaryBuyer;
  return {
    id: `customer:${report.clusterId}`,
    type: "customer",
    label: icp,
    reason: `aiDecisionValidation.founderOpportunity.idealCustomerProfile="${icp}"; businessIntelligence.primaryBuyer="${buyer}".`,
  };
}

function marketNodeFor(report: FounderOpportunityReport): KnowledgeNode {
  const mi = report.marketIntelligence;
  return {
    id: `market:${report.clusterId}`,
    type: "market",
    label: `${mi.marketMaturity} market (saturation=${mi.saturation}, window=${mi.opportunityWindow})`,
    reason: `marketIntelligence.marketMaturity="${mi.marketMaturity}"; marketIntelligence.saturation="${mi.saturation}"; marketIntelligence.opportunityWindow="${mi.opportunityWindow}".`,
  };
}

function revenueNodeFor(report: FounderOpportunityReport): KnowledgeNode {
  const ri = report.revenueIntelligence;
  return {
    id: `revenue:${report.clusterId}`,
    type: "revenue",
    label: `${ri.revenueModel} (${ri.revenuePotential} potential)`,
    reason: `revenueIntelligence.revenueModel="${ri.revenueModel}"; revenueIntelligence.revenuePotential="${ri.revenuePotential}".`,
  };
}

interface ExecutionNodes {
  mvp: KnowledgeNode;
  gtm: KnowledgeNode;
}

function executionNodesFor(report: FounderOpportunityReport): ExecutionNodes {
  const mvp = report.mvpPlan;
  const gtm = report.goToMarket;
  return {
    mvp: {
      id: `execution:mvp:${report.clusterId}`,
      type: "execution",
      label: mvp.recommendedMvp,
      reason: `mvpPlan.recommendedMvp="${mvp.recommendedMvp}"; mvpPlan.buildDifficulty="${mvp.buildDifficulty}".`,
    },
    gtm: {
      id: `execution:gtm:${report.clusterId}`,
      type: "execution",
      label: gtm.launchStrategy,
      reason: `goToMarket.launchStrategy="${gtm.launchStrategy}".`,
    },
  };
}

/* ========================================================================= */
/* Competitor nodes/edges (Problem -> Competitors -> Customer)              */
/* ========================================================================= */

interface CompetitorLayer {
  nodes: KnowledgeNode[];
  /** problem -> competitor "threatens" edges. */
  threatensEdges: KnowledgeEdge[];
  /** competitor -> customer "competes-for-attention-of" edges. */
  competesEdges: KnowledgeEdge[];
}

function competitorLayerFor(report: FounderOpportunityReport, problemNodeId: string, customerNodeId: string): CompetitorLayer {
  const competitors = report.competition.competitors;
  const nodes: KnowledgeNode[] = [];
  const threatensEdges: KnowledgeEdge[] = [];
  const competesEdges: KnowledgeEdge[] = [];

  for (const competitor of competitors) {
    const competitorNodeId = `competitor:${competitor.name}`;
    nodes.push({
      id: competitorNodeId,
      type: "competitor",
      label: competitor.name,
      reason: `report.competition.competitors[].name="${competitor.name}" (mentionCount=${competitor.mentionCount}).`,
    });
    threatensEdges.push({
      from: problemNodeId,
      to: competitorNodeId,
      relation: "threatens",
      reason: `report.competition.competitors[].name="${competitor.name}" is already-evidenced competition for this problem (mentionCount=${competitor.mentionCount}).`,
    });
    competesEdges.push({
      from: competitorNodeId,
      to: customerNodeId,
      relation: "competes-for-attention-of",
      reason: `competitor "${competitor.name}" and this opportunity's ideal customer profile ("${report.aiDecisionValidation.founderOpportunity.idealCustomerProfile}") are evidenced as addressing the same problem.`,
    });
  }

  // No fabricated node/edge when there are zero competitors — an empty
  // competitor layer is a valid, honest result, never invented to fill the
  // taxonomy's shape.
  return { nodes, threatensEdges, competesEdges };
}

/* ========================================================================= */
/* Monitoring capability edges (Execution/Competitors/Market -> Monitoring) */
/* ========================================================================= */

/**
 * Fixed, documented mapping from a knowledge-node "domain" to the real
 * monitoring-provider CATEGORIES (see src/monitoring/types.ts's
 * `MonitorCategory`) that could plausibly track it going forward — NEVER an
 * assertion that this report was actually monitored by that provider (no
 * live monitoring data exists in this module's inputs). Providers are
 * looked up by category from the real, imported `ALL_MONITOR_PROVIDERS`
 * registry, never hardcoded by string id, so a future provider rename/
 * addition is picked up automatically.
 */
const COMPETITOR_MONITORING_CATEGORIES = new Set(["trending-github", "pricing"]);
const MARKET_MONITORING_CATEGORIES = new Set(["market"]);
const GTM_MONITORING_CATEGORIES = new Set(["product-hunt", "complaint"]);

function monitoringCapabilityEdgesFor(fromNodeId: string, fromLabel: string, categories: Set<string>): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];
  for (const provider of ALL_MONITOR_PROVIDERS) {
    if (!categories.has(provider.category)) continue;
    const providerNodeId = `monitoring:${provider.id}`;
    nodes.push({
      id: providerNodeId,
      type: "monitoring-capability",
      label: provider.id,
      reason: `src/monitoring's ALL_MONITOR_PROVIDERS includes provider.id="${provider.id}" (category="${provider.category}", keyless=${provider.keyless}) — a real, statically-registered monitoring capability.`,
    });
    edges.push({
      from: fromNodeId,
      to: providerNodeId,
      relation: "could-be-watched-by",
      reason: `"${fromLabel}" falls under monitoring category "${provider.category}", which provider.id="${provider.id}" covers — a CAPABILITY reference only: no live monitoring snapshot/event is asserted here.`,
    });
  }
  return { nodes, edges };
}

/* ========================================================================= */
/* Entry point                                                              */
/* ========================================================================= */

/**
 * Composes the Phase 8 Knowledge Links relationship layer from an
 * already-populated `FounderOpportunityReport`. Pure function — no side
 * effects, no LLM call, no re-derivation of any upstream field. Every
 * node/edge traces back to a real, already-computed value; an opportunity
 * with zero evidenced competitors yields zero competitor nodes/edges rather
 * than an invented one (see `competitorLayerFor`).
 */
export function computeKnowledgeLinks(report: FounderOpportunityReport): KnowledgeLinksResult {
  const problemNode = problemNodeFor(report);
  const customerNode = customerNodeFor(report);
  const marketNode = marketNodeFor(report);
  const revenueNode = revenueNodeFor(report);
  const execution = executionNodesFor(report);

  const competitorLayer = competitorLayerFor(report, problemNode.id, customerNode.id);

  const problemToCustomerEdge: KnowledgeEdge = {
    from: problemNode.id,
    to: customerNode.id,
    relation: "affects",
    reason: `aiDecisionValidation.founderOpportunity.idealCustomerProfile="${report.aiDecisionValidation.founderOpportunity.idealCustomerProfile}" is the customer this problem (report.problem="${report.problem}") is evidenced to affect.`,
  };
  const customerToMarketEdge: KnowledgeEdge = {
    from: customerNode.id,
    to: marketNode.id,
    relation: "operates-in",
    reason: `The evidenced customer operates in a market with marketIntelligence.marketMaturity="${report.marketIntelligence.marketMaturity}".`,
  };
  const marketToRevenueEdge: KnowledgeEdge = {
    from: marketNode.id,
    to: revenueNode.id,
    relation: "shapes-monetization-of",
    reason: `marketIntelligence.saturation="${report.marketIntelligence.saturation}" and marketIntelligence.competitionPressure="${report.marketIntelligence.competitionPressure}" shape revenueIntelligence.revenuePotential="${report.revenueIntelligence.revenuePotential}".`,
  };
  const revenueToExecutionEdge: KnowledgeEdge = {
    from: revenueNode.id,
    to: execution.mvp.id,
    relation: "funds-scope-of",
    reason: `revenueIntelligence.revenueModel="${report.revenueIntelligence.revenueModel}" is the monetization basis mvpPlan.scopeSummary="${report.mvpPlan.scopeSummary}" is scoped against.`,
  };
  const executionSequenceEdge: KnowledgeEdge = {
    from: execution.mvp.id,
    to: execution.gtm.id,
    relation: "sequenced-before",
    reason: `mvpPlan.recommendedMvp="${report.mvpPlan.recommendedMvp}" is sequenced before goToMarket.launchStrategy="${report.goToMarket.launchStrategy}" per this report's own Phase 4 -> Phase 6 ordering.`,
  };

  const competitorMonitoring = competitorLayer.nodes.reduce<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }>(
    (acc, competitorNode) => {
      const result = monitoringCapabilityEdgesFor(competitorNode.id, competitorNode.label, COMPETITOR_MONITORING_CATEGORIES);
      acc.nodes.push(...result.nodes);
      acc.edges.push(...result.edges);
      return acc;
    },
    { nodes: [], edges: [] },
  );
  const marketMonitoring = monitoringCapabilityEdgesFor(marketNode.id, marketNode.label, MARKET_MONITORING_CATEGORIES);
  const gtmMonitoring = monitoringCapabilityEdgesFor(execution.gtm.id, execution.gtm.label, GTM_MONITORING_CATEGORIES);

  // Dedup monitoring-capability provider nodes (the same provider can be
  // referenced by more than one edge, e.g. multiple competitors) — a
  // provider node must only appear once per result.
  const monitoringNodeById = new Map<string, KnowledgeNode>();
  for (const node of [...competitorMonitoring.nodes, ...marketMonitoring.nodes, ...gtmMonitoring.nodes]) {
    monitoringNodeById.set(node.id, node);
  }

  const nodes: KnowledgeNode[] = [
    problemNode,
    ...competitorLayer.nodes,
    customerNode,
    marketNode,
    revenueNode,
    execution.mvp,
    execution.gtm,
    ...monitoringNodeById.values(),
  ];

  const edges: KnowledgeEdge[] = [
    ...competitorLayer.threatensEdges,
    problemToCustomerEdge,
    ...competitorLayer.competesEdges,
    customerToMarketEdge,
    marketToRevenueEdge,
    revenueToExecutionEdge,
    executionSequenceEdge,
    ...competitorMonitoring.edges,
    ...marketMonitoring.edges,
    ...gtmMonitoring.edges,
  ];

  return { nodes, edges };
}

/**
 * Trivial, type-valid placeholder — set at report-construction time in
 * engine.ts's `buildOpportunityReport`, always overwritten by
 * `attachKnowledgeLinks` for every surviving report. Mirrors
 * founder-business-intelligence.ts's `default*()` placeholder pattern
 * exactly.
 */
export function defaultKnowledgeLinks(): KnowledgeLinksResult {
  return { nodes: [], edges: [] };
}

/**
 * Attaches `knowledgeLinks` to every report in the shipped list. Unlike
 * `attachFounderBusinessIntelligence`/`attachFounderIntelligence`, no
 * `ProblemCluster` lookup is needed here — every input `computeKnowledgeLinks`
 * reads (`competition`, `businessIntelligence`, `aiDecisionValidation`,
 * `marketIntelligence`, `revenueIntelligence`, `mvpPlan`, `goToMarket`,
 * `founderIntelligence`) is already present directly on the report itself.
 * Read-only: never re-sorts or re-scores the shipped list, never mutates any
 * prior field. Must be called from engine.ts's `analyze` AFTER
 * `attachFounderBusinessIntelligence` (the last step before this one), so
 * every one of those 6 bundles is the REAL, final value, never a
 * placeholder.
 */
export function attachKnowledgeLinks(opportunities: FounderOpportunityReport[]): FounderOpportunityReport[] {
  return opportunities.map((report) => ({
    ...report,
    knowledgeLinks: computeKnowledgeLinks(report),
  }));
}
