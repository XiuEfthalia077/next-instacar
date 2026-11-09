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
  badge: string;
  icon: string;
}

export const CAR_TYPES: CarTypeConfig[] = [
  {
    id: "sedan",
    name: "Executive Sedan",
    category: "Sedan • 5 Seats",
    badge: "Toyota Vios / Honda City",
    icon: "🏎️",
  },
  {
    id: "suv",
    name: "Adventure SUV",
    category: "SUV • 7 Seats",
    badge: "Toyota Fortuner / Rush",
    icon: "🚙",
  },
  {
    id: "van",
    name: "Passenger Van",
    category: "Van • 15 Seats",
    badge: "Nissan Urvan High Roof",
    icon: "🚐",
  },
  {
    id: "hatchback",
    name: "Compact Hatchback",
    category: "Hatchback • 5 Seats",
    badge: "Toyota Wigo / Brio",
    icon: "🚗",
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

/* Reusable animated spinning wheel */
function SpinningWheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
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
  );
}

/* 1. Sedan Silhouette */
function SedanSilhouette() {
  return (
    <g>
      {/* Aerodynamic Roofline & Body */}
      <path
        d="M12 38 L24 34 C28 34, 34 31, 42 23 C50 16, 68 14, 96 14 C112 14, 122 19, 130 26 L146 29 C152 30, 156 34, 156 38 L152 42 C150 44, 146 45, 142 45 L132 45 C130 39, 124 35, 118 35 C112 35, 106 39, 104 45 L56 45 C54 39, 48 35, 42 35 C36 35, 30 39, 28 45 L16 45 C12 45, 10 41, 10 38 Z"
        fill="url(#carBodyGrad)"
        stroke="#3f4553"
        strokeWidth="1.2"
      />
      {/* Cabin Glass / Tinted Windshield */}
      <path
        d="M48 23 L60 16 C66 15, 94 15, 100 15 C106 17, 116 21, 122 26 Z"
        fill="#0d1117"
        stroke="url(#goldTrimGrad)"
        strokeWidth="0.8"
        opacity="0.9"
      />
      <line x1="84" y1="15" x2="84" y2="25" stroke="#2c303b" strokeWidth="1.5" />

      {/* Gold Trim Line */}
      <path d="M24 35 L144 35" stroke="url(#goldTrimGrad)" strokeWidth="1.8" strokeLinecap="round" />

      {/* Front Headlight LED & Rear Tail Light */}
      <polygon points="146,31 154,34 146,36" fill="#ffcc00" />
      <line x1="10" y1="36" x2="14" y2="36" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={42} cy={45} />
      <SpinningWheel cx={118} cy={45} />
    </g>
  );
}

/* 2. SUV Silhouette */
function SUVSilhouette() {
  return (
    <g>
      {/* Roof Rails */}
      <line x1="44" y1="8" x2="108" y2="8" stroke="url(#goldTrimGrad)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="52" y1="8" x2="52" y2="12" stroke="#ffd700" strokeWidth="1.5" />
      <line x1="76" y1="8" x2="76" y2="12" stroke="#ffd700" strokeWidth="1.5" />
      <line x1="100" y1="8" x2="100" y2="12" stroke="#ffd700" strokeWidth="1.5" />

      {/* Muscular SUV Body Profile */}
      <path
        d="M10 42 L12 22 C13 18, 15 15, 18 13 L24 12 C32 12, 80 12, 100 12 C108 12, 114 16, 120 22 L146 25 C152 26, 156 30, 156 35 L152 42 C150 44, 146 45, 142 45 L132 45 C130 38, 124 34, 118 34 C112 34, 106 38, 104 45 L56 45 C54 38, 48 34, 42 34 C36 34, 30 38, 28 45 L16 45 C12 45, 10 42, 10 42 Z"
        fill="url(#carBodyGrad)"
        stroke="#3f4553"
        strokeWidth="1.2"
      />

      {/* Tinted 3-Pane Side Windows */}
      <path
        d="M22 15 L46 15 L46 23 L18 23 Z"
        fill="#0d1117"
        stroke="url(#goldTrimGrad)"
        strokeWidth="0.8"
        opacity="0.9"
      />
      <path
        d="M50 15 L78 15 L78 23 L50 23 Z"
        fill="#0d1117"
        stroke="url(#goldTrimGrad)"
        strokeWidth="0.8"
        opacity="0.9"
      />
      <path
        d="M82 15 L98 15 L116 22 L82 23 Z"
        fill="#0d1117"
        stroke="url(#goldTrimGrad)"
        strokeWidth="0.8"
        opacity="0.9"
      />

      {/* Muscular Shoulder Gold Accent */}
      <path d="M18 27 L148 27" stroke="url(#goldTrimGrad)" strokeWidth="1.8" strokeLinecap="round" />

      {/* Fender Flare Highlight Curves */}
      <path d="M28 43 C30 36, 36 34, 42 34 C48 34, 54 36, 56 43" stroke="#ffcc00" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M104 43 C106 36, 112 34, 118 34 C124 34, 130 36, 132 43" stroke="#ffcc00" strokeWidth="1" fill="none" opacity="0.5" />

      {/* Front Aggressive LED & Fog Light */}
      <polygon points="146,27 154,30 148,34" fill="#ffcc00" />
      <circle cx="150" cy="38" r="1.5" fill="#ffd700" />
      {/* Tall Rear Tail Light */}
      <line x1="10" y1="20" x2="10" y2="36" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={42} cy={45} />
      <SpinningWheel cx={118} cy={45} />
    </g>
  );
}

/* 3. Passenger Van Silhouette */
function VanSilhouette() {
  return (
    <g>
      {/* Boxy High Roof Van Body */}
      <path
        d="M12 44 L12 13 C12 11, 14 10, 16 10 L122 10 C128 10, 134 14, 140 21 L152 27 C156 29, 156 34, 156 39 L152 42 C150 44, 146 45, 142 45 L132 45 C130 38, 124 34, 118 34 C112 34, 106 38, 104 45 L56 45 C54 38, 48 34, 42 34 C36 34, 30 38, 28 45 L16 45 C13 45, 12 44, 12 44 Z"
        fill="url(#carBodyGrad)"
        stroke="#3f4553"
        strokeWidth="1.2"
      />

      {/* Expansive Panoramic Passenger Windows */}
      <path
        d="M18 13 L120 13 L136 22 L18 22 Z"
        fill="#0d1117"
        stroke="url(#goldTrimGrad)"
        strokeWidth="0.8"
        opacity="0.9"
      />
      {/* Window Pillar Separators */}
      <line x1="50" y1="13" x2="50" y2="22" stroke="#2c303b" strokeWidth="2" />
      <line x1="82" y1="13" x2="82" y2="22" stroke="#2c303b" strokeWidth="2" />
      <line x1="110" y1="13" x2="110" y2="22" stroke="#2c303b" strokeWidth="2" />

      {/* Sliding Door Guide Rail & Handle */}
      <line x1="36" y1="32" x2="108" y2="32" stroke="url(#goldTrimGrad)" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="58" y="26" width="6" height="2" rx="1" fill="#ffd700" />

      {/* Stacked Front LED Headlight */}
      <polygon points="146,28 154,30 152,38 146,36" fill="#ffcc00" />
      {/* Tall Vertical Tail Light */}
      <line x1="12" y1="14" x2="12" y2="38" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={42} cy={45} />
      <SpinningWheel cx={118} cy={45} />
    </g>
  );
}

/* 4. Compact Hatchback Silhouette */
function HatchbackSilhouette() {
  return (
    <g>
      {/* Sporty Rear Roof Wing */}
      <path d="M26 15 L36 14 L38 16 L28 17 Z" fill="#ffd700" />

      {/* Compact Hatchback Body Profile */}
      <path
        d="M18 42 L20 33 C22 30, 26 23, 34 17 C42 15, 60 14, 88 14 C100 14, 110 19, 118 26 L144 30 C150 31, 152 35, 150 40 L146 43 C144 44, 140 45, 138 45 L130 45 C128 38, 122 34, 116 34 C110 34, 104 38, 102 45 L56 45 C54 38, 48 34, 42 34 C36 34, 30 38, 28 45 L22 45 C19 45, 18 42, 18 42 Z"
        fill="url(#carBodyGrad)"
        stroke="#3f4553"
        strokeWidth="1.2"
      />

      {/* Sporty Sloping Windows */}
      <path
        d="M36 18 L86 16 C96 16, 108 20, 114 26 L46 25 Z"
        fill="#0d1117"
        stroke="url(#goldTrimGrad)"
        strokeWidth="0.8"
        opacity="0.9"
      />
      <line x1="78" y1="16" x2="78" y2="25" stroke="#2c303b" strokeWidth="1.5" />

      {/* Sporty Lower Gold Rocker Stripe */}
      <path d="M26 35 L136 35" stroke="url(#goldTrimGrad)" strokeWidth="1.8" strokeLinecap="round" />

      {/* Sharp Front Headlight LED & Rear Lamp */}
      <polygon points="140,31 148,34 142,37" fill="#ffcc00" />
      <line x1="19" y1="31" x2="23" y2="35" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={42} cy={45} />
      <SpinningWheel cx={116} cy={45} />
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
    }, 2200);
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
          <div className="absolute left-4 top-8 w-16 pointer-events-none">
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

              {/* Dynamically render the randomized silhouette */}
              {selectedType === "sedan" && <SedanSilhouette />}
              {selectedType === "suv" && <SUVSilhouette />}
              {selectedType === "van" && <VanSilhouette />}
              {selectedType === "hatchback" && <HatchbackSilhouette />}
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

        {/* Randomized Vehicle Silhouette Badge */}
        {showVehicleBadge && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-card/90 border border-[#ffcc00]/25 shadow-xs transition-all duration-300">
            <span className="text-xs">{activeCar.icon}</span>
            <span className="text-[11px] font-semibold text-foreground/90">{activeCar.name}</span>
            <span className="text-[10px] text-[#ffcc00] font-medium hidden sm:inline">
              ({activeCar.category})
            </span>
          </div>
        )}

        {/* Brand Logo & Typography */}
        <div className="mt-3.5 text-center space-y-1.5">
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

          {/* Polished Gold Track Indicator */}
          <div className="mt-3 w-40 sm:w-48 h-1 mx-auto overflow-hidden rounded-full bg-muted/60 relative">
            <div className="h-full w-24 rounded-full bg-gradient-to-r from-transparent via-[#ffcc00] to-transparent animate-speed-streak-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
