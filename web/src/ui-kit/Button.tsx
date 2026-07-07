import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  loading?: boolean;
}

/** Product-agnostic button: variant/size are the only styling knobs, everything else is a real `<button>` attribute. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", loading = false, disabled, className, children, ...rest },
  ref,
) {
  const classes = ["fx-btn", `fx-btn--${variant}`, size !== "md" ? `fx-btn--${size}` : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="fx-spinner" aria-hidden="true" style={{ width: "1em", height: "1em" }} />}
      {children}
    </button>
  );
});
