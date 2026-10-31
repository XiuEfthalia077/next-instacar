"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Global Real-time Listener & Navigation State Manager.
 * - Subscribes to Supabase Realtime changes across core tables (bookings, cars, users, branches, contact_messages)
 *   and automatically triggers a seamless server component refresh without requiring page reload.
 * - Handles browser/phone "Back" and "Forward" navigation (popstate & pageshow):
 *   1) Automatically closes any open modals, dialogs, and overlays.
 *   2) Automatically re-fetches latest server data (router.refresh()) so the view is never stale.
 */
export function RealtimeListener() {
  const router = useRouter();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const triggerRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        router.refresh();
      }, 350);
    };

    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel("instacar-global-tables-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cars" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branches" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_messages" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_documents" },
        triggerRefresh,
      )
      .subscribe();

    // 2. Navigation & Back Button State Management
    const handlePopState = () => {
      // Close open modals / dialogs
      window.dispatchEvent(new CustomEvent("instacar:close-modals"));
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      );
      // Re-fetch fresh data from the server
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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  return null;
}
