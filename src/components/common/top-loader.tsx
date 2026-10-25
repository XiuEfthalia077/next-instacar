"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  // When route changes, complete and hide loader
  React.useEffect(() => {
    setProgress(100);
    const timeout = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Intercept click on links to start loader immediately
  React.useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      // Only for internal navigation links
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        target.getAttribute("target") !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        setLoading(true);
        setProgress(30);
        // Gradually increment until completed
        const interval = setInterval(() => {
          setProgress((prev) => (prev < 85 ? prev + 15 : prev));
        }, 150);
        setTimeout(() => clearInterval(interval), 3000);
      }
    };

    // Intercept form submissions to show loading feedback
    const handleFormSubmit = () => {
      setLoading(true);
      setProgress(40);
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("submit", handleFormSubmit);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("submit", handleFormSubmit);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[99999] h-1 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-[#ffcc00] via-[#ffd700] to-[#ffcc00] shadow-[0_0_10px_#ffcc00,0_0_5px_#ffd700] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: loading ? 1 : 0,
        }}
      />
    </div>
  );
}
