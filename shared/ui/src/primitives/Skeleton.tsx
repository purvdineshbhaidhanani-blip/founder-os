import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn.js";

/** Skeleton matching the eventual layout, per standards/design-system.md — pass width/height (or a className setting them) to shape it like the content it's standing in for. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("fos-skeleton", className)} aria-hidden="true" {...props} />;
}
