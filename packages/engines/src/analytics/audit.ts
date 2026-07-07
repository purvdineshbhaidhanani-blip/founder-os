import type { AuditEntry, AuditQuery } from "./types.js";

export interface AuditTracker {
  record(actor: string, action: string, target?: string, metadata?: Record<string, unknown>): Promise<AuditEntry>;
  query(query: AuditQuery): Promise<AuditEntry[]>;
}

let counter = 0;
function generateAuditId(): string {
  counter += 1;
  return `audit_${Date.now()}_${counter}`;
}

/**
 * Append-only "who did what, when" trail. Kept distinct from `EventTracker`
 * because audit entries are compliance/security records, not product
 * analytics — different retention and query patterns even though the shape
 * looks similar.
 */
export class InMemoryAuditTracker implements AuditTracker {
  private readonly entries: AuditEntry[] = [];

  async record(
    actor: string,
    action: string,
    target?: string,
    metadata?: Record<string, unknown>,
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: generateAuditId(),
      actor,
      action,
      target,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.entries.push(entry);
    return entry;
  }

  async query(query: AuditQuery): Promise<AuditEntry[]> {
    let results = [...this.entries];
    if (query.actor) results = results.filter((e) => e.actor === query.actor);
    if (query.action) results = results.filter((e) => e.action === query.action);
    if (query.target) results = results.filter((e) => e.target === query.target);
    if (query.since) results = results.filter((e) => e.timestamp >= query.since!);
    if (query.until) results = results.filter((e) => e.timestamp <= query.until!);
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return query.limit ? results.slice(0, query.limit) : results;
  }
}
