"use client";

import { Check, ChevronDown, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEFAULT_TYPES = [
  "Sedan",
  "SUV",
  "MPV",
  "Van",
  "Hatchback",
  "Pickup Truck",
  "Crossover",
  "Coupe",
  "Convertible",
  "Luxury / Executive",
  "Electric / Hybrid",
  "Others (Custom)",
];

const STORAGE_KEY = "instacar_custom_car_types";

type CarTypePickerProps = {
  value?: string;
  name?: string;
  onChange?: (val: string) => void;
};

export function CarTypePicker({
  value = "Sedan",
  name = "type",
  onChange,
}: CarTypePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState(value);
  const [search, setSearch] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState("");

  const [types, setTypes] = React.useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        /* ignore */
      }
    }
    return DEFAULT_TYPES;
  });

  // Save changes to localStorage so custom types persist
  const persistTypes = (newTypes: string[]) => {
    setTypes(newTypes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTypes));
    } catch {
      /* ignore */
    }
  };

  const handleSelect = (t: string) => {
    setSelectedType(t);
    onChange?.(t);
    setOpen(false);
  };

  const handleAdd = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    if (!types.includes(trimmed)) {
      const next = [...types, trimmed];
      persistTypes(next);
      handleSelect(trimmed);
      setSearch("");
    }
  };

  const handleDelete = (t: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = types.filter((item) => item !== t);
    persistTypes(next);
    if (selectedType === t) {
      setSelectedType(next[0] || "Sedan");
    }
  };

  const startEdit = (idx: number, t: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(idx);
    setEditValue(t);
  };

  const saveEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const trimmed = editValue.trim();
    if (trimmed) {
      const next = [...types];
      next[idx] = trimmed;
      persistTypes(next);
      if (selectedType === types[idx]) {
        setSelectedType(trimmed);
      }
    }
    setEditingIndex(null);
  };

  const filtered = types.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedType} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50"
          >
            <span>{selectedType || "Select Car Type"}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="z-[200] w-[320px] rounded-xl border-border bg-[#0d0f12] p-2 text-foreground shadow-2xl"
          align="start"
        >
          {/* Search & Add Bar */}
          <div className="flex items-center gap-1.5 pb-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search vehicle type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#ffcc00] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!search.trim()}
              className="h-8 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 text-xs font-bold text-sky-400 transition hover:bg-sky-500 hover:text-black disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {/* Types List (Matching Image 1) */}
          <div className="max-h-56 space-y-0.5 overflow-y-auto pt-1">
            {filtered.map((t, idx) => {
              const isSelected = selectedType === t;
              const isEditing = editingIndex === idx;

              return (
                <div
                  key={`${t}-${idx}`}
                  onClick={() => !isEditing && handleSelect(t)}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition",
                    isSelected
                      ? "bg-[#ffcc00]/15 text-[#ffcc00]"
                      : "text-foreground hover:bg-muted/50",
                  )}
                >
                  {isEditing ? (
                    <div
                      className="flex flex-1 items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-6 flex-1 rounded border border-border bg-black px-1.5 text-xs text-foreground focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => saveEdit(idx, e)}
                        className="rounded bg-[#ffcc00] px-1.5 py-0.5 text-[10px] font-bold text-black"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate">{t}</span>
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => startEdit(idx, t, e)}
                          className="text-[11px] font-bold text-amber-400 hover:underline"
                          title="Edit vehicle type"
                        >
                          [Edit]
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(t, e)}
                          className="text-[11px] font-bold text-rose-500 hover:underline"
                          title="Delete vehicle type"
                        >
                          [X]
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div className="my-1.5 border-t border-border/80" />

            <div
              onClick={() => handleSelect("Others (Custom)")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-extrabold cursor-pointer transition",
                selectedType === "Others (Custom)"
                  ? "bg-[#ffcc00]/15 text-[#ffcc00]"
                  : "text-foreground hover:bg-muted/50",
              )}
            >
              Others (Custom)
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
