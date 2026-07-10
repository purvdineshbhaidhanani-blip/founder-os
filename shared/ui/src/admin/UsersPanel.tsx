import { useState } from "react";
import { DataTable, type DataTableColumn } from "../dashboard/DataTable.js";
import { Badge, type BadgeVariant } from "../primitives/Badge.js";
import { Select, type SelectOption } from "../primitives/Select.js";
import { Button } from "../primitives/Button.js";
import { ConfirmDialog } from "./ConfirmDialog.js";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "invited" | "deactivated";
  lastActiveAt?: string;
}

export interface UsersPanelProps {
  users: AdminUserRow[];
  roleOptions: SelectOption[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onInvite?: () => void;
  onRoleChange: (userId: string, role: string) => void;
  onDeactivate: (userId: string) => void | Promise<void>;
  canManage: boolean;
}

const STATUS_BADGE_VARIANT: Record<AdminUserRow["status"], BadgeVariant> = {
  active: "success",
  invited: "info",
  deactivated: "secondary",
};

/**
 * Users admin module per frameworks/07-admin-panel-framework.md: list,
 * invite, deactivate, and manage member roles. Deactivation is destructive
 * and requires confirmation. All mutations are the caller's responsibility
 * to audit-log server-side (shared/platform's audit module).
 */
export function UsersPanel({ users, roleOptions, isLoading, error, onRetry, onInvite, onRoleChange, onDeactivate, canManage }: UsersPanelProps) {
  const [pendingDeactivation, setPendingDeactivation] = useState<AdminUserRow | null>(null);

  const columns: DataTableColumn<AdminUserRow>[] = [
    { key: "name", header: "Name", sortable: true, render: (row) => (
      <div className="fos-admin-user-cell">
        <span className="fos-admin-user-name">{row.name}</span>
        <span className="fos-admin-user-email">{row.email}</span>
      </div>
    ) },
    { key: "role", header: "Role", render: (row) =>
      canManage ? (
        <Select label={`Role for ${row.name}`} hideLabel value={row.role} options={roleOptions} onChange={(event) => onRoleChange(row.id, event.target.value)} />
      ) : (
        <span>{row.role}</span>
      ),
    },
    { key: "status", header: "Status", render: (row) => <Badge variant={STATUS_BADGE_VARIANT[row.status]}>{row.status}</Badge> },
    { key: "lastActiveAt", header: "Last active", render: (row) => row.lastActiveAt ?? "Never" },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (row: AdminUserRow) =>
              row.status !== "deactivated" && (
                <Button variant="ghost" size="sm" onClick={() => setPendingDeactivation(row)}>
                  Deactivate
                </Button>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="fos-admin-panel">
      {canManage && onInvite && (
        <div className="fos-admin-panel-toolbar">
          <Button onClick={onInvite}>Invite user</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={users}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle="No members yet"
        emptyDescription="Invite teammates to give them access to this account."
      />

      {pendingDeactivation && (
        <ConfirmDialog
          isOpen={true}
          title={`Deactivate ${pendingDeactivation.name}?`}
          description="They'll immediately lose access to this account. This can be reversed by an admin at any time."
          confirmLabel="Deactivate"
          onCancel={() => setPendingDeactivation(null)}
          onConfirm={async () => {
            await onDeactivate(pendingDeactivation.id);
            setPendingDeactivation(null);
          }}
        />
      )}
    </div>
  );
}
