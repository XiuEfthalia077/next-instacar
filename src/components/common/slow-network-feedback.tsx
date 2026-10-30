"use client";

import * as React from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type NetworkDelayState = "idle" | "slow" | "unstable";

/**
 * Hook to track network latency during async submission.
 * - 0s - 5s:  "idle"
 * - 5s - 15s: "slow" ("Slow network detected. Please wait...")
 * - >15s:     "unstable" ("Your connection seems unstable...")
 */
export function useSlowNetworkStatus(isSubmitting: boolean): NetworkDelayState {
  const [status, setStatus] = React.useState<NetworkDelayState>("idle");

  React.useEffect(() => {
    if (!isSubmitting) {
      setStatus("idle");
      return;
    }

    const slowTimer = setTimeout(() => {
      setStatus("slow");
    }, 5000);

    const unstableTimer = setTimeout(() => {
      setStatus("unstable");
    }, 15000);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(unstableTimer);
    };
  }, [isSubmitting]);

  return status;
}

export function SlowNetworkFeedback({
  status,
  className,
}: {
  status: NetworkDelayState;
  className?: string;
}) {
  if (status === "idle") return null;

  if (status === "slow") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-500 dark:text-amber-400 animate-in fade-in duration-300",
          className,
        )}
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-amber-500" />
        <span>Slow network detected. Please wait, we are processing your booking...</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-rose-500/50 bg-rose-500/15 p-3 text-xs font-bold text-rose-500 dark:text-rose-400 animate-in fade-in zoom-in-95 duration-300 shadow-md",
        className,
      )}
    >
      <AlertTriangle className="size-5 shrink-0 text-rose-500 animate-bounce" />
      <div className="space-y-0.5">
        <p className="font-extrabold text-foreground">
          Your connection seems unstable.
        </p>
        <p className="font-normal text-rose-300">
          Please check your internet connection. Do not close this page.
        </p>
      </div>
    </div>
  );
}
