"use client";

import { useState, type ReactNode } from "react";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { cn } from "../utils/cn.js";

export interface DashboardShellNavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href: string;
  isActive?: boolean;
}

export interface DashboardShellProps {
  navItems: DashboardShellNavItem[];
  logo?: ReactNode;
  topBarActions?: ReactNode;
  globalSearch?: ReactNode;
  children: ReactNode;
}

/**
 * The standard authenticated-app shell every product wraps its dashboard,
 * admin panel, and settings screens in: collapsible sidebar nav + topbar +
 * content region. Collapses to an off-canvas nav on mobile, per
 * standards/design-system.md's responsive rules.
 */
export function DashboardShell({ navItems, logo, topBarActions, globalSearch, children }: DashboardShellProps) {
  const isDesktop = useBreakpoint("lg");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navOpen = isDesktop || isMobileNavOpen;

  return (
    <div className="fos-dashboard-shell">
      <a href="#fos-main-content" className="fos-skip-link">
        Skip to main content
      </a>

      <header className="fos-dashboard-topbar">
        <div className="fos-dashboard-topbar-start">
          {!isDesktop && (
            <button
              type="button"
              className="fos-dashboard-nav-toggle"
              aria-expanded={isMobileNavOpen}
              aria-controls="fos-dashboard-nav"
              onClick={() => setIsMobileNavOpen((open) => !open)}
            >
              <span className="fos-sr-only">Toggle navigation</span>
              <span aria-hidden="true">☰</span>
            </button>
          )}
          {logo && <div className="fos-dashboard-logo">{logo}</div>}
        </div>
        {globalSearch && <div className="fos-dashboard-topbar-search">{globalSearch}</div>}
        {topBarActions && <div className="fos-dashboard-topbar-actions">{topBarActions}</div>}
      </header>

      <div className="fos-dashboard-body">
        {navOpen && (
          <nav
            id="fos-dashboard-nav"
            className={cn("fos-dashboard-nav", !isDesktop && "fos-dashboard-nav-mobile")}
            aria-label="Primary"
          >
            <ul className="fos-dashboard-nav-list">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className={cn("fos-dashboard-nav-link", item.isActive && "fos-dashboard-nav-link-active")}
                    aria-current={item.isActive ? "page" : undefined}
                    onClick={() => setIsMobileNavOpen(false)}
                  >
                    {item.icon && (
                      <span className="fos-dashboard-nav-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <main id="fos-main-content" className="fos-dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
