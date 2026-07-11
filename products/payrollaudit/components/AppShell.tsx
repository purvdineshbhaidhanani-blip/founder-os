"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell, type DashboardShellNavItem } from "@founder-os/ui/layout";

const NAV_LINKS: Array<{ id: string; label: string; href: string }> = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "employees", label: "Employees", href: "/employees" },
  { id: "payroll-runs", label: "Payroll runs", href: "/payroll-runs" },
  { id: "reports", label: "Reports", href: "/reports" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems: DashboardShellNavItem[] = NAV_LINKS.map((link) => ({
    ...link,
    isActive: pathname === link.href || pathname.startsWith(`${link.href}/`),
  }));

  return (
    <DashboardShell navItems={navItems} logo={<span className="pa-landing-logo">PayrollAudit</span>}>
      {children}
    </DashboardShell>
  );
}
