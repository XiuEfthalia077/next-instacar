"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CarLoadingScreenProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
  className?: string;
}

const DEFAULT_MESSAGES = [
  "Revving up the engine...",
  "Tuning the performance fleet...",
  "Accelerating to destination...",
  "Preparing your seamless ride...",
];

export function CarLoadingScreen({
  message,
  subtext = "Fast, reliable car rentals at your fingertips",
  fullScreen = true,
  className,
}: CarLoadingScreenProps) {
  const [msgIndex, setMsgIndex] = React.useState(0);

  React.useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [message]);

  const activeMessage = message || DEFAULT_MESSAGES[msgIndex];

  return (
    <div
      role="status"
      aria-label="Loading content..."
      className={cn(
        "flex flex-col items-center justify-center select-none",
        fullScreen
          ? "fixed inset-0 z-[9999] min-h-screen w-screen bg-background/95 backdrop-blur-md transition-all duration-300"
          : "relative min-h-[380px] w-full rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-sm",
        className,
      )}
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-72 sm:size-96 rounded-full bg-[#ffcc00]/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/3 -translate-y-1/3 size-48 rounded-full bg-[#ffd700]/5 blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm px-4">
        {/* Animated Car & Road Container */}
        <div className="relative w-72 sm:w-80 h-32 flex flex-col items-center justify-center">
          {/* Speed Wind Streaks behind vehicle */}
          <div className="absolute left-6 top-8 w-16 pointer-events-none">
            <div className="h-0.5 w-12 bg-gradient-to-l from-[#ffcc00]/60 to-transparent rounded-full animate-speed-streak-1 mb-2" />
            <div className="h-0.5 w-8 bg-gradient-to-l from-[#ffd700]/80 to-transparent rounded-full animate-speed-streak-2 mb-2 ml-4" />
            <div className="h-0.5 w-10 bg-gradient-to-l from-foreground/40 to-transparent rounded-full animate-speed-streak-3 ml-2" />
          </div>

          {/* Headlight beam illuminating the road ahead */}
          <div className="absolute right-0 top-10 w-28 h-14 pointer-events-none overflow-hidden animate-car-headlight">
            <div className="w-full h-full bg-gradient-to-r from-[#ffcc00]/50 via-[#ffd700]/25 to-transparent clip-headlight-cone" />
          </div>

          {/* Car Silhouette / Vector Art with chassis vibration */}
          <div className="relative z-10 animate-car-chassis">
            <svg
              viewBox="0 0 160 60"
              className="w-48 sm:w-56 h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1a1c22" />
                  <stop offset="50%" stopColor="#2c303b" />
                  <stop offset="100%" stopColor="#1f2229" />
                </linearGradient>
                <linearGradient id="goldTrimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e6b800" />
                  <stop offset="50%" stopColor="#ffd700" />
                  <stop offset="100%" stopColor="#ffcc00" />
                </linearGradient>
                <radialGradient id="wheelRimGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="60%" stopColor="#333" />
                  <stop offset="100%" stopColor="#111" />
                </radialGradient>
              </defs>

              {/* Aerodynamic Roofline & Body */}
              <path
                d="M12 36 L24 35 C28 35, 34 32, 42 24 C50 16, 68 13, 98 13 C114 13, 126 18, 134 26 L146 29 C152 30, 156 34, 156 38 L152 42 C150 44, 146 45, 142 45 L132 45 C130 40, 124 36, 118 36 C112 36, 106 40, 104 45 L56 45 C54 40, 48 36, 42 36 C36 36, 30 40, 28 45 L16 45 C12 45, 10 41, 10 38 Z"
                fill="url(#carBodyGrad)"
                stroke="#3f4553"
                strokeWidth="1.2"
              />

              {/* Cabin Glass / Tinted Windshield */}
              <path
                d="M48 24 L60 16 C66 15, 94 15, 102 15 C108 17, 118 21, 124 26 Z"
                fill="#0d1117"
                stroke="url(#goldTrimGrad)"
                strokeWidth="0.8"
                opacity="0.9"
              />
              {/* Window Pillar divider */}
              <line x1="84" y1="15" x2="84" y2="25" stroke="#2c303b" strokeWidth="1.5" />

              {/* Signature InstaCar Gold Body Side Stripe */}
              <path
                d="M24 36 L144 36"
                stroke="url(#goldTrimGrad)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              {/* Front Headlight LED */}
              <polygon points="146,31 154,34 146,36" fill="#ffcc00" />

              {/* Rear Tail Lamp LED */}
              <line x1="10" y1="36" x2="14" y2="36" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" />

              {/* Front Wheel Arch & Spinning Wheel */}
              <g transform="translate(118, 45)">
                <circle cx="0" cy="0" r="10" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
                <g className="animate-car-wheel">
                  <circle cx="0" cy="0" r="7" fill="url(#wheelRimGrad)" />
                  <circle cx="0" cy="0" r="2.5" fill="#ffcc00" />
                  <line x1="-6" y1="0" x2="6" y2="0" stroke="#fff" strokeWidth="1" opacity="0.8" />
                  <line x1="0" y1="-6" x2="0" y2="6" stroke="#fff" strokeWidth="1" opacity="0.8" />
                  <line x1="-4" y1="-4" x2="4" y2="4" stroke="#ffd700" strokeWidth="1" opacity="0.6" />
                  <line x1="-4" y1="4" x2="4" y2="-4" stroke="#ffd700" strokeWidth="1" opacity="0.6" />
                </g>
              </g>

              {/* Rear Wheel Arch & Spinning Wheel */}
              <g transform="translate(42, 45)">
                <circle cx="0" cy="0" r="10" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
                <g className="animate-car-wheel">
                  <circle cx="0" cy="0" r="7" fill="url(#wheelRimGrad)" />
                  <circle cx="0" cy="0" r="2.5" fill="#ffcc00" />
                  <line x1="-6" y1="0" x2="6" y2="0" stroke="#fff" strokeWidth="1" opacity="0.8" />
                  <line x1="0" y1="-6" x2="0" y2="6" stroke="#fff" strokeWidth="1" opacity="0.8" />
                  <line x1="-4" y1="-4" x2="4" y2="4" stroke="#ffd700" strokeWidth="1" opacity="0.6" />
                  <line x1="-4" y1="4" x2="4" y2="-4" stroke="#ffd700" strokeWidth="1" opacity="0.6" />
                </g>
              </g>
            </svg>
          </div>

          {/* Road Surface with Fast Scrolling Dashed Lane Lines */}
          <div className="w-full relative h-3 mt-1 overflow-hidden flex flex-col justify-end">
            {/* Asphalt solid line */}
            <div className="w-full h-[1.5px] bg-border/80" />
            {/* Moving road dashes */}
            <div className="w-[200%] flex items-center gap-3 animate-car-road py-1">
              {Array.from({ length: 24 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-1 w-5 shrink-0 rounded-full bg-gradient-to-r from-[#ffcc00] to-[#ffd700]/70 opacity-80"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Brand Logo & Typography */}
        <div className="mt-5 text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              InstaCar
            </span>
            <span className="size-2 rounded-full bg-[#ffcc00] shadow-[0_0_8px_#ffcc00]" />
          </div>

          {/* Animated Message */}
          <div className="h-6 flex items-center justify-center overflow-hidden">
            <p
              key={activeMessage}
              className="text-xs sm:text-sm font-semibold tracking-wide text-foreground/90 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {activeMessage}
            </p>
          </div>

          {/* Subtext */}
          {subtext ? (
            <p className="text-[11px] text-muted-foreground font-medium">
              {subtext}
            </p>
          ) : null}

          {/* Polished Gold Track Indicator */}
          <div className="mt-3 w-40 sm:w-48 h-1 mx-auto overflow-hidden rounded-full bg-muted/60 relative">
            <div className="h-full w-24 rounded-full bg-gradient-to-r from-transparent via-[#ffcc00] to-transparent animate-speed-streak-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
