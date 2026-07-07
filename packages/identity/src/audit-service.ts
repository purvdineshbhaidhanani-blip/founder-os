import type { IdentityStore } from "./store.js";
import type { AuditLogEntry, AuditLogFilter } from "./types.js";

/**
 * Read-side of the audit log. Writes happen at the point of action (inside
 * `AuthService`/`OrganizationService`, each call site the one place that
 * knows what actually happened) — this class exists so callers that only
 * need to query history don't have to reach into a whole service for it.
 */
export class AuditService {
  constructor(private readonly store: IdentityStore) {}

  list(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    return this.store.listAuditLogs(filter);
  }
}
