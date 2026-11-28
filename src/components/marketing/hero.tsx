import Link from "next/link";
import {
  CalendarCheck,
  Car,
  Clock,
  FileCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { KayakHeroSearch, type BranchOption } from "@/components/marketing/kayak-hero-search";

export function Hero({
  branches,
  todayStr,
  totalFleetCount,
}: {
  branches?: BranchOption[];
  todayStr?: string;
  totalFleetCount?: number;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/20 to-background py-12 md:py-20 lg:py-24 transition-colors">
      {/* Background Ambient Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(255,204,0,0.18), transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-3 sm:px-4">
        <div className="mx-auto max-w-[1040px] text-center">
          {/* Top Badge: Total Fleet Count */}
          <div className="mb-4 inline-flex max-w-full px-1">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#ffcc00]/50 bg-[#ffcc00]/10 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-bold text-amber-700 dark:text-[#ffcc00] shadow-xs text-center">
              <Sparkles className="size-3.5 shrink-0" />
              <span className="truncate">
                {totalFleetCount && totalFleetCount > 0
                  ? `${totalFleetCount} Vehicles Available • Flexible 10H, 12H & 24H Rates`
                  : "Reliable Car Rentals • Doorstep Delivery & Flexible Tiers"}
              </span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="hero-title mb-4 text-foreground break-words">
            <span className="hero-gradient-text">Book Now</span>
            <br />
            Rent a Car for Your Next Trip
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-8 max-w-2xl px-2 text-xs sm:text-base md:text-lg font-normal leading-relaxed text-muted-foreground break-words">
            From quick 10-hour business trips to full weekly family getaways.
            Enjoy transparent 10H, 12H &amp; 24H rates, doorstep delivery across
            Pavia &amp; Iloilo, and thoroughly pre-inspected vehicles ready to drive.
          </p>

          {/* KAYAK Signature Search Widget (Tasks 1.1 & 1.2) */}
          <div className="mb-10">
            <KayakHeroSearch branches={branches} defaultDate={todayStr} />
          </div>

          {/* Primary & Secondary Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <a
              href="#availability"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-6 py-3 text-sm font-black text-black shadow-lg transition-all hover:bg-[#ffd633] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Car className="size-4" />
              <span>Book Now</span>
            </a>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-bold text-foreground transition-all hover:bg-muted hover:border-[#ffcc00]/60 active:scale-[0.98]"
            >
              <CalendarCheck className="size-4" />
              <span>Create Free Account</span>
            </Link>
          </div>

          {/* Service Guarantee Strip */}
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-6 border-t border-border/70 text-left">
            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#ffcc00]">
                <Clock className="size-4 text-amber-600 dark:text-[#ffcc00]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">10h, 12h &amp; 24h</p>
                <p className="text-[10px] text-muted-foreground truncate">Flexible rental tiers</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#ffcc00]">
                <Truck className="size-4 text-amber-600 dark:text-[#ffcc00]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Doorstep Delivery</p>
                <p className="text-[10px] text-muted-foreground truncate">Home, hotel, or airport</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#ffcc00]">
                <ShieldCheck className="size-4 text-amber-600 dark:text-[#ffcc00]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Inspected &amp; Clean</p>
                <p className="text-[10px] text-muted-foreground truncate">Full safety checkup</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#ffcc00]">
                <FileCheck className="size-4 text-amber-600 dark:text-[#ffcc00]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Digital Contract</p>
                <p className="text-[10px] text-muted-foreground truncate">Fast paperless booking</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
