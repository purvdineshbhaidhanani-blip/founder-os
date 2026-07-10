# Shared UI Architecture

## What this is

`shared/ui/` is the single, reusable implementation of the systems every
product's frontend needs identically: the design system
(`standards/design-system.md`), the dashboard anatomy
(`frameworks/06-dashboard-framework.md`), and the admin panel modules
(`frameworks/07-admin-panel-framework.md`). It is the frontend counterpart
to `shared/platform/` — see that package's `ARCHITECTURE.md` for the
backend side of this same split.

Per `shared/README.md`, this earns the shared-abstraction bar the same way
`shared/platform/` did: every product in the portfolio needs an
authenticated dashboard and an admin panel with the same anatomy and the
same accessibility/responsive/theming guarantees. Building that twelve
times, or worse, inconsistently, is the failure mode this package exists
to prevent.

## Why this package is product-agnostic

Every exported component takes data and callbacks as props; none of them
fetch data, call an API, or know a product's domain vocabulary. A
`KPICard` doesn't know what MRR is — it renders whatever `label`/`value`/
`trendValue` it's given. A `UsersPanel` doesn't know what "deactivate"
does server-side — it calls `onDeactivate(userId)` and lets the product's
own code (backed by `@founder-os/platform`) decide. This mirrors
`shared/platform/`'s "zero knowledge of any product's domain" rule, applied
to the frontend: this package owns *rendering*, never *data* or *behavior*.

## Module boundaries

```
shared/ui/
  src/
    tokens/          # design tokens: tokens.css (CSS custom properties) + index.ts (TS mirror)
    theme/            # ThemeProvider/useTheme, no-flash-of-unstyled-theme inline script
    primitives/         # Button, Badge, Card, Input, Select, Checkbox, Tabs, Modal, Toast,
                         # Skeleton, EmptyState, ErrorState + primitives.css
    dashboard/            # KPICard, ChartCard, DataTable, FilterBar, GlobalSearch,
                           # ActivityFeed, AlertList, QuickActions + dashboard.css
    layout/                 # DashboardShell (sidebar/topbar/content app shell) + layout.css
    admin/                    # AdminShell, ConfirmDialog, UsersPanel, RolesPermissionsPanel,
                                # BillingPanel, IntegrationsPanel, AuditLogPanel + admin.css
    hooks/                      # useMediaQuery, useBreakpoint
    utils/                       # cn() class-name composition
  tests/
    unit/                          # React Testing Library — real DOM/keyboard behavior
  README.md                         # how a product imports and configures this package
```

`dashboard/`, `layout/`, and `admin/` each compose from `primitives/`
rather than duplicating markup or styling — `DataTable` reuses `Skeleton`/
`EmptyState`/`ErrorState`, `ConfirmDialog` reuses `Modal`+`Button`, and so
on, the same anti-duplication discipline `shared/platform/`'s modules
follow (e.g. its `paginate()` helper reused across audit/reporting/search).

## Tech stack decisions

| Concern | Choice | Why |
|---|---|---|
| Styling | Plain CSS files (`*.css`) consuming CSS custom properties from `tokens.css` | Framework-agnostic — works whether a product's own build uses Tailwind, CSS Modules, or plain CSS; no styling-library lock-in for the whole portfolio |
| Charts | `recharts` | Declarative, accessible-enough React chart primitives; avoids hand-rolling SVG chart rendering per `standards/design-system.md`'s `dataviz` guidance |
| Select | Native `<select>` wrapper, not a custom listbox | Free correct keyboard nav, screen reader support, and mobile OS pickers — a custom listbox would need to reimplement all of that to match, per `standards/design-system.md`'s accessibility bar |
| Modal/Toast | `createPortal` to `document.body` | Escapes any ancestor `overflow: hidden`/`z-index` stacking context a product's own layout might introduce |
| Theme persistence | `localStorage` + inline no-flash script + `matchMedia` listener | Standard pattern for avoiding a flash of the wrong theme on load while still respecting OS-level theme changes live |
| Testing | Vitest + `@testing-library/react` + `@testing-library/user-event`, `jsdom` environment | Matches `shared/platform/`'s Vitest choice; React Testing Library enforces testing behavior (what a user/screen-reader experiences) over implementation detail |

## Multi-tenant / role scoping

This package has no concept of tenants or roles — that's `@founder-os/platform/organizations`'s
job. Components like `UsersPanel` and `AdminShell` accept an
`isAuthorized`/`canManage` boolean the product computes server-side and
passes down; this package renders accordingly but performs no
authorization decision itself, per `frameworks/07-admin-panel-framework.md`'s
"role-gated end to end. Access... is enforced server-side, not by hiding
UI" rule — hiding a button in this package is a UX nicety, never the
actual security boundary.
