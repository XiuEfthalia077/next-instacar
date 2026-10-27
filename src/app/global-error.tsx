"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[InstaCar] Global runtime error caught:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-black p-6 font-sans text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">This page couldn&apos;t load</h1>
        <p className="mt-2 max-w-md text-center text-sm text-neutral-400">
          An unexpected error occurred while loading this view. You can reload or return to the main dashboard.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-neutral-500">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#ffd633]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Page
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
          >
            <Home className="h-3.5 w-3.5" />
            Return Home
          </a>
        </div>
      </body>
    </html>
  );
}
