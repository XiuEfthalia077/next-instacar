"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[InstaCar] App error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffcc00] ring-1 ring-[#ffcc00]/30">
        <AlertTriangle className="size-8" />
      </div>

      <h2 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
        Something Went Wrong
      </h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred while loading this page. Please try again or return home.
      </p>

      {error.digest ? (
        <p className="mt-1 font-mono text-xs text-muted-foreground/70">
          Ref: {error.digest}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2.5 text-xs font-extrabold text-black shadow-sm transition hover:bg-[#ffd633] cursor-pointer"
        >
          <RefreshCw className="size-3.5" />
          Try Again
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          <Home className="size-3.5" />
          Return Home
        </Link>
      </div>
    </div>
  );
}
