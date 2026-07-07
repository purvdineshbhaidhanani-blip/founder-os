import React, { useId } from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

/** A text input that always ships with a real associated `<label>`, plus optional hint/error text wired via `aria-describedby`. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const id = rest.id ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="fx-field">
      <label className="fx-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="fx-field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        ref={ref}
        id={id}
        className={["fx-input", className].filter(Boolean).join(" ")}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && !error && (
        <span className="fx-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="fx-field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
