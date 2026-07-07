import React from "react";

export interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
}

/** Standard shell for an authenticated product screen: sidebar + optional header + content — composition only, no page-specific content. */
export function DashboardLayout({ sidebar, header, children }: DashboardLayoutProps): React.JSX.Element {
  return (
    <div className="fx-dashboard-layout">
      <aside className="fx-dashboard-layout__sidebar">{sidebar}</aside>
      <div className="fx-dashboard-layout__main">
        {header && <header className="fx-dashboard-layout__header">{header}</header>}
        <main className="fx-dashboard-layout__content">{children}</main>
      </div>
    </div>
  );
}
