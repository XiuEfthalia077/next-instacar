"use client";

import * as React from "react";
import { Clock, Check, ChevronDown, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  value?: string; // "HH:mm" (24-hour format)
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function getCurrentTime24(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function format12Hour(val: string): string {
  if (!val || !val.includes(":")) return val || "";
  const parts = val.split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return val;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function parseTime(val?: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  if (!val || !val.includes(":")) {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    return {
      hour12: h % 12 === 0 ? 12 : h % 12,
      minute: m,
      period: h >= 12 ? "PM" : "AM",
    };
  }
  const [hStr, mStr] = val.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: m, period };
}

function buildTime24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const QUICK_PRESETS = [
  { label: "8:00 AM", value: "08:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "1:00 PM", value: "13:00" },
  { label: "6:00 PM", value: "18:00" },
  { label: "8:00 PM", value: "20:00" },
];

export function TimePicker({
  value,
  onChange,
  name,
  id,
  disabled = false,
  className,
  placeholder = "Select Time",
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const { hour12, minute, period } = React.useMemo(() => parseTime(value), [value]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) return;
    if (nextOpen && (!value || value.trim() === "")) {
      // Default to exact current time when opened
      const current = getCurrentTime24();
      onChange?.(current);
    }
    setOpen(nextOpen);
  };

  const handleHourSelect = (newHour: number) => {
    const time24 = buildTime24(newHour, minute, period);
    onChange?.(time24);
  };

  const handleMinuteSelect = (newMinute: number) => {
    const time24 = buildTime24(hour12, newMinute, period);
    onChange?.(time24);
  };

  const handlePeriodToggle = (newPeriod: "AM" | "PM") => {
    const time24 = buildTime24(hour12, minute, newPeriod);
    onChange?.(time24);
  };

  const handleSetNow = () => {
    const nowTime = getCurrentTime24();
    onChange?.(nowTime);
  };

  return (
    <div className={cn("relative inline-block w-full", className)}>
      {name && <input type="hidden" name={name} value={value ?? ""} id={id} />}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-between rounded-lg border-input bg-background px-3 py-2 text-left text-xs sm:text-sm font-normal shadow-xs hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-[#ffcc00]",
              !value && "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {value ? format12Hour(value) : placeholder}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="z-[250] w-[300px] rounded-xl border border-border bg-popover p-3 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-2.5 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Clock className="size-3.5 text-[#b38a00] dark:text-[#ffcc00]" />
              <span>Select Time</span>
              {value && (
                <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                  ({format12Hour(value)})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSetNow}
              className="inline-flex items-center gap-1 rounded-md bg-[#ffcc00]/20 px-2 py-0.5 text-[11px] font-bold text-[#b38a00] dark:text-[#ffcc00] hover:bg-[#ffcc00]/30 transition-colors"
            >
              <Sparkles className="size-3" />
              Now
            </button>
          </div>

          {/* Time Picker Columns */}
          <div className="grid grid-cols-3 gap-2">
            {/* Hours Column */}
            <div>
              <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Hour
              </div>
              <ScrollArea className="h-44 rounded-lg border border-border/70 bg-muted/20 p-1">
                <div className="space-y-1">
                  {HOURS_12.map((h) => {
                    const isSelected = h === hour12;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleHourSelect(h)}
                        className={cn(
                          "flex w-full items-center justify-center rounded-md py-1.5 text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-[#ffcc00] font-bold text-black shadow-xs"
                            : "hover:bg-muted text-foreground",
                        )}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Minutes Column */}
            <div>
              <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Minute
              </div>
              <ScrollArea className="h-44 rounded-lg border border-border/70 bg-muted/20 p-1">
                <div className="space-y-1">
                  {MINUTES.map((m) => {
                    const isSelected = m === minute;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMinuteSelect(m)}
                        className={cn(
                          "flex w-full items-center justify-center rounded-md py-1.5 text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-[#ffcc00] font-bold text-black shadow-xs"
                            : "hover:bg-muted text-foreground",
                        )}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Period Column (AM/PM) */}
            <div className="flex flex-col">
              <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Period
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-1 h-44 justify-center">
                {(["AM", "PM"] as const).map((p) => {
                  const isSelected = p === period;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePeriodToggle(p)}
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-md text-xs font-bold transition-colors",
                        isSelected
                          ? "bg-[#ffcc00] text-black shadow-xs"
                          : "hover:bg-muted text-foreground",
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-3 border-t border-border pt-2.5">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Quick Presets
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_PRESETS.map((preset) => {
                const isActive = value === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onChange?.(preset.value)}
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                      isActive
                        ? "border-[#ffcc00] bg-[#ffcc00] text-black font-bold"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
