import { breakpoints, type Breakpoint } from "../tokens/index.js";
import { useMediaQuery } from "./useMediaQuery.js";

/** True once the viewport is at or above the given breakpoint — mobile-first, per standards/design-system.md. */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`);
}
