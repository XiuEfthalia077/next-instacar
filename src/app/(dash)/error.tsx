"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error for debugging
    console.error("[InstaCar] Dashboard error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Page Temporarily Unavailable
      </h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        We encountered an unexpected issue while rendering this section. Your account, bookings, and data are safe.
      </p>

      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted-foreground/60">
          Ref: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2.5 text-xs font-bold text-black shadow-md transition-all hover:bg-[#ffd633]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reload Section
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
        >
          <Home className="h-3.5 w-3.5" />
          Return to Dashboard
        </Link>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go Back
        </button>
      </div>
    </div>
  );
}
