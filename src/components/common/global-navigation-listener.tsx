"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Global Navigation & Back-Button Handler.
 * - Closes any open modals/dialogs when the user presses the browser or mobile hardware Back button.
 * - Re-fetches fresh server data via `router.refresh()` on back/forward and bfcache transitions
 *   so the view is never stale.
 */
export function GlobalNavigationListener() {
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const triggerRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 100);
    };

    const handlePopState = () => {
      // 1. Close all active modals/dialogs
      window.dispatchEvent(new CustomEvent("instacar:close-modals"));
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      );

      // 2. Refresh server data
      triggerRefresh();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // If navigated back from bfcache (browser back/forward cache)
      if (event.persisted) {
        window.dispatchEvent(new CustomEvent("instacar:close-modals"));
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
        );
        triggerRefresh();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  return null;
}
