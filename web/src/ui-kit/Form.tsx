import React from "react";

export interface FormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/** Thin wrapper that calls `preventDefault` before delegating to `onSubmit` — the one thing every form needs and forgets. */
export function Form({ onSubmit, children, ...rest }: FormProps): React.JSX.Element {
  return (
    <form
      {...rest}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event);
      }}
    >
      {children}
    </form>
  );
}

export interface FormFieldProps {
  children: React.ReactNode;
}

/** Layout wrapper for a group of fields with consistent vertical spacing. Field-level label/error rendering lives in `Input` itself. */
export function FormField({ children }: FormFieldProps): React.JSX.Element {
  return <div className="fx-field">{children}</div>;
}

export interface FormActionsProps {
  children: React.ReactNode;
}

export function FormActions({ children }: FormActionsProps): React.JSX.Element {
  return <div className="fx-dialog__actions">{children}</div>;
}
