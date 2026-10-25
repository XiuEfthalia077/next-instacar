"use client";

import { ChevronDown, Search, User, XCircle } from "lucide-react";
import * as React from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type OperatorOption = {
  id: number;
  name: string | null;
  email?: string | null;
};

type OperatorSelectProps = {
  operators: OperatorOption[];
  value?: number | null;
  name?: string;
  onChange?: (id: number | null) => void;
};

export function OperatorSelect({
  operators,
  value = null,
  name = "user_id",
  onChange,
}: OperatorSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(value);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    setSelectedId(value);
  }, [value]);

  const selectedOperator = operators.find((op) => op.id === selectedId);

  const handleSelect = (id: number | null) => {
    setSelectedId(id);
    onChange?.(id);
    setOpen(false);
  };

  const filtered = operators.filter((op) => {
    const text = `${op.name ?? ""} ${op.email ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-1">
      <input type="hidden" name={name} value={selectedId ? String(selectedId) : ""} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50"
          >
            <span>
              {selectedOperator ? (
                <span className="font-bold text-foreground">
                  {selectedOperator.name ?? `Operator #${selectedOperator.id}`}
                </span>
              ) : (
                <span className="font-semibold text-foreground/80">
                  Unassigned (Company-owned)
                </span>
              )}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[340px] rounded-xl border-border bg-[#0d0f12] p-2 text-foreground shadow-2xl"
          align="start"
        >
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search operator by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#ffcc00] focus:outline-none"
            />
          </div>

          {/* Operators List (Matching Image 5) */}
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {filtered.map((op) => {
              const isSelected = selectedId === op.id;

              return (
                <div
                  key={op.id}
                  onClick={() => handleSelect(op.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg p-2 cursor-pointer transition",
                    isSelected
                      ? "bg-muted text-foreground ring-1 ring-border"
                      : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <User className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">
                      {op.name ?? `Operator #${op.id}`}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {op.email ?? `user_${op.id}@instacar.ph`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Option: Unassigned / Company-owned (Matching Image 5) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="flex w-full items-center gap-2 rounded-xl bg-[#ffcc00] px-3 py-2 text-xs font-black text-black shadow-sm transition hover:bg-[#ffd700]"
            >
              <XCircle className="size-4" />
              <span>Unassigned (Company-owned)</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <p className="text-[11px] text-muted-foreground">
        Leave unassigned if this car is owned by the company. Assigned cars appear in the
        operator&apos;s fleet and their earnings are tracked separately.
      </p>
    </div>
  );
}
