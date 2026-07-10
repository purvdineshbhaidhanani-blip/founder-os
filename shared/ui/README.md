# @founder-os/ui

The shared frontend package used by every product in the portfolio: the
concrete implementation of `standards/design-system.md`, plus the dashboard
framework (`frameworks/06-dashboard-framework.md`) and admin panel
framework (`frameworks/07-admin-panel-framework.md`) component libraries.
See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for design rationale.

**Status: complete.** All modules below are implemented, typechecked,
linted, tested, and built. Every component is presentational — it takes
data and callbacks as props and renders; it never fetches data or knows
about a specific product's domain. Products wire data from
[`@founder-os/platform`](../platform/README.md) into these components.

## What's included

| Module | Import path | Covers |
|---|---|---|
| Tokens | `@founder-os/ui/tokens` (TS) + `@founder-os/ui/tokens.css` | Color roles, typography scale, spacing scale, radius, elevation, motion — light and dark values, exactly matching `standards/design-system.md` |
| Theme | `@founder-os/ui/theme` | `ThemeProvider`/`useTheme` (light/dark/system, localStorage-persisted) + `NO_FLASH_THEME_SCRIPT` for no-FOUC theme resolution in the document head |
| Primitives | `@founder-os/ui/primitives` (TS) + `@founder-os/ui/primitives.css` | Button, Badge, Card, Input, Select, Checkbox, Tabs, Modal, Toast, Skeleton, EmptyState, ErrorState — all with documented loading/empty/error states and WAI-ARIA keyboard patterns |
| Dashboard | `@founder-os/ui/dashboard` (TS) + `@founder-os/ui/dashboard.css` | KPICard, ChartCard, DataTable, FilterBar, GlobalSearch (⌘K palette), ActivityFeed, AlertList, QuickActions — the standard dashboard anatomy |
| Layout | `@founder-os/ui/layout` (TS) + `@founder-os/ui/layout.css` | DashboardShell — the sidebar/topbar/content app shell every authenticated screen renders inside |
| Admin | `@founder-os/ui/admin` (TS) + `@founder-os/ui/admin.css` | AdminShell, ConfirmDialog, UsersPanel, RolesPermissionsPanel, BillingPanel, IntegrationsPanel, AuditLogPanel — the standard admin panel modules |
| Hooks | `@founder-os/ui/hooks` | `useMediaQuery`, `useBreakpoint` |
| Utils | `@founder-os/ui/utils` | `cn()` (class name composition over `clsx`) |

## Setup (per product)

1. Add `@founder-os/ui` (and its peer deps `react`/`react-dom` ^18.3) as a
   workspace dependency in the product's `package.json`.
2. In the product's root layout, load the design tokens and every CSS
   module the product actually uses, in this order:
   ```ts
   import "@founder-os/ui/tokens.css";
   import "@founder-os/ui/primitives.css";
   import "@founder-os/ui/dashboard.css"; // only if the product uses dashboard/ components
   import "@founder-os/ui/layout.css";    // only if the product uses DashboardShell
   import "@founder-os/ui/admin.css";     // only if the product uses admin/ components
   ```
3. Inject `NO_FLASH_THEME_SCRIPT` as a raw inline `<script>` in the
   document `<head>`, before any content renders, so `data-theme` resolves
   before first paint:
   ```tsx
   import { NO_FLASH_THEME_SCRIPT } from "@founder-os/ui/theme";
   // in the root layout's <head>:
   <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
   ```
4. Wrap the app in `ThemeProvider` so `useTheme()` works everywhere below it.

## Example: a product's authenticated dashboard screen

```tsx
import { ThemeProvider } from "@founder-os/ui/theme";
import { DashboardShell } from "@founder-os/ui/layout";
import { KPICard, ChartCard, ActivityFeed, GlobalSearch, QuickActions } from "@founder-os/ui/dashboard";

function SpendGovDashboard({ kpis, spendTrend, activity, isLoadingKpis }: DashboardProps) {
  return (
    <ThemeProvider>
      <DashboardShell
        navItems={navItems}
        globalSearch={<GlobalSearch query={query} onQueryChange={setQuery} results={searchResults} />}
        topBarActions={<QuickActions actions={quickActions} />}
      >
        <div className="dashboard-kpi-row">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} {...kpi} isLoading={isLoadingKpis} />
          ))}
        </div>
        <ChartCard title="Spend over time" description="Explains the MRR KPI above.">
          {/* a recharts chart the product composes directly — ChartCard only owns the loading/empty/error frame */}
        </ChartCard>
        <ActivityFeed entries={activity} />
      </DashboardShell>
    </ThemeProvider>
  );
}
```

Every product supplies its own data-fetching (via `@founder-os/platform`'s
services, typically behind its own route handlers) and passes the result
in as props — this package never calls `fetch` or reaches into Prisma
itself.

## Example: a product's admin panel

```tsx
import { AdminShell, UsersPanel, BillingPanel } from "@founder-os/ui/admin";
import { can } from "@founder-os/platform/organizations"; // server-side; isAuthorized below is the *result* of that check, passed as a prop — never re-derived client-side

function AdminUsersPage({ isAuthorized, users, roleOptions, onRoleChange, onDeactivate }: AdminUsersPageProps) {
  return (
    <AdminShell navItems={adminNavItems} isAuthorized={isAuthorized}>
      <UsersPanel
        users={users}
        roleOptions={roleOptions}
        onRoleChange={onRoleChange}
        onDeactivate={onDeactivate}
        canManage={isAuthorized}
      />
    </AdminShell>
  );
}
```

`isAuthorized` is a UI-layer convenience for which screen to render — the
real enforcement is server-side, per
`frameworks/07-admin-panel-framework.md`'s "role-gated end to end" rule.
Never trust this prop as the only gate on a mutating server action.

## Local development

```bash
cd shared/ui
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Status

All eight modules above are complete: 44 tests passing across 3 test
files (React Testing Library — real DOM assertions and keyboard-driven
interaction, not snapshot tests), clean typecheck, clean lint
(`eslint.config.js`, includes `eslint-plugin-react-hooks`), clean build.
Accessibility patterns (WAI-ARIA Tabs, Dialog/focus-trap, live regions,
programmatic label association) are behavior-tested, not just visually
implemented.

### Deliberately not built in this pass

The 26-component list implied by the full breadth of
`standards/design-system.md` is not built speculatively — per
`standards/engineering.md`'s anti-premature-abstraction rule, this package
ships the components actually needed to compose the dashboard and admin
framework anatomies (`frameworks/06`, `frameworks/07`), plus the
lower-level primitives those compose from. Additional primitives (date
pickers, rich multi-select, drag-and-drop upload, etc.) get added the same
way `platform/`'s modules did: when a product genuinely needs one and it's
built once, tested, and reused — never spec'd out ahead of demand.

## The backend package

Every product's frontend pairs with
[`@founder-os/platform`](../platform/README.md) — the backend services
(auth, billing, AI, notifications, etc.) this component library's props
are wired to. See that package's README for its own module table and
setup.
