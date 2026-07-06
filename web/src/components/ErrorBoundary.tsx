import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * App-level React error boundary. A render/runtime crash in any page or
 * component is caught here and shown as a recoverable error card instead of a
 * blank white screen. "Try again" clears the boundary so the user can retry
 * without a full page reload; "Reload" is the hard fallback. This is the last
 * line of defense — individual data fetches already have their own
 * loading/error/retry states.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    // Surface for diagnostics without crashing the app.
    // eslint-disable-next-line no-console
    console.error("Uncaught UI error:", error);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  override render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="page">
          <div className="card" role="alert">
            <h2>Something broke on this screen</h2>
            <p className="muted">
              An unexpected error occurred while rendering. Your data is safe — nothing was changed.
            </p>
            <p className="muted">{this.state.error.message}</p>
            <div className="export-actions">
              <button type="button" onClick={this.reset}>
                Try again
              </button>
              <button type="button" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
