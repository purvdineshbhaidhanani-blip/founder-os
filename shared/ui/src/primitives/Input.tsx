import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn.js";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Set when the label is provided by a surrounding component (e.g. a filter toolbar) — renders visually hidden but keeps the accessible name. */
  hideLabel?: boolean;
  error?: string;
  hint?: string;
}

/**
 * Every input has a programmatically associated label per
 * standards/design-system.md — `label` is required, not optional, so a
 * consumer can't accidentally ship an inaccessible field.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hideLabel = false, error, hint, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="fos-field">
        <label htmlFor={inputId} className={cn("fos-label", hideLabel && "fos-sr-only")}>
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn("fos-input", error && "fos-input-error", className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={cn(hintId, errorId) || undefined}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="fos-field-hint">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="fos-field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
