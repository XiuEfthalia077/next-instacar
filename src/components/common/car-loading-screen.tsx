"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type CarSilhouetteType = "sedan" | "suv" | "van" | "hatchback";

interface CarLoadingScreenProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
  carType?: CarSilhouetteType;
  showVehicleBadge?: boolean;
  className?: string;
}

interface CarTypeConfig {
  id: CarSilhouetteType;
  name: string;
  category: string;
}

export const CAR_TYPES: CarTypeConfig[] = [
  {
    id: "sedan",
    name: "Executive Sedan",
    category: "5 Seats",
  },
  {
    id: "suv",
    name: "Adventure SUV",
    category: "7 Seats",
  },
  {
    id: "van",
    name: "Passenger Van",
    category: "15 Seats",
  },
  {
    id: "hatchback",
    name: "Compact Hatchback",
    category: "5 Seats",
  },
];

const DEFAULT_MESSAGES = [
  "Revving up your dashboard...",
  "Loading your ride...",
  "Preparing your bookings...",
  "Checking live fleet availability...",
  "Tuning the engines...",
  "Polishing the headlights...",
  "Securing the best daily rates...",
];

/* Reusable realistic alloy wheel with stationary brake caliper & spinning sport spokes */
function SpinningWheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Outer Tire Rubber */}
      <circle cx="0" cy="0" r="12" fill="#121316" stroke="#22252c" strokeWidth="1.8" />
      {/* Rim Lip & Brake Disc (Stationary) */}
      <circle cx="0" cy="0" r="9" fill="#1a1c22" />
      <circle cx="0" cy="0" r="8" fill="#2d3340" />
      {/* Red Brembo-Style Brake Caliper (Stationary at 10 o'clock) */}
      <path d="M -5 -5 A 7 7 0 0 1 -1.5 -7" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />

      {/* Spinning Sport Alloy Rim */}
      <g className="animate-car-wheel">
        <circle cx="0" cy="0" r="8.2" fill="#14161b" stroke="#4b5563" strokeWidth="0.8" />
        {/* 5 Sleek Silver Twin-Spokes */}
        <g stroke="#e2e8f0" strokeWidth="1.2" strokeLinecap="round">
          <line x1="0" y1="0" x2="0" y2="-7" />
          <line x1="0" y1="0" x2="6.6" y2="-2.2" />
          <line x1="0" y1="0" x2="4.1" y2="5.7" />
          <line x1="0" y1="0" x2="-4.1" y2="5.7" />
          <line x1="0" y1="0" x2="-6.6" y2="-2.2" />
        </g>
        {/* Graphite Hubcap with Gold Center Dot */}
        <circle cx="0" cy="0" r="2.2" fill="#0f1115" stroke="#cbd5e1" strokeWidth="0.8" />
        <circle cx="0" cy="0" r="0.9" fill="#ffcc00" />
      </g>
    </g>
  );
}

/* 1. EXECUTIVE SEDAN SILHOUETTE */
function SedanSilhouette() {
  return (
    <g>
      {/* Dynamic Headlight Beam */}
      <polygon points="174,35 220,29 220,49 174,39" fill="url(#lightBeamGrad)" opacity="0.4" />

      {/* Ground Shadows */}
      <ellipse cx="52" cy="59" rx="15" ry="1.8" fill="#000" opacity="0.8" />
      <ellipse cx="150" cy="59" rx="15" ry="1.8" fill="#000" opacity="0.8" />
      <ellipse cx="101" cy="59" rx="48" ry="1.2" fill="#000" opacity="0.4" />

      {/* Sculpted Sedan Body */}
      <path
        d="M 18 47 L 18 36 C 18 32, 22 30, 28 30 L 44 30 C 54 30, 68 18, 80 15 L 122 15 C 132 15, 144 24, 150 29 L 176 34 C 182 35, 185 38, 184 41 L 180 44 C 176 46, 172 47, 164 47 C 164 33, 136 33, 136 47 L 66 47 C 66 33, 38 33, 38 47 Z"
        fill="url(#bodyGrad)"
        stroke="#3f4553"
        strokeWidth="1"
      />

      {/* Roofline Specular Gleam */}
      <path
        d="M 44 30 C 54 30, 68 18, 80 15 L 122 15 C 132 15, 144 24, 150 29"
        stroke="url(#roofGleamGrad)"
        strokeWidth="1.2"
        fill="none"
      />

      {/* Tinted Glass & Realistic Pillars */}
      <path
        d="M 48 29 C 56 29, 68 19, 78 17 L 120 17 C 128 17, 138 24, 144 28 C 136 29, 62 29, 48 29 Z"
        fill="url(#glassGrad)"
        stroke="#2d3340"
        strokeWidth="0.75"
      />
      <line x1="98" y1="17" x2="98" y2="29" stroke="#161920" strokeWidth="2.5" />
      <line x1="72" y1="18" x2="72" y2="29" stroke="#161920" strokeWidth="1.5" />

      {/* Door Panel Shut Lines */}
      <line x1="98" y1="29" x2="98" y2="46" stroke="#181b22" strokeWidth="1" />
      <path d="M 64 29 C 58 35, 54 40, 54 46" stroke="#181b22" strokeWidth="1" />

      {/* Modern DRL Headlight & Tail Light */}
      <path d="M 172 34 L 183 36 C 182 38, 179 40, 174 38 Z" fill="#fff" />
      <path d="M 168 34 L 183 36" stroke="#ffcc00" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 18 33 L 28 33" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={52} cy={47} />
      <SpinningWheel cx={150} cy={47} />
    </g>
  );
}

/* 2. ADVENTURE SUV SILHOUETTE */
function SUVSilhouette() {
  return (
    <g>
      {/* Headlight Beam */}
      <polygon points="174,32 220,26 220,44 174,36" fill="url(#lightBeamGrad)" opacity="0.4" />

      {/* Ground Shadows */}
      <ellipse cx="52" cy="59" rx="15" ry="1.8" fill="#000" opacity="0.8" />
      <ellipse cx="150" cy="59" rx="15" ry="1.8" fill="#000" opacity="0.8" />
      <ellipse cx="101" cy="59" rx="48" ry="1.2" fill="#000" opacity="0.4" />

      {/* Roof Rails */}
      <line x1="42" y1="6" x2="128" y2="6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="6" x2="48" y2="10" stroke="#64748b" strokeWidth="1.5" />
      <line x1="86" y1="6" x2="86" y2="10" stroke="#64748b" strokeWidth="1.5" />
      <line x1="122" y1="6" x2="122" y2="10" stroke="#64748b" strokeWidth="1.5" />

      {/* SUV Muscular Body */}
      <path
        d="M 16 47 L 16 22 C 16 16, 20 10, 28 10 L 126 10 C 136 10, 146 18, 150 24 L 176 26 C 182 27, 185 30, 185 34 L 183 41 C 180 44, 174 46, 164 47 C 164 33, 136 33, 136 47 L 66 47 C 66 33, 38 33, 38 47 Z"
        fill="url(#bodyGrad)"
        stroke="#3f4553"
        strokeWidth="1"
      />

      {/* Roofline Highlight */}
      <path d="M 28 10 L 126 10 C 136 10, 146 18, 150 24" stroke="url(#roofGleamGrad)" strokeWidth="1.2" fill="none" />

      {/* 3-Pane Side Windows */}
      <path d="M 24 13 L 52 13 L 52 24 L 22 24 Z" fill="url(#glassGrad)" stroke="#2d3340" strokeWidth="0.75" />
      <path d="M 56 13 L 94 13 L 94 24 L 56 24 Z" fill="url(#glassGrad)" stroke="#2d3340" strokeWidth="0.75" />
      <path d="M 98 13 L 124 13 L 144 24 L 98 24 Z" fill="url(#glassGrad)" stroke="#2d3340" strokeWidth="0.75" />

      {/* Door Lines & Side Step */}
      <line x1="94" y1="24" x2="94" y2="46" stroke="#181b22" strokeWidth="1" />
      <line x1="56" y1="24" x2="56" y2="46" stroke="#181b22" strokeWidth="1" />
      <line x1="68" y1="48" x2="132" y2="48" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

      {/* Headlight & Tail Lamp */}
      <path d="M 172 27 L 183 29 C 182 32, 178 34, 172 32 Z" fill="#fff" />
      <path d="M 168 27 L 183 29" stroke="#ffcc00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="16" x2="15" y2="36" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={52} cy={47} />
      <SpinningWheel cx={150} cy={47} />
    </g>
  );
}

/* 3. PASSENGER VAN SILHOUETTE */
function VanSilhouette() {
  return (
    <g>
      {/* Headlight Beam */}
      <polygon points="174,33 220,27 220,45 174,37" fill="url(#lightBeamGrad)" opacity="0.4" />

      {/* Ground Shadows */}
      <ellipse cx="52" cy="59" rx="15" ry="1.8" fill="#000" opacity="0.8" />
      <ellipse cx="150" cy="59" rx="15" ry="1.8" fill="#000" opacity="0.8" />
      <ellipse cx="101" cy="59" rx="48" ry="1.2" fill="#000" opacity="0.4" />

      {/* Van High-Roof Body */}
      <path
        d="M 16 47 L 16 8 C 16 7, 18 6, 20 6 L 146 6 C 156 6, 166 14, 172 21 L 184 26 C 187 28, 188 32, 187 36 L 183 42 C 180 45, 174 46, 164 47 C 164 33, 136 33, 136 47 L 66 47 C 66 33, 38 33, 38 47 Z"
        fill="url(#bodyGrad)"
        stroke="#3f4553"
        strokeWidth="1"
      />

      {/* Roofline Highlight */}
      <path d="M 20 6 L 146 6 C 156 6, 166 14, 172 21" stroke="url(#roofGleamGrad)" strokeWidth="1.2" fill="none" />

      {/* Continuous Panoramic Window Ribbon */}
      <path d="M 22 9 L 144 9 L 168 20 L 22 20 Z" fill="url(#glassGrad)" stroke="#2d3340" strokeWidth="0.75" />
      <line x1="60" y1="9" x2="60" y2="20" stroke="#161920" strokeWidth="2.5" />
      <line x1="100" y1="9" x2="100" y2="20" stroke="#161920" strokeWidth="2.5" />
      <line x1="138" y1="9" x2="138" y2="20" stroke="#161920" strokeWidth="2.5" />

      {/* Sliding Door Rail & Seam */}
      <line x1="48" y1="31" x2="140" y2="31" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="74" y="26" width="6" height="2" rx="1" fill="#94a3b8" />
      <line x1="134" y1="20" x2="134" y2="46" stroke="#181b22" strokeWidth="1" />
      <line x1="52" y1="20" x2="52" y2="46" stroke="#181b22" strokeWidth="1" />

      {/* Headlight & Tail Light */}
      <path d="M 174 27 L 185 29 C 184 34, 180 37, 174 35 Z" fill="#fff" />
      <path d="M 170 27 L 185 29" stroke="#ffcc00" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="10" x2="15" y2="38" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={52} cy={47} />
      <SpinningWheel cx={150} cy={47} />
    </g>
  );
}

/* 4. COMPACT HATCHBACK SILHOUETTE */
function HatchbackSilhouette() {
  return (
    <g>
      {/* Headlight Beam */}
      <polygon points="165,34 210,28 210,46 165,38" fill="url(#lightBeamGrad)" opacity="0.4" />

      {/* Ground Shadows */}
      <ellipse cx="52" cy="59" rx="15" ry="1.8" fill="#000" opacity="0.8" />
      <ellipse cx="140" cy="59" rx="15" ry="1.8" fill="#000" opacity="0.8" />
      <ellipse cx="96" cy="59" rx="42" ry="1.2" fill="#000" opacity="0.4" />

      {/* Sporty Rear Roof Wing */}
      <path d="M 26 12 L 42 11 L 44 13 L 28 14 Z" fill="#94a3b8" />

      {/* Compact Hatchback Body (Shorter wheelbase) */}
      <path
        d="M 22 47 L 20 38 C 20 33, 24 24, 34 18 L 42 13 L 112 13 C 122 13, 134 21, 140 27 L 164 32 C 170 33, 174 36, 172 40 L 168 44 C 165 46, 160 47, 154 47 C 154 33, 126 33, 126 47 L 66 47 C 66 33, 38 33, 38 47 Z"
        fill="url(#bodyGrad)"
        stroke="#3f4553"
        strokeWidth="1"
      />

      {/* Roofline Highlight */}
      <path d="M 42 13 L 112 13 C 122 13, 134 21, 140 27" stroke="url(#roofGleamGrad)" strokeWidth="1.2" fill="none" />

      {/* Windows */}
      <path d="M 42 15 L 110 15 L 136 26 L 48 26 Z" fill="url(#glassGrad)" stroke="#2d3340" strokeWidth="0.75" />
      <line x1="92" y1="15" x2="92" y2="26" stroke="#161920" strokeWidth="2.5" />
      <line x1="92" y1="26" x2="92" y2="46" stroke="#181b22" strokeWidth="1" />

      {/* Headlight & Tail Light */}
      <path d="M 160 32 L 171 34 C 170 37, 166 39, 160 37 Z" fill="#fff" />
      <path d="M 156 32 L 171 34" stroke="#ffcc00" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 21 32 L 27 37" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels (Compact Wheelbase: 52 and 140) */}
      <SpinningWheel cx={52} cy={47} />
      <SpinningWheel cx={140} cy={47} />
    </g>
  );
}

export function CarLoadingScreen({
  message,
  subtext = "Fast, reliable car rentals at your fingertips",
  fullScreen = true,
  carType,
  showVehicleBadge = true,
  className,
}: CarLoadingScreenProps) {
  const [selectedType, setSelectedType] = React.useState<CarSilhouetteType>(carType || "sedan");
  const [msgIndex, setMsgIndex] = React.useState(0);

  // Randomize car type on client mount if not explicitly fixed
  React.useEffect(() => {
    if (carType) {
      setSelectedType(carType);
      return;
    }
    const randomIndex = Math.floor(Math.random() * CAR_TYPES.length);
    setSelectedType(CAR_TYPES[randomIndex].id);
  }, [carType]);

  // Rotate messages if no custom static message provided
  React.useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [message]);

  const activeMessage = message || DEFAULT_MESSAGES[msgIndex];
  const activeCar = CAR_TYPES.find((c) => c.id === selectedType) || CAR_TYPES[0];

  return (
    <div
      role="status"
      aria-label="Loading content..."
      className={cn(
        "flex flex-col items-center justify-center select-none",
        fullScreen
          ? "fixed inset-0 z-[9999] min-h-screen w-screen bg-[#0a0a0c]/95 backdrop-blur-md transition-all duration-300"
          : "relative min-h-[380px] w-full rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-sm",
        className,
      )}
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-72 sm:size-96 rounded-full bg-[#ffcc00]/8 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm px-4 w-full">
        {/* Animated Car & Road Container */}
        <div className="relative w-72 sm:w-80 h-32 flex flex-col items-center justify-center">
          {/* Subtle Speed Streaks behind vehicle */}
          <div className="absolute left-2 top-8 w-16 pointer-events-none">
            <div className="h-0.5 w-12 bg-gradient-to-l from-[#ffcc00]/50 to-transparent rounded-full animate-speed-streak-1 mb-2" />
            <div className="h-0.5 w-8 bg-gradient-to-l from-[#ffd700]/70 to-transparent rounded-full animate-speed-streak-2 mb-2 ml-4" />
          </div>

          {/* Car Silhouette with smooth suspension vibration */}
          <div className="relative z-10 animate-car-chassis">
            <svg
              viewBox="0 0 200 65"
              className="w-64 sm:w-72 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#373d4a" />
                  <stop offset="35%" stopColor="#232731" />
                  <stop offset="100%" stopColor="#14161c" />
                </linearGradient>
                <linearGradient id="lightBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 204, 0, 0.55)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
                <linearGradient id="roofGleamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="40%" stopColor="rgba(255,255,255,0.45)" />
                  <stop offset="70%" stopColor="rgba(255,204,0,0.45)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
                <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e2430" />
                  <stop offset="60%" stopColor="#0a0d13" />
                </linearGradient>
              </defs>

              {/* Dynamically render the selected realistic vehicle silhouette */}
              {selectedType === "sedan" && <SedanSilhouette />}
              {selectedType === "suv" && <SUVSilhouette />}
              {selectedType === "van" && <VanSilhouette />}
              {selectedType === "hatchback" && <HatchbackSilhouette />}
            </svg>
          </div>

          {/* Road Surface with Fast Scrolling Dashed Lane Lines (seamlessly grounded directly under wheels) */}
          <div className="w-full relative h-3 overflow-hidden flex flex-col justify-end">
            <div className="w-full h-[1.5px] bg-zinc-800" />
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

        {/* Clean Vehicle Model Pill Badge */}
        {showVehicleBadge && (
          <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-[#ffcc00]/25 shadow-xs transition-all duration-300">
            <span className="size-1.5 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
            <span className="text-[11px] font-semibold text-foreground/90 tracking-wide">
              {activeCar.name}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              • {activeCar.category}
            </span>
          </div>
        )}

        {/* Brand Logo & Rotating Message */}
        <div className="mt-3 text-center space-y-1.5 w-full">
          <div className="inline-flex items-center justify-center gap-1">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              InstaCar
            </span>
            <span className="size-2 rounded-full bg-[#ffcc00] shadow-[0_0_8px_#ffcc00]" />
          </div>

          {/* Animated Rotating Message */}
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

          {/* FLUID INDETERMINATE LASER LOADING BAR (Always accurate, smooth continuous sweep) */}
          <div className="mt-3.5 w-48 sm:w-56 h-[3px] mx-auto rounded-full bg-white/10 dark:bg-zinc-800/80 overflow-hidden relative shadow-inner">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-[#ffcc00] via-white to-transparent shadow-[0_0_10px_#ffcc00] animate-loading-laser" />
          </div>
        </div>
      </div>
    </div>
  );
}
