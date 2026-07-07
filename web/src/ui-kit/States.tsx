import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}

/** "Nothing here yet" — for a collection with zero items, distinct from `ErrorState` (something went wrong). */
export function EmptyState({ title, description, action, icon }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="fx-state fx-state--empty" role="status">
      {icon}
      <p className="fx-state__title">{title}</p>
      {description && <p>{description}</p>}
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export interface LoadingStateProps {
  label?: string;
}

/** In-progress placeholder. `aria-live="polite"` so screen readers announce when loading resolves into real content. */
export function LoadingState({ label = "Loading…" }: LoadingStateProps): React.JSX.Element {
  return (
    <div className="fx-state fx-state--loading" role="status" aria-live="polite">
      <span className="fx-spinner" aria-hidden="true" />
      <p className="fx-state__title">{label}</p>
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

/** Something failed — distinct from `EmptyState`. `role="alert"` so assistive tech announces it immediately. */
export function ErrorState({ title = "Something went wrong", description, action }: ErrorStateProps): React.JSX.Element {
  return (
    <div className="fx-state fx-state--error" role="alert">
      <p className="fx-state__title">{title}</p>
      {description && <p>{description}</p>}
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
