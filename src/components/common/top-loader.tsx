"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [fading, setFading] = React.useState(false);

  // References to manage timers and state without re-render lag
  const delayTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastNavTimeRef = React.useRef<number>(0);
  const activeTargetHrefRef = React.useRef<string | null>(null);
  const visitedUrlsRef = React.useRef<Set<string>>(new Set());

  // Mark current URL as visited
  React.useEffect(() => {
    const current = window.location.pathname + window.location.search;
    visitedUrlsRef.current.add(current);
    visitedUrlsRef.current.add(window.location.pathname);
  }, [pathname, searchParams]);

  // Complete and cleanly fade out the loader
  const completeLoader = React.useCallback(() => {
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    activeTargetHrefRef.current = null;

    setProgress(100);
    setFading(false);

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setFading(true);
      fadeTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
        setFading(false);
      }, 300);
    }, 200);
  }, []);

  // When route changes, complete loader smoothly
  React.useEffect(() => {
    completeLoader();
  }, [pathname, searchParams, completeLoader]);

  // Intercept click on navigation links
  React.useEffect(() => {
    const startLoader = (targetHref: string) => {
      const now = Date.now();

      // 1. Click Debounce / Throttling — ignore spam clicks within 400ms
      if (now - lastNavTimeRef.current < 400 && activeTargetHrefRef.current === targetHref) {
        return;
      }
      lastNavTimeRef.current = now;

      // 2. Sticky Loading Bar — if already navigating to this target, keep advancing, never snap back to 0%
      if (activeTargetHrefRef.current === targetHref) {
        return;
      }
      activeTargetHrefRef.current = targetHref;

      // Clear any pending completion/fade timers
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);

      // 3. Loading State Persistence & Cache Threshold:
      // If navigating to a recently visited route, Next.js serves from in-memory Client Router Cache (<100ms).
      // Delay showing the loader by 150ms so fast transitions never flash.
      const isVisited =
        visitedUrlsRef.current.has(targetHref) ||
        visitedUrlsRef.current.has(targetHref.split("?")[0]);
      const showDelay = isVisited ? 150 : 60;

      delayTimerRef.current = setTimeout(() => {
        setVisible(true);
        setFading(false);
        // Sticky progress: never drop below current progress level
        setProgress((prev) => Math.max(prev > 0 && prev < 90 ? prev : 30, 30));

        if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
        intervalTimerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) return prev;
            // Smooth natural asymptotic trickle towards 90%
            const diff = 90 - prev;
            return prev + Math.max(diff * 0.15, 1.5);
          });
        }, 120);

        // Strict safety timeout: never hang longer than 3 seconds
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = setTimeout(() => {
          completeLoader();
        }, 3000);
      }, showDelay);
    };

    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      if (target.getAttribute("data-no-loader")) return;

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
        const currentUrl = window.location.pathname + window.location.search;
        // If clicking current path, don't trigger loader
        if (href === currentUrl || href === window.location.pathname) {
          return;
        }
        startLoader(href);
      }
    };

    const handleFormSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form.getAttribute("data-no-loader")) return;
      startLoader(form.action || window.location.pathname);
    };

    const handleError = () => {
      completeLoader();
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
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [completeLoader]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[99999] h-1.5 overflow-visible"
      aria-hidden="true"
    >
      <div
        className="relative h-full bg-gradient-to-r from-[#e6b800] via-[#ffd700] to-[#ffcc00] shadow-[0_0_12px_#ffcc00,0_0_6px_#ffd700]"
        style={{
          width: `${progress}%`,
          opacity: fading ? 0 : visible ? 1 : 0,
          transition: fading
            ? "opacity 300ms ease-out, width 200ms ease-out"
            : "width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease-in",
        }}
      >
        {/* Leading edge animated mini car */}
        <div className="absolute right-0 -top-2.5 translate-x-1/2 drop-shadow-[0_2px_8px_rgba(255,204,0,0.8)]">
          <svg
            viewBox="0 0 24 14"
            className="w-5 h-3 text-[#ffcc00]"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Aerodynamic sport car silhouette */}
            <path d="M1 9 C2 8, 4 6, 7 4 C9 2, 14 2, 18 4 L21 7 C23 7.5, 24 9, 24 10 L22 11 C21 11, 20 10.5, 19 10.5 C18 10.5, 17 11, 16.5 11.5 L8.5 11.5 C8 11, 7 10.5, 6 10.5 C5 10.5, 4 11, 3 11.5 L1 11 Z" />
            {/* Wheels */}
            <circle cx="6" cy="11.5" r="2" fill="#18181b" stroke="#ffd700" strokeWidth="0.8" />
            <circle cx="18" cy="11.5" r="2" fill="#18181b" stroke="#ffd700" strokeWidth="0.8" />
            {/* Headlight beam */}
            <polygon points="23,8 26,7 26,10" fill="#ffd700" opacity="0.85" />
          </svg>
        </div>
      </div>
    </div>
  );
}
