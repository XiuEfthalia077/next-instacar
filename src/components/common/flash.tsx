"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";

import type { FlashMessages } from "@/lib/flash";
import { cn } from "@/lib/utils";

/**
 * Interactive Flash messages banner.
 * - Displays success, error, and warning banners.
 * - Auto-dismisses success & warning messages after 4 seconds (3-5s requirement).
 * - Dismisses when user clicks anywhere outside the notification.
 * - Provides a manual close button.
 * - Strips `?success=`, `?warning=`, and `?error=` query params from the browser URL
 *   via `history.replaceState` to prevent stale toasts when pressing Back or refreshing.
 */
export function Flash({ success, error, warning }: FlashMessages) {
  const [dismissed, setDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanUrl = () => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has("success")) {
        url.searchParams.delete("success");
        changed = true;
      }
      if (url.searchParams.has("warning")) {
        url.searchParams.delete("warning");
        changed = true;
      }
      if (url.searchParams.has("error")) {
        url.searchParams.delete("error");
        changed = true;
      }
      if (changed) {
        const nextUrl = url.pathname + (url.search ? url.search : "");
        window.history.replaceState(null, "", nextUrl);
      }
    } catch (err) {
      console.error("[Flash] cleanUrl error:", err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    cleanUrl();
  };

  useEffect(() => {
    if (!success && !warning && !error) return;
    setDismissed(false);

    // Auto-dismiss after 4 seconds
    const autoDismissTimer = setTimeout(() => {
      setDismissed(true);
      cleanUrl();
    }, 4000);

    // Dismiss when user clicks anywhere outside
    const handleGlobalClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDismissed(true);
        cleanUrl();
      }
    };

    const attachTimer = setTimeout(() => {
      document.addEventListener("click", handleGlobalClick);
    }, 250);

    return () => {
      clearTimeout(autoDismissTimer);
      clearTimeout(attachTimer);
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [success, error, warning]);

  const items = [
    success
      ? {
          key: "success",
          tone: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
          icon: CircleCheck,
          text: success,
        }
      : null,
    warning
      ? {
          key: "warning",
          tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
          icon: TriangleAlert,
          text: warning,
        }
      : null,
    error
      ? {
          key: "error",
          tone: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
          icon: Info,
          text: error,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    tone: string;
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }[];

  if (!items.length || dismissed) return null;

  return (
    <div ref={containerRef} className="mb-4 space-y-2 transition-opacity duration-300">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            role="status"
            className={cn(
              "flex items-center justify-between gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium shadow-xs",
              item.tone,
            )}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Icon className="mt-0.5 size-4 shrink-0" />
              <p className="whitespace-pre-line truncate sm:whitespace-normal">{item.text}</p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
