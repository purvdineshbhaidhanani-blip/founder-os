/**
 * TypeScript mirror of tokens.css, for call sites that need token values in
 * JS (chart color scales, breakpoint checks in hooks) rather than CSS.
 * Values are kept in sync with tokens.css by hand — both are small and
 * change rarely; a build-time codegen step would be over-engineering at
 * this scale (standards/engineering.md's anti-premature-abstraction rule).
 */

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

export const radius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const fontSize = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
} as const;

export const duration = {
  micro: 150,
  enter: 200,
  exit: 250,
} as const;

/** Chart series colors — semantic role first, then a categorical palette for multi-series charts. Referenced via CSS var so they repaint automatically on theme change. */
export const chartColorVars = ["--primary", "--info", "--success", "--warning", "--destructive", "--secondary"] as const;
