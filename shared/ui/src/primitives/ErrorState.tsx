import { cn } from "../utils/cn.js";

export interface ErrorStateProps {
  title?: string;
  /** Plain-language description — never the raw error/stack, per standards/design-system.md and standards/api.md. */
  description: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = "Something went wrong", description, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("fos-error-state", className)} role="alert">
      <h3 className="fos-error-state-title">{title}</h3>
      <p className="fos-error-state-description">{description}</p>
      {onRetry && (
        <button type="button" className="fos-btn fos-btn-outline fos-btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
