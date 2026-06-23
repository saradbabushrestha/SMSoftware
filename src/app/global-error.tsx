"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by the root layout itself. It replaces the entire
 * document, so it must render its own <html>/<body>. Kept dependency-free and
 * inline-styled so it renders even if the app shell failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0b0b0c",
          color: "#fafafa",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              margin: "0 auto 1.5rem",
              display: "grid",
              placeItems: "center",
              borderRadius: "1rem",
              background: "rgba(239,68,68,0.15)",
              color: "#f87171",
              fontSize: "1.5rem",
            }}
            aria-hidden
          >
            !
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#a1a1aa" }}>
            The application hit an unexpected error. Please try again.
          </p>
          {error.digest ? (
            <p style={{ marginTop: "0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#71717a" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.55rem 1.1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#fafafa",
              color: "#0b0b0c",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
