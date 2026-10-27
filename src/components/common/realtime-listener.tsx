"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Global Real-time Listener.
 * Subscribes to Supabase Realtime changes across core tables (bookings, cars, users, branches, contact_messages)
 * and automatically triggers a seamless server component refresh without requiring page reload.
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

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
