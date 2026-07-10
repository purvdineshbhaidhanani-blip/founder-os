"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell, type DashboardShellNavItem } from "@founder-os/ui/layout";

const NAV_LINKS: Array<{ id: string; label: string; href: string }> = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "subscriptions", label: "Subscriptions", href: "/subscriptions" },
  { id: "duplicates", label: "Duplicates", href: "/duplicates" },
  { id: "waste", label: "Waste", href: "/waste" },
  { id: "renewals", label: "Renewals", href: "/renewals" },
  { id: "vendors", label: "Vendors", href: "/vendors" },
  { id: "copilot", label: "AI CFO Copilot", href: "/copilot" },
  { id: "reports", label: "Reports", href: "/reports" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems: DashboardShellNavItem[] = NAV_LINKS.map((link) => ({
    ...link,
    isActive: pathname === link.href,
  }));

  return (
    <DashboardShell navItems={navItems} logo={<span className="sg-landing-logo">SpendGov</span>}>
      {children}
    </DashboardShell>
  );
}
