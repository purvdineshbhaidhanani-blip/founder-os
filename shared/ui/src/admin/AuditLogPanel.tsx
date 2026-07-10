import { DataTable, type DataTableColumn } from "../dashboard/DataTable.js";
import { FilterBar, type FilterBarProps } from "../dashboard/FilterBar.js";

export interface AuditLogRow {
  id: string;
  actorName: string;
  action: string;
  target: string;
  occurredAt: string;
  ipAddress?: string;
}

export interface AuditLogPanelProps {
  entries: AuditLogRow[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  filterBar?: FilterBarProps;
  page?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}

const columns: DataTableColumn<AuditLogRow>[] = [
  { key: "occurredAt", header: "Time", sortable: true, render: (row) => row.occurredAt },
  { key: "actorName", header: "Actor", render: (row) => row.actorName },
  { key: "action", header: "Action", render: (row) => row.action },
  { key: "target", header: "Target", render: (row) => row.target },
  { key: "ipAddress", header: "IP address", render: (row) => row.ipAddress ?? "—" },
];

/**
 * Read-only, filterable audit log per
 * frameworks/07-admin-panel-framework.md — never editable from the UI.
 * Backed by shared/platform's append-only audit module.
 */
export function AuditLogPanel({ entries, isLoading, error, onRetry, filterBar, page, pageCount, onPageChange }: AuditLogPanelProps) {
  return (
    <div className="fos-admin-audit-log">
      {filterBar && <FilterBar {...filterBar} />}
      <DataTable
        columns={columns}
        rows={entries}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle="No audit events yet"
        emptyDescription="Security-relevant events — who did what, when — will appear here."
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
