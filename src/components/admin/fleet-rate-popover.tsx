"use client";

import * as React from "react";
import { ChevronDown, Clock, Coins, Sparkles, TrendingUp } from "lucide-react";

import { Money } from "@/components/common/money";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CarWithOwner } from "@/lib/data/cars";

export function FleetRatePopover({ car }: { car: CarWithOwner }) {
  const p10 = Number(car.price_10_hours ?? 0);
  const p12 = Number(car.price_12_hours ?? 0);
  const p24 = Number(car.price_24_hours ?? 0);

  const op10 = Number(car.operator_10_hours ?? 0);
  const op12 = Number(car.operator_12_hours ?? 0);
  const op24 = Number(car.operator_24_hours ?? 0);

  const ext1 = Number(car.ext_price_1_6 ?? 0);
  const ext7 = Number(car.ext_price_7_10 ?? 0);
  const ext11 = Number(car.ext_price_11_12 ?? 0);
  const ext13 = Number(car.ext_price_13_24 ?? 0);

  return (
    <div className="space-y-1">
      {/* Primary Base 24h Rate */}
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-black text-foreground">
          <Money value={p24} />
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">/ 24h</span>
      </div>

      {/* Popover Breakdown Trigger */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group/trigger inline-flex items-center gap-1 text-[11px] font-bold text-[#b38a00] hover:text-[#8a6a00] dark:text-[#ffcc00] dark:hover:text-[#ffd633] transition cursor-pointer"
          >
            <span>View Rates</span>
            <ChevronDown className="size-3 transition-transform group-data-[state=open]/trigger:rotate-180" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-80 rounded-2xl border-border bg-popover p-4 shadow-2xl text-popover-foreground z-[200]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffcc00]">
                <Coins className="size-4" />
              </div>
              <span className="text-xs font-black text-foreground uppercase tracking-wider">
                Tariff Breakdown
              </span>
            </div>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {car.plate_number ?? "No Plate"}
            </span>
          </div>

          {/* Tier Rates Matrix */}
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Base Rental Rates &amp; Operator Share
            </p>
            <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden divide-y divide-border/50 text-xs">
              <div className="grid grid-cols-3 px-3 py-1.5 bg-muted/60 text-[10px] font-bold text-muted-foreground uppercase">
                <span>Tier</span>
                <span className="text-right">Customer</span>
                <span className="text-right text-emerald-600 dark:text-emerald-400">Operator</span>
              </div>
              <div className="grid grid-cols-3 px-3 py-1.5 font-medium">
                <span className="text-muted-foreground">10 Hours</span>
                <span className="text-right font-bold text-foreground"><Money value={p10} /></span>
                <span className="text-right font-semibold text-emerald-600 dark:text-emerald-400"><Money value={op10} /></span>
              </div>
              <div className="grid grid-cols-3 px-3 py-1.5 font-medium">
                <span className="text-muted-foreground">12 Hours</span>
                <span className="text-right font-bold text-foreground"><Money value={p12} /></span>
                <span className="text-right font-semibold text-emerald-600 dark:text-emerald-400"><Money value={op12} /></span>
              </div>
              <div className="grid grid-cols-3 px-3 py-1.5 font-bold bg-[#ffcc00]/5">
                <span className="text-[#b38a00] dark:text-[#ffcc00]">24 Hours</span>
                <span className="text-right text-foreground"><Money value={p24} /></span>
                <span className="text-right text-emerald-600 dark:text-emerald-400"><Money value={op24} /></span>
              </div>
            </div>
          </div>

          {/* Hourly Overtime Extensions */}
          <div className="mt-3.5 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Hourly Overtime Extensions
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block">1-6 Hours</span>
                <span className="font-bold text-foreground">₱{ext1} <span className="text-[10px] font-normal text-muted-foreground">/ hr</span></span>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block">7-10 Hours</span>
                <span className="font-bold text-foreground">₱{ext7}</span>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block">11-12 Hours</span>
                <span className="font-bold text-foreground">₱{ext11}</span>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-2">
                <span className="text-[10px] text-muted-foreground block">13-24 Hours</span>
                <span className="font-bold text-foreground">₱{ext13}</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
