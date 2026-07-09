# Design System Standards

The visual and interaction language shared by every SaaS in the portfolio.
Each product may apply its own brand accent and voice on top (see each
product's `BRAND.md`), but the tokens, components, and interaction rules
below are global.

## Design tokens

All values are defined as tokens (CSS variables / Tailwind theme config),
never hard-coded in components. Tokens are duplicated for light and dark
themes; components reference the token, never the raw value.

### Color

- **Roles, not raw hex, in component code**: `background`, `foreground`,
  `muted`, `muted-foreground`, `border`, `input`, `ring`, `primary`,
  `primary-foreground`, `secondary`, `accent`, `destructive`,
  `success`, `warning`, `info`.
- Every product defines its own `primary` brand hue; all other roles derive
  from a neutral gray scale plus semantic colors (success/warning/
  destructive/info) that stay consistent across all products for
  recognizability.
- Minimum contrast: 4.5:1 for body text, 3:1 for large text (≥18px/24px
  bold) and UI component boundaries — WCAG 2.1 AA, checked for both themes.
- Never convey meaning (error, success, required) with color alone — always
  pair with an icon, label, or text.

### Typography

- One primary UI typeface (variable font preferred) + one monospace face
  for code/data. Max two font families per product.
- Type scale (rem, 16px base): `xs 0.75 / sm 0.875 / base 1 / lg 1.125 /
  xl 1.25 / 2xl 1.5 / 3xl 1.875 / 4xl 2.25 / 5xl 3`.
- Line height: 1.5 for body copy, 1.2–1.3 for headings, never below 1.4 for
  any paragraph of more than one line.
- Font weight: 400 body, 500 emphasis/labels, 600–700 headings. Avoid more
  than 3 weights per product to keep load size down.

### Spacing

- 4px base unit, scale: `0, 1(4px), 2(8px), 3(12px), 4(16px), 5(20px),
  6(24px), 8(32px), 10(40px), 12(48px), 16(64px), 20(80px), 24(96px)`.
- Component internal padding and inter-element gaps always come from this
  scale — no arbitrary pixel values in component styles.

### Radius, elevation, motion

- Radius scale: `sm 6px / md 8px / lg 12px / xl 16px / full 9999px`.
  Interactive controls default to `md`; cards/modals to `lg`/`xl`.
- Elevation via a small set of shadow tokens (`sm/md/lg/xl`), consistent
  between light/dark (dark mode favors border + subtle glow over heavy
  shadow, since shadows read poorly on dark backgrounds).
- Motion: 150ms for micro-interactions (hover, focus, toggle), 200–250ms
  for entrances/exits (modal, dropdown, toast), ease-out for entrances,
  ease-in for exits. Respect `prefers-reduced-motion` — swap to opacity-only
  transitions when set.

## Component library

Built once in `templates/product-scaffold/frontend` and shared via
`shared/` once extracted. Core set every product needs: Button, Input,
Textarea, Select, Checkbox, Radio, Switch, Badge, Avatar, Card, Table,
Tabs, Dialog/Modal, Drawer, Dropdown Menu, Tooltip, Popover, Toast,
Skeleton, Progress, Pagination, Breadcrumbs, Command Palette, Empty State,
Error State, Stat/KPI tile, and a Dashboard shell layout (sidebar + topbar).

- Every interactive component has documented states: default, hover,
  focus-visible, active, disabled, loading, and (where relevant) error.
- Components are built headless-first where practical (behavior/a11y
  separate from styling) so the same primitive can be restyled per brand
  without reimplementing logic.
- No component ships without a keyboard-accessible path — mouse-only
  interactions are a defect, not a follow-up.

## Accessibility

- WCAG 2.1 AA is the floor for every shipped screen, not an aspiration.
- Full keyboard operability: visible focus ring on every interactive
  element (never `outline: none` without a replacement focus style), 
  logical tab order, no keyboard traps.
- Semantic HTML first; ARIA only to fill gaps semantic HTML can't cover,
  and never to fake semantics HTML could provide natively.
- All images have meaningful `alt` (or `alt=""` for decorative); all form
  inputs have programmatically associated labels; icon-only buttons have
  an accessible name.
- Live regions (`aria-live`) for async status changes (save confirmations,
  errors) that aren't otherwise announced.
- Every product is tested with a screen reader on its critical path
  (signup, primary workflow, settings) before Phase 2 sign-off.

## Responsive design

- Mobile-first breakpoints: `sm 640px / md 768px / lg 1024px / xl 1280px /
  2xl 1536px`. Layouts are designed at mobile width first, then
  progressively enhanced.
- Dashboard and admin layouts collapse to a drawer/sheet navigation below
  `lg`; tables become scrollable or convert to stacked cards below `md`.
- Touch targets are minimum 44×44px on touch-capable viewports.
- No horizontal scroll on the page body at any breakpoint — wide content
  (tables, code blocks) scrolls in its own container.

## Dark mode / light mode

- Every product ships both themes at launch — dark mode is not a
  post-launch add-on.
- Theme is controlled by a single root attribute (`data-theme`) driven by:
  user override (persisted) → OS preference (`prefers-color-scheme`) →
  light default, in that priority order.
- All tokens, not just color, are theme-aware where relevant (shadows,
  images/illustrations with light/dark variants, syntax highlighting).
- No flash of wrong theme on load — theme is resolved before first paint
  (inline script or SSR cookie read, not a client-side effect after
  hydration).

## Loading, empty, and error states

Every screen and every data-bearing component defines all three — they are
part of the design, not an afterthought:

- **Loading** — skeleton matching the eventual layout for anything that
  takes >300ms; a spinner only for genuinely indeterminate, sub-second
  waits. Never a blank white screen.
- **Empty** — explains what's missing, why, and the primary action to
  resolve it (not just "No data").
- **Error** — explains what went wrong in plain language, offers a retry
  or next step, and never exposes raw error/stack detail to the end user.

## Animation

- Purposeful only: motion communicates state change (something appeared,
  something succeeded, focus moved) — never decorative motion that delays
  the user.
- Animate `transform`/`opacity` for performance; avoid animating layout
  properties (`width`, `top`, `height`) except in short, well-tested cases.
- Page-level transitions are optional polish; interaction feedback
  (button press, toggle, toast) is not optional.
