import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "../utils/cn.js";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  hideLabel?: boolean;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

/** A styled wrapper over the native <select> — deliberately not a custom-built listbox, since the native element already gives correct keyboard nav, screen reader support, and mobile OS pickers for free. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hideLabel = false, options, placeholder, error, id, className, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className="fos-field">
        <label htmlFor={selectId} className={cn("fos-label", hideLabel && "fos-sr-only")}>
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={cn("fos-select", error && "fos-input-error", className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={errorId}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="fos-field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
