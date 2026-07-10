import type { ReactNode } from "react";
import { ErrorState } from "../primitives/ErrorState.js";
import { DashboardShell, type DashboardShellNavItem } from "../layout/DashboardShell.js";

export interface AdminShellProps {
  navItems: DashboardShellNavItem[];
  logo?: ReactNode;
  topBarActions?: ReactNode;
  /**
   * Whether the current user is authorized to view the admin panel.
   * This is a UI-layer convenience only — per
   * frameworks/07-admin-panel-framework.md, the real enforcement MUST
   * happen server-side; hiding this shell is not a substitute for that.
   */
  isAuthorized: boolean;
  children: ReactNode;
}

/**
 * Standard admin-panel shell: role-gated end to end per
 * frameworks/07-admin-panel-framework.md. Reuses DashboardShell for the
 * nav/topbar/content anatomy so admin and end-user surfaces stay visually
 * consistent, but renders a clear access-denied state instead of content
 * when the caller reports the user as unauthorized.
 */
export function AdminShell({ navItems, logo, topBarActions, isAuthorized, children }: AdminShellProps) {
  return (
    <DashboardShell navItems={navItems} logo={logo} topBarActions={topBarActions}>
      {isAuthorized ? (
        children
      ) : (
        <ErrorState
          title="Access denied"
          description="You don't have permission to view this page. Contact an account owner if you believe this is a mistake."
        />
      )}
    </DashboardShell>
  );
}
