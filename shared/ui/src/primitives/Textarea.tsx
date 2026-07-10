import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn.js";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hideLabel?: boolean;
  error?: string;
  hint?: string;
}

/** Same label/error/hint association pattern as Input — a multi-line text field, not a separate a11y story. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hideLabel = false, error, hint, id, className, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
      <div className="fos-field">
        <label htmlFor={textareaId} className={cn("fos-label", hideLabel && "fos-sr-only")}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          className={cn("fos-textarea", error && "fos-input-error", className)}
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
Textarea.displayName = "Textarea";
