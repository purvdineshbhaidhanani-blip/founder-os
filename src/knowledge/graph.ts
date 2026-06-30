import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";

/**
 * Knowledge Graph — typed nodes + typed edges with adjacency indices for fast
 * neighbour and edge lookup. One graph backs every "database" lens (research,
 * project, decision, competitor, pricing, skill, prompt, blueprint, learning,
 * artifact) so cross-domain links are first-class.
 */

export type NodeKind =
  | "concept"
  | "person"
  | "agent"
  | "project"
  | "decision"
  | "research"
  | "competitor"
  | "pricing"
  | "skill"
  | "prompt"
  | "blueprint"
  | "artifact"
  | "learning"
  | "feature"
  | "epic"
  | "sprint"
  | "milestone"
  | "task";

export interface GraphNode<T = unknown> {
  id: string;
  kind: NodeKind;
  label: string;
  data: T;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type EdgeKind =
  | "depends-on"
  | "produces"
  | "consumes"
  | "supersedes"
  | "derived-from"
  | "related-to"
  | "owned-by"
  | "blocks"
  | "addresses"
  | "competes-with"
  | "uses"
  | "implements";

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  createdAt: Timestamp;
}

export interface GraphQuery {
  kind?: NodeKind;
  tag?: string;
  text?: string;
}

export class KnowledgeGraph {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private outgoing = new Map<string, string[]>();
  private incoming = new Map<string, string[]>();

  addNode<T>(
    input: Omit<GraphNode<T>, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): GraphNode<T> {
    const id = input.id ?? generateId("node");
    const now = nowIso();
    const node: GraphNode<T> = {
      id,
      kind: input.kind,
      label: input.label,
      data: input.data,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(id, node as GraphNode);
    if (!this.outgoing.has(id)) this.outgoing.set(id, []);
    if (!this.incoming.has(id)) this.incoming.set(id, []);
    return node;
  }

  upsertNode<T>(node: GraphNode<T>): GraphNode<T> {
    const stored: GraphNode<T> = { ...node, updatedAt: nowIso() };
    this.nodes.set(node.id, stored as GraphNode);
    if (!this.outgoing.has(node.id)) this.outgoing.set(node.id, []);
    if (!this.incoming.has(node.id)) this.incoming.set(node.id, []);
    return stored;
  }

  getNode<T = unknown>(id: string): GraphNode<T> | undefined {
    return this.nodes.get(id) as GraphNode<T> | undefined;
  }

  addEdge(input: Omit<GraphEdge, "id" | "createdAt"> & { id?: string }): GraphEdge {
    if (!this.nodes.has(input.from) || !this.nodes.has(input.to)) {
      throw new Error(`Cannot link unknown nodes: ${input.from} → ${input.to}`);
    }
    const id = input.id ?? generateId("edge");
    const edge: GraphEdge = {
      id,
      from: input.from,
      to: input.to,
      kind: input.kind,
      label: input.label,
      createdAt: nowIso(),
    };
    this.edges.set(id, edge);
    this.outgoing.get(input.from)!.push(id);
    this.incoming.get(input.to)!.push(id);
    return edge;
  }

  neighborsOf(nodeId: string, direction: "out" | "in" | "both" = "both"): GraphNode[] {
    const collected: string[] = [];
    if (direction !== "in") {
      for (const eid of this.outgoing.get(nodeId) ?? []) collected.push(this.edges.get(eid)!.to);
    }
    if (direction !== "out") {
      for (const eid of this.incoming.get(nodeId) ?? []) collected.push(this.edges.get(eid)!.from);
    }
    return [...new Set(collected)].map((id) => this.nodes.get(id)!).filter(Boolean);
  }

  edgesOf(nodeId: string): GraphEdge[] {
    return [
      ...(this.outgoing.get(nodeId) ?? []),
      ...(this.incoming.get(nodeId) ?? []),
    ].map((eid) => this.edges.get(eid)!);
  }

  query(q: GraphQuery = {}): GraphNode[] {
    let out = [...this.nodes.values()];
    if (q.kind) out = out.filter((node) => node.kind === q.kind);
    if (q.tag) out = out.filter((node) => node.tags.includes(q.tag!));
    if (q.text) {
      const needle = q.text.toLowerCase();
      out = out.filter((node) => node.label.toLowerCase().includes(needle));
    }
    return out;
  }

  countNodes(): number { return this.nodes.size; }
  countEdges(): number { return this.edges.size; }
}
