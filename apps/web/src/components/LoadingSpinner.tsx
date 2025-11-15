/**
 * Loading Spinner Component
 */

import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message = "Loading...", fullScreen = false }: LoadingSpinnerProps) {
  const containerStyle = fullScreen
    ? {
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg)",
        zIndex: 9999,
      }
    : {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      };

  return (
    <div style={containerStyle}>
      <div className="loading-spinner" />
      <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.875rem" }}>{message}</p>
    </div>
  );
}
