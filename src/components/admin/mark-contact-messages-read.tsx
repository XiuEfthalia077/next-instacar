"use client";

import { startTransition, useEffect } from "react";

import { markContactMessagesReadAction } from "@/lib/actions/contact";

/**
 * Port of the legacy `contact_messages.php` page-load statement:
 *
 *   UPDATE contact_messages SET is_read = 1 WHERE is_read = 0
 *
 * The legacy page ran it before rendering the list; here the list renders
 * first (so the "New" badges are visible for unread rows) and the tiny client
 * effect marks everything as read once, after mount.
 */
export function MarkContactMessagesRead() {
  useEffect(() => {
    startTransition(() => {
      void markContactMessagesReadAction();
    });
  }, []);

  return null;
}
