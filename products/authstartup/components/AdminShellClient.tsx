"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@founder-os/ui/admin";
import type { DashboardShellNavItem } from "@founder-os/ui/layout";

const NAV_LINKS: Array<{ id: string; label: string; href: string }> = [
  { id: "users", label: "Users", href: "/admin/users" },
  { id: "billing", label: "Billing", href: "/admin/billing" },
  { id: "audit-log", label: "Audit log", href: "/admin/audit-log" },
];

export function AdminShellClient({ children, isAuthorized }: { children: ReactNode; isAuthorized: boolean }) {
  const pathname = usePathname();
  const navItems: DashboardShellNavItem[] = NAV_LINKS.map((link) => ({ ...link, isActive: pathname === link.href }));

  return (
    <AdminShell navItems={navItems} logo={<span className="au-landing-logo">AuthStartup Admin</span>} isAuthorized={isAuthorized}>
      {children}
    </AdminShell>
  );
}
