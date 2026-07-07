/**
 * Design tokens for the Universal SaaS Factory's UI Component Library.
 * Product-agnostic: no product name, brand, or Founder OS styling lives
 * here. Every `ui-kit` component reads colors/spacing/type from these
 * tokens (via the CSS custom properties in `tokens.css`) instead of
 * hardcoding values, so a product can reskin by overriding the custom
 * properties without touching component code.
 */

export const colors = {
  background: "var(--fx-color-background)",
  surface: "var(--fx-color-surface)",
  surfaceMuted: "var(--fx-color-surface-muted)",
  border: "var(--fx-color-border)",
  text: "var(--fx-color-text)",
  textMuted: "var(--fx-color-text-muted)",
  primary: "var(--fx-color-primary)",
  primaryText: "var(--fx-color-primary-text)",
  danger: "var(--fx-color-danger)",
  dangerText: "var(--fx-color-danger-text)",
  success: "var(--fx-color-success)",
  warning: "var(--fx-color-warning)",
  focusRing: "var(--fx-color-focus-ring)",
} as const;

export const spacing = {
  xs: "var(--fx-space-xs)",
  sm: "var(--fx-space-sm)",
  md: "var(--fx-space-md)",
  lg: "var(--fx-space-lg)",
  xl: "var(--fx-space-xl)",
  xxl: "var(--fx-space-xxl)",
} as const;

export const radius = {
  sm: "var(--fx-radius-sm)",
  md: "var(--fx-radius-md)",
  lg: "var(--fx-radius-lg)",
  full: "var(--fx-radius-full)",
} as const;

export const typography = {
  fontFamily: "var(--fx-font-family)",
  fontFamilyMono: "var(--fx-font-family-mono)",
  size: {
    xs: "var(--fx-font-size-xs)",
    sm: "var(--fx-font-size-sm)",
    md: "var(--fx-font-size-md)",
    lg: "var(--fx-font-size-lg)",
    xl: "var(--fx-font-size-xl)",
    xxl: "var(--fx-font-size-xxl)",
  },
  weight: {
    regular: "var(--fx-font-weight-regular)",
    medium: "var(--fx-font-weight-medium)",
    bold: "var(--fx-font-weight-bold)",
  },
  lineHeight: {
    tight: "var(--fx-line-height-tight)",
    normal: "var(--fx-line-height-normal)",
  },
} as const;

/** Breakpoints in px — used by consumers writing their own `@media` queries, and documented for reference. */
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const shadow = {
  sm: "var(--fx-shadow-sm)",
  md: "var(--fx-shadow-md)",
  lg: "var(--fx-shadow-lg)",
} as const;

/**
 * Accessibility rules the UI kit follows. Not enforceable at compile time,
 * but documented centrally so every component author works from the same
 * checklist:
 *
 * 1. Every interactive element is reachable by keyboard (Tab/Shift+Tab) and
 *    operable with Enter/Space; nothing interactive is a bare `<div>`.
 * 2. Every interactive element has a visible focus ring (`--fx-color-focus-ring`)
 *    — never `outline: none` without an equivalent replacement.
 * 3. Color is never the only signal (errors/success also carry text or an
 *    icon with an accessible name).
 * 4. Text contrast meets WCAG AA (4.5:1 for body text, 3:1 for large text)
 *    against `--fx-color-background`/`--fx-color-surface` in both themes.
 * 5. Dialogs trap focus while open, restore focus to the trigger on close,
 *    and close on Escape.
 * 6. All form inputs have an associated, visible `<label>` (via `htmlFor`),
 *    not placeholder-only labeling.
 * 7. Loading/empty/error states are announced via `aria-live` where they
 *    replace existing content asynchronously.
 */
export const a11yRules = [
  "Keyboard operable: every interactive element reachable via Tab, actionable via Enter/Space.",
  "Visible focus ring on every interactive element (never outline:none without a replacement).",
  "Color is never the sole signal for meaning (pair with text/icon).",
  "Body text contrast >= 4.5:1, large text >= 3:1, in both light and dark themes.",
  "Dialogs trap focus, restore focus on close, and close on Escape.",
  "Form inputs use a real associated <label>, not placeholder-only labeling.",
  "Async content swaps (loading/empty/error) are announced via aria-live.",
] as const;
