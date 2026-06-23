"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared presentational error boundary used by both the root and the dashboard
 * `error.tsx`. Works full-page (no shell) or inside the dashboard content area.
 */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface for local debugging; wire to real telemetry (Sentry, etc.) in production.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-destructive/12 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred while loading this page. You can retry, or head back to your dashboard.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <Home /> Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
