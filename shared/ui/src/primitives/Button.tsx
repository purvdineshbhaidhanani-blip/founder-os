import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn.js";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "fos-btn-primary",
  secondary: "fos-btn-secondary",
  destructive: "fos-btn-destructive",
  ghost: "fos-btn-ghost",
  outline: "fos-btn-outline",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "fos-btn-sm",
  md: "fos-btn-md",
  lg: "fos-btn-lg",
};

/**
 * Every interactive component documents default/hover/focus-visible/active/
 * disabled/loading states per standards/design-system.md — encoded here as
 * CSS classes (fos-btn-*) a product's global stylesheet defines against
 * the design tokens, so this component stays framework-styling-agnostic
 * (works with plain CSS, Tailwind's @apply, or CSS Modules).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading = false, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn("fos-btn", VARIANT_CLASSES[variant], SIZE_CLASSES[size], isLoading && "fos-btn-loading", className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && (
          <span className="fos-btn-spinner" role="status" aria-label="Loading">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
