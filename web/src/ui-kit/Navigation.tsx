import React from "react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface NavigationProps {
  items: NavItem[];
  /** Defaults to a plain `<a>`. Pass a router's Link (e.g. react-router's `Link`) to integrate client-side routing. */
  renderLink?: (item: NavItem, className: string) => React.ReactNode;
  "aria-label"?: string;
}

/** Router-agnostic navigation list — supply `renderLink` to wire in whatever routing library the product uses. */
export function Navigation({ items, renderLink, ...rest }: NavigationProps): React.JSX.Element {
  return (
    <nav className="fx-nav" aria-label={rest["aria-label"] ?? "Primary"}>
      {items.map((item) => {
        const className = ["fx-nav__item", item.active ? "fx-nav__item--active" : ""].filter(Boolean).join(" ");
        return (
          <React.Fragment key={item.id}>
            {renderLink ? (
              renderLink(item, className)
            ) : (
              <a href={item.href} className={className} aria-current={item.active ? "page" : undefined}>
                {item.icon}
                {item.label}
              </a>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
