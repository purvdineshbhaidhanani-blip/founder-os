"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell, type DashboardShellNavItem } from "@founder-os/ui/layout";

const NAV_LINKS: Array<{ id: string; label: string; href: string }> = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "services", label: "Services", href: "/services" },
  { id: "alerts", label: "Alerts", href: "/alerts" },
  { id: "incidents", label: "Incidents", href: "/incidents" },
  { id: "reports", label: "Reports", href: "/reports" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems: DashboardShellNavItem[] = NAV_LINKS.map((link) => ({
    ...link,
    isActive: pathname === link.href || pathname.startsWith(`${link.href}/`),
  }));

  return (
    <DashboardShell navItems={navItems} logo={<span className="it-landing-logo">IncidentTriage</span>}>
      {children}
    </DashboardShell>
  );
}
