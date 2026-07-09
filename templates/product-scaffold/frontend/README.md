# Frontend

Next.js App Router application. Full layout rules, component states, and
tokens are defined in
[`standards/design-system.md`](../../../standards/design-system.md);
folder/naming/state-management rules in
[`standards/engineering.md`](../../../standards/engineering.md).

## Structure

```
frontend/
  app/
    (marketing)/     # public marketing pages, if any
    (dashboard)/     # authenticated app shell — sidebar + topbar layout
    (admin)/         # admin panel, role-gated
    api/              # route handlers (thin — delegate to backend/lib/services)
  components/
    ui/               # design-system primitives (Button, Input, Dialog, ...)
    <feature>/         # feature-scoped composite components, colocated
  hooks/
  types/
  config/
```

## Required screens before Phase 1 is "complete" for this product

- Auth: sign up, log in, forgot/reset password, (Google OAuth button
  present but disabled until Phase 2 credentials).
- Dashboard shell: sidebar nav, topbar (user menu, theme toggle), empty
  states for every data view.
- Settings: profile, account, security (password/MFA), notifications,
  billing (disabled state until Phase 2 payment credentials).
- Admin panel: user/org management, role management, audit log view.
- Every screen: light + dark theme, responsive down to mobile, loading/
  empty/error states per `standards/design-system.md`.

## Do not

- Hard-code colors, spacing, or radii — use design tokens.
- Fetch data in `useEffect` when a server component or a server-state
  library call would do.
- Ship a screen without keyboard access and a focus-visible state.
