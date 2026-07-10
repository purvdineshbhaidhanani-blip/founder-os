import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn.js";

export type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Per standards/design-system.md: "never convey meaning with color alone" — an icon accompanying a status badge. */
  icon?: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ variant = "default", icon, className, children, ...props }, ref) => {
  return (
    <span ref={ref} className={cn("fos-badge", `fos-badge-${variant}`, className)} {...props}>
      {icon && (
        <span className="fos-badge-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
});
Badge.displayName = "Badge";
