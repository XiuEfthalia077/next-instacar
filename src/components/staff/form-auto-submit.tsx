"use client";

import { useEffect, useRef } from "react";

/**
 * Invisible helper placed inside a GET filter form.
 *
 * The legacy pages submit the filter form as soon as a `<select>` changes
 * (`onchange="this.form.submit()"`). Server components cannot attach that
 * handler directly, so this client helper listens on the surrounding form.
 */
export function FormAutoSubmit() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;

    const handleChange = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "SELECT") form.requestSubmit();
    };

    form.addEventListener("change", handleChange);
    return () => form.removeEventListener("change", handleChange);
  }, []);

  return <span ref={marker} className="hidden" aria-hidden="true" />;
}
