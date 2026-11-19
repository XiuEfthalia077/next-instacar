"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string; // "YYYY-MM-DD"
  onChange?: (date: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  minDate?: string; // "YYYY-MM-DD"
  maxDate?: string;
}

export function DatePicker({
  value,
  onChange,
  name,
  id,
  disabled = false,
  className,
  placeholder = "Select date",
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const minParsed = React.useMemo(() => {
    if (!minDate) return undefined;
    const d = parseISO(minDate);
    return isValid(d) ? d : undefined;
  }, [minDate]);

  const maxParsed = React.useMemo(() => {
    if (!maxDate) return undefined;
    const d = parseISO(maxDate);
    return isValid(d) ? d : undefined;
  }, [maxDate]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const isoStr = `${year}-${month}-${day}`;
      onChange?.(isoStr);
    } else {
      onChange?.("");
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  const formattedDisplay = parsedDate ? format(parsedDate, "MMM d, yyyy") : "";

  return (
    <div className="relative w-full">
      {name && <input type="hidden" name={name} value={value ?? ""} id={id} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-2xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none transition-all duration-200 hover:border-[#ffcc00]/70 focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#121417]",
              !parsedDate && "text-muted-foreground",
              open && "border-[#ffcc00] ring-1 ring-[#ffcc00]/50",
              className,
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarDays className="size-4 shrink-0 text-[#b38a00] dark:text-[#ffcc00]" />
              <span className="truncate">{formattedDisplay || placeholder}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-1 text-muted-foreground">
              {parsedDate && !disabled ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => e.key === "Enter" && handleClear(e as any)}
                  className="rounded-full p-0.5 hover:bg-muted hover:text-foreground transition cursor-pointer"
                  title="Clear date"
                >
                  <X className="size-3.5" />
                </span>
              ) : null}
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-auto p-3 rounded-2xl border border-border/80 bg-card dark:bg-[#121417] text-card-foreground shadow-2xl z-[250]"
        >
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={handleSelect}
            disabled={(date) => {
              if (minParsed && date < minParsed) return true;
              if (maxParsed && date > maxParsed) return true;
              return false;
            }}
            className="rounded-xl border-0"
            classNames={{
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              selected:
                "bg-[#ffcc00] text-black font-black hover:bg-[#ffd633] hover:text-black focus:bg-[#ffcc00] focus:text-black rounded-xl shadow-xs",
              today: "bg-muted font-bold text-foreground rounded-xl border border-[#ffcc00]/50",
            }}
          />

          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                handleSelect(today);
              }}
              className="px-2 py-1 font-bold text-[#b38a00] dark:text-[#ffcc00] hover:underline cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                handleSelect(tomorrow);
              }}
              className="px-2 py-1 font-bold text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
            >
              Tomorrow
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className="px-2 py-1 font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Clear
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
