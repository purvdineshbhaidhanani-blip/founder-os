"use client";

import { useEffect, useState } from "react";
import { AuditLogPanel, type AuditLogRow } from "@founder-os/ui/admin";

interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit-log")
      .then((res) => res.json())
      .then((body) => setEntries(body.data.data))
      .finally(() => setIsLoading(false));
  }, []);

  const rows: AuditLogRow[] = entries.map((entry) => ({
    id: entry.id,
    actorName: entry.actorId ?? "System",
    action: entry.action,
    target: `${entry.targetType}${entry.targetId ? `:${entry.targetId}` : ""}`,
    occurredAt: entry.createdAt,
    ipAddress: entry.ipAddress ?? undefined,
  }));

  return (
    <div>
      <div className="it-page-header">
        <h1 className="it-page-title">Audit log</h1>
      </div>
      <AuditLogPanel entries={rows} isLoading={isLoading} />
    </div>
  );
}
