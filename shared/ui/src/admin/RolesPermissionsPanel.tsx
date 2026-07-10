import { cn } from "../utils/cn.js";

export interface RoleDefinition {
  key: string;
  label: string;
  description?: string;
}

export interface PermissionDefinition {
  key: string;
  label: string;
}

export interface RolesPermissionsPanelProps {
  roles: RoleDefinition[];
  permissions: PermissionDefinition[];
  /** True if the given role grants the given permission. */
  hasPermission: (roleKey: string, permissionKey: string) => boolean;
  className?: string;
}

/**
 * Read-only role → permission matrix per
 * frameworks/07-admin-panel-framework.md's Roles and Permissions modules
 * and frameworks/09-roles-permissions.md. Custom permission grants (where
 * a product supports them) are a per-product mutation surface layered on
 * top of this read model, not part of the shared component.
 */
export function RolesPermissionsPanel({ roles, permissions, hasPermission, className }: RolesPermissionsPanelProps) {
  return (
    <div className={cn("fos-admin-permission-matrix-wrapper", className)}>
      <table className="fos-admin-permission-matrix">
        <thead>
          <tr>
            <th scope="col" className="fos-admin-permission-matrix-corner">
              Permission
            </th>
            {roles.map((role) => (
              <th key={role.key} scope="col" title={role.description}>
                {role.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.key}>
              <th scope="row">{permission.label}</th>
              {roles.map((role) => {
                const granted = hasPermission(role.key, permission.key);
                return (
                  <td key={role.key} className="fos-admin-permission-matrix-cell">
                    <span className="fos-sr-only">
                      {role.label} {granted ? "has" : "does not have"} {permission.label}
                    </span>
                    <span aria-hidden="true">{granted ? "✓" : ""}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
