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

/* Reusable realistic alloy wheel with stationary brake caliper & spinning 5-spoke rim */
function SpinningWheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Outer Rubber Tire */}
      <circle cx="0" cy="0" r="11.5" fill="#121316" stroke="#27272a" strokeWidth="1.5" />
      {/* Brake Rotor Disc (Stationary) */}
      <circle cx="0" cy="0" r="8.5" fill="#1e293b" />
      {/* Red Brake Caliper (Stationary at 10 o'clock) */}
      <path d="M -5 -5 A 7 7 0 0 1 -1.5 -7" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />

      {/* Spinning Alloy Rim */}
      <g className="animate-car-wheel">
        <circle cx="0" cy="0" r="7.8" fill="#18181b" stroke="#475569" strokeWidth="0.8" />
        {/* 5 Distinct Tapered Alloy Spokes */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <line x1="0" y1="0" x2="0" y2="-6.8" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="0" y1="-1" x2="0" y2="-6.2" stroke="#ffd700" strokeWidth="0.8" opacity="0.8" />
          </g>
        ))}
        {/* Golden Center Hubcap */}
        <circle cx="0" cy="0" r="2.4" fill="#ffcc00" stroke="#0f172a" strokeWidth="0.7" />
      </g>
    </g>
  );
}

/* 1. SEDAN SILHOUETTE (Sleek 4-Door Notchback - Toyota Vios / Camry / Honda City) */
function SedanSilhouette() {
  return (
    <g>
      {/* Aerodynamic Sedan Body Profile */}
      <path
        d="M 16 49 L 16 38 C 16 34, 18 32, 24 32 L 36 32 C 46 32, 54 20, 68 17 C 78 15, 96 15, 104 17 C 112 19, 120 25, 126 31 L 154 35 C 160 36, 162 39, 160 43 L 156 47 C 154 48, 146 49, 140 49 C 139 34, 113 34, 112 49 L 52 49 C 51 34, 25 34, 24 49 L 16 49 Z"
        fill="url(#carBodyGrad)"
        stroke="#3f4553"
        strokeWidth="1.2"
      />

      {/* Tinted Cabin Windows */}
      <path
        d="M 40 31 C 46 31, 56 22, 68 19 L 102 19 C 110 21, 116 26, 122 30 C 114 31, 54 31, 40 31 Z"
        fill="#090d16"
        stroke="#2c3340"
        strokeWidth="0.9"
      />
      {/* Pillar Divisions */}
      <line x1="82" y1="19" x2="82" y2="31" stroke="#1c212b" strokeWidth="2.5" />
      <line x1="58" y1="21" x2="58" y2="31" stroke="#1c212b" strokeWidth="1.5" />

      {/* Door Panel Shut Lines */}
      <line x1="82" y1="31" x2="82" y2="48" stroke="#1f232c" strokeWidth="1" />
      <path d="M 52 31 C 48 36, 44 42, 44 48" stroke="#1f232c" strokeWidth="1" />

      {/* Gold Character Line */}
      <path d="M 28 35 L 142 37" stroke="url(#goldTrimGrad)" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />

      {/* Sleek Projector LED Headlight & Rear Taillight */}
      <path d="M 148 35 L 160 37 C 158 40, 154 41, 148 39 Z" fill="url(#goldTrimGrad)" opacity="0.9" />
      <circle cx="156" cy="37.5" r="1.4" fill="#ffffff" />
      <path d="M 16 34 L 25 34 L 23 37 L 16 37 Z" fill="#ff3b30" />

      {/* Wheels */}
      <SpinningWheel cx={38} cy={48.5} />
      <SpinningWheel cx={126} cy={48.5} />
    </g>
  );
}

/* 2. SUV SILHOUETTE (Muscular 7-Seater SUV with Roof Rails - Toyota Fortuner / Rush) */
function SUVSilhouette() {
  return (
    <g>
      {/* Iconic SUV Roof Rack Rails */}
      <line x1="30" y1="8" x2="104" y2="8" stroke="url(#goldTrimGrad)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="36" y1="8" x2="36" y2="13" stroke="#ffd700" strokeWidth="1.6" />
      <line x1="68" y1="8" x2="68" y2="13" stroke="#ffd700" strokeWidth="1.6" />
      <line x1="98" y1="8" x2="98" y2="13" stroke="#ffd700" strokeWidth="1.6" />

      {/* High-Clearance Muscular SUV Body */}
      <path
        d="M 14 49 L 14 24 C 14 18, 18 13, 24 13 L 106 13 C 114 13, 122 19, 126 25 L 152 27 C 158 28, 160 32, 160 36 L 158 43 C 156 47, 148 49, 140 49 C 139 34, 113 34, 112 49 L 52 49 C 51 34, 25 34, 24 49 L 14 49 Z"
        fill="url(#carBodyGrad)"
        stroke="#3f4553"
        strokeWidth="1.2"
      />

      {/* 3-Pane Side Windows */}
      <path d="M 20 15 L 42 15 L 42 26 L 18 26 Z" fill="#090d16" stroke="#2c3340" strokeWidth="0.9" />
      <path d="M 46 15 L 74 15 L 74 26 L 46 26 Z" fill="#090d16" stroke="#2c3340" strokeWidth="0.9" />
      <path d="M 78 15 L 102 15 L 122 25 L 78 26 Z" fill="#090d16" stroke="#2c3340" strokeWidth="0.9" />

      {/* Door Panel Shut Lines */}
      <line x1="74" y1="26" x2="74" y2="48" stroke="#1f232c" strokeWidth="1" />
      <line x1="46" y1="26" x2="46" y2="48" stroke="#1f232c" strokeWidth="1" />

      {/* Side-step Bar under Rocker */}
      <line x1="56" y1="50" x2="108" y2="50" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" />

      {/* Gold Character Line */}
      <path d="M 20 29 L 144 31" stroke="url(#goldTrimGrad)" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />

      {/* Slim Aggressive Headlight Cluster & Fog Lamp */}
      <path d="M 146 28 L 158 30 C 156 33, 152 35, 145 33 Z" fill="url(#goldTrimGrad)" opacity="0.9" />
      <circle cx="155" cy="30.5" r="1.4" fill="#ffffff" />
      <circle cx="152" cy="40" r="1.5" fill="#ffd700" />

      {/* Vertical Tail Lamp */}
      <line x1="13" y1="18" x2="13" y2="38" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={38} cy={48.5} />
      <SpinningWheel cx={126} cy={48.5} />
    </g>
  );
}

/* 3. PASSENGER VAN SILHOUETTE (High-Roof 15-Seater - Nissan Urvan / Toyota Hiace) */
function VanSilhouette() {
  return (
    <g>
      {/* High-Roof Snub-Nose Van Body */}
      <path
        d="M 14 49 L 14 10 C 14 9, 16 8, 18 8 L 124 8 C 132 8, 142 16, 146 23 L 156 28 C 160 30, 160 34, 160 38 L 156 45 C 154 48, 148 49, 142 49 C 141 34, 115 34, 114 49 L 52 49 C 51 34, 25 34, 24 49 L 14 49 Z"
        fill="url(#carBodyGrad)"
        stroke="#3f4553"
        strokeWidth="1.2"
      />

      {/* Panoramic Continuous Tinted Window Ribbon */}
      <path
        d="M 18 11 L 122 11 L 142 22 L 18 22 Z"
        fill="#090d16"
        stroke="#2c3340"
        strokeWidth="0.9"
      />
      {/* Window Pillar Separators */}
      <line x1="50" y1="11" x2="50" y2="22" stroke="#1c212b" strokeWidth="2.2" />
      <line x1="82" y1="11" x2="82" y2="22" stroke="#1c212b" strokeWidth="2.2" />
      <line x1="112" y1="11" x2="112" y2="22" stroke="#1c212b" strokeWidth="2.2" />

      {/* Sliding Door Rail Track & Handle */}
      <line x1="36" y1="33" x2="116" y2="33" stroke="url(#goldTrimGrad)" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="62" y="27" width="6" height="2.2" rx="1" fill="#ffd700" />
      <line x1="112" y1="22" x2="112" y2="48" stroke="#1f232c" strokeWidth="1" />
      <line x1="44" y1="22" x2="44" y2="48" stroke="#1f232c" strokeWidth="1" />

      {/* Vertical Front Headlight */}
      <path d="M 148 29 L 158 31 L 155 37 L 147 35 Z" fill="url(#goldTrimGrad)" opacity="0.9" />
      <circle cx="154" cy="33" r="1.4" fill="#ffffff" />
      <line x1="13" y1="12" x2="13" y2="40" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels */}
      <SpinningWheel cx={38} cy={48.5} />
      <SpinningWheel cx={128} cy={48.5} />
    </g>
  );
}

/* 4. COMPACT HATCHBACK SILHOUETTE (Sporty Fastback with Roof Wing - Toyota Wigo / Brio) */
function HatchbackSilhouette() {
  return (
    <g>
      {/* Compact Sporty Hatchback Body (Shorter wheelbase & length) */}
      <path
        d="M 20 49 L 18 39 C 18 34, 22 26, 32 20 L 22 16 L 34 15 L 94 15 C 102 15, 114 22, 120 28 L 140 33 C 146 34, 148 38, 146 42 L 142 46 C 140 48, 136 49, 132 49 C 131 34, 105 34, 104 49 L 52 49 C 51 34, 25 34, 24 49 L 20 49 Z"
        fill="url(#carBodyGrad)"
        stroke="#3f4553"
        strokeWidth="1.2"
      />

      {/* Windows */}
      <path d="M 34 18 L 92 17 L 116 27 L 40 27 Z" fill="#090d16" stroke="#2c3340" strokeWidth="0.9" />
      <line x1="78" y1="17" x2="78" y2="27" stroke="#1c212b" strokeWidth="2" />
      <line x1="78" y1="27" x2="78" y2="48" stroke="#1f232c" strokeWidth="1" />

      {/* Roof Spoiler in Gold */}
      <path d="M 22 15 L 36 14" stroke="#ffd700" strokeWidth="2.8" strokeLinecap="round" />
      {/* Sporty Gold Rocker Accent */}
      <path d="M 28 35 L 130 36" stroke="url(#goldTrimGrad)" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />

      {/* Compact Headlight Cluster */}
      <path d="M 134 32 L 144 34 C 142 37, 138 39, 132 37 Z" fill="url(#goldTrimGrad)" opacity="0.9" />
      <circle cx="140" cy="34.5" r="1.4" fill="#ffffff" />
      <line x1="19" y1="33" x2="23" y2="38" stroke="#ff3b30" strokeWidth="2.5" strokeLinecap="round" />

      {/* Wheels (Shorter wheelbase: cx=38 and cx=118) */}
      <SpinningWheel cx={38} cy={48.5} />
      <SpinningWheel cx={118} cy={48.5} />
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
  const [progress, setProgress] = React.useState(22);

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

  // Smoothly increment progress bar from 22% up to 96%
  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const step = Math.floor(Math.random() * 8) + 4;
        return Math.min(prev + step, 95);
      });
    }, 260);
    return () => clearInterval(timer);
  }, []);

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
        <div className="relative w-72 sm:w-84 h-32 flex flex-col items-center justify-center">
          {/* Speed Wind Streaks behind vehicle */}
          <div className="absolute left-2 top-8 w-16 pointer-events-none">
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
              viewBox="0 0 170 70"
              className="w-56 sm:w-64 h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#181a20" />
                  <stop offset="50%" stopColor="#2a2f3a" />
                  <stop offset="100%" stopColor="#1e222a" />
                </linearGradient>
                <linearGradient id="goldTrimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e6b800" />
                  <stop offset="50%" stopColor="#ffd700" />
                  <stop offset="100%" stopColor="#ffcc00" />
                </linearGradient>
              </defs>

              {/* Road Grounding Shadows under tires & body */}
              <ellipse cx="38" cy="60" rx="14" ry="2" fill="#000" opacity="0.7" />
              <ellipse cx="126" cy="60" rx="14" ry="2" fill="#000" opacity="0.7" />
              <ellipse cx="82" cy="60" rx="46" ry="1.5" fill="#000" opacity="0.35" />

              {/* Dynamically render the selected realistic vehicle silhouette */}
              {selectedType === "sedan" && <SedanSilhouette />}
              {selectedType === "suv" && <SUVSilhouette />}
              {selectedType === "van" && <VanSilhouette />}
              {selectedType === "hatchback" && <HatchbackSilhouette />}
            </svg>
          </div>

          {/* Road Surface with Fast Scrolling Dashed Lane Lines */}
          <div className="w-full relative h-3 mt-0.5 overflow-hidden flex flex-col justify-end">
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
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/90 border border-[#ffcc00]/30 shadow-xs transition-all duration-300">
            <span className="text-xs">{activeCar.icon}</span>
            <span className="text-[11px] font-semibold text-foreground/90">{activeCar.name}</span>
            <span className="text-[10px] text-[#ffcc00] font-medium hidden sm:inline">
              ({activeCar.category})
            </span>
          </div>
        )}

        {/* Brand Logo & Typography */}
        <div className="mt-3.5 text-center space-y-1.5 w-full">
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

          {/* FULLY WORKING ACTIVE LOADING LINE */}
          <div className="mt-4 w-52 sm:w-64 mx-auto space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-white/10 dark:bg-zinc-800 border border-white/15 dark:border-zinc-700/60 overflow-hidden relative shadow-inner">
              {/* Continuously traveling shimmering light beam that sweeps across the entire track */}
              <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-[#ffd700]/50 to-transparent animate-loading-track pointer-events-none" />

              {/* Actively advancing progress fill from left to right */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d97706] via-[#ffd700] to-[#ffcc00] transition-all duration-300 ease-out relative shadow-[0_0_10px_rgba(255,204,0,0.8)]"
                style={{ width: `${progress}%` }}
              >
                {/* Secondary shimmer inside the active fill */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-loading-shimmer" />
                {/* Glowing leading tip bulb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 size-2 rounded-full bg-white shadow-[0_0_6px_#ffcc00]" />
              </div>
            </div>

            {/* Subtle real-time loading progress percentage */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-mono px-0.5">
              <span>Loading fleet resources</span>
              <span className="font-semibold text-[#ffcc00]">{progress}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
