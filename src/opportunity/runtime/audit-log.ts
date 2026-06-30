import { generateId, nowIso } from "../../utils/id.js";
import type { AuditEntry, AuditAction } from "./types.js";

// ---------------------------------------------------------------------------
// Audit Log — immutable append-only audit trail
// ---------------------------------------------------------------------------

export class AuditLog {
  private readonly entries: AuditEntry[] = [];

  log(
    action: AuditAction,
    details: Record<string, unknown> = {},
    entityId: string | null = null,
    entityType: string | null = null,
  ): AuditEntry {
    const entry: AuditEntry = {
      id: generateId("audit"),
      action,
      entityId,
      entityType,
      details,
      timestamp: nowIso(),
    };
    this.entries.push(entry);
    return entry;
  }

  getAll(): ReadonlyArray<AuditEntry> {
    return this.entries;
  }

  byAction(action: AuditAction): AuditEntry[] {
    return this.entries.filter((e) => e.action === action);
  }

  byEntity(entityId: string): AuditEntry[] {
    return this.entries.filter((e) => e.entityId === entityId);
  }

  since(isoTimestamp: string): AuditEntry[] {
    const t = new Date(isoTimestamp).getTime();
    return this.entries.filter((e) => new Date(e.timestamp).getTime() >= t);
  }

  size(): number {
    return this.entries.length;
  }

  toJSON(): AuditEntry[] {
    return [...this.entries];
  }
}
