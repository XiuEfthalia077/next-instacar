"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetLoader = React.useCallback(() => {
    setProgress(100);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 200);
  }, []);

  // When route changes, complete and hide loader
  React.useEffect(() => {
    resetLoader();
  }, [pathname, searchParams, resetLoader]);

  // Intercept click on links to start loader
  React.useEffect(() => {
    let safetyTimer: NodeJS.Timeout | null = null;
    let intervalTimer: NodeJS.Timeout | null = null;

    const startLoader = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (safetyTimer) clearTimeout(safetyTimer);
      if (intervalTimer) clearInterval(intervalTimer);

      setLoading(true);
      setProgress(30);

      intervalTimer = setInterval(() => {
        setProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 150);

      // Strict safety timeout: NEVER hang longer than 2.5s under any circumstance
      safetyTimer = setTimeout(() => {
        if (intervalTimer) clearInterval(intervalTimer);
        resetLoader();
      }, 2500);
    };

    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        target.getAttribute("target") !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        // If clicking current path, don't trigger loader
        const currentUrl = window.location.pathname + window.location.search;
        if (href === currentUrl || href === window.location.pathname) {
          return;
        }
        startLoader();
      }
    };

    const handleFormSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form.getAttribute("data-no-loader")) return;
      startLoader();
    };

    const handleError = () => {
      resetLoader();
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("submit", handleFormSubmit);
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleError);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("submit", handleFormSubmit);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleError);
      if (safetyTimer) clearTimeout(safetyTimer);
      if (intervalTimer) clearInterval(intervalTimer);
    };
  }, [resetLoader]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[99999] h-1 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-[#ffcc00] via-[#ffd700] to-[#ffcc00] shadow-[0_0_10px_#ffcc00,0_0_5px_#ffd700] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: loading ? 1 : 0,
        }}
      />
    </div>
  );
}
