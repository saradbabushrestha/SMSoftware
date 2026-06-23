"use client";

import { ErrorView } from "@/components/error-view";

// Renders inside the dashboard shell, so the sidebar/topbar stay intact.
export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} />;
}
