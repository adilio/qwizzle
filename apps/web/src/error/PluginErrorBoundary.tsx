/**
 * Plugin Error Boundary
 * Catches and gracefully handles plugin loading errors
 */

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class PluginErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Plugin error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            backgroundColor: "var(--bg)",
            color: "var(--fg)",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              padding: "2rem",
              backgroundColor: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--surface-border)",
            }}
          >
            <h1 style={{ color: "var(--danger)", marginBottom: "1rem" }}>⚠️ Plugin Error</h1>
            <p style={{ marginBottom: "1rem", lineHeight: "1.6" }}>
              A plugin failed to load. The app will continue with default settings.
            </p>
            {this.state.error && (
              <details style={{ marginBottom: "1rem" }}>
                <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>Error details</summary>
                <pre
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--t-base)",
                    borderRadius: "8px",
                    overflow: "auto",
                    fontSize: "0.875rem",
                  }}
                >
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "var(--accent)",
                color: "var(--accent-fg)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
