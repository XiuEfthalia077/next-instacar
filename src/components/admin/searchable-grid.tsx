"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { FormAutoSubmit } from "@/components/admin/auto-submit";
import { EmptyState } from "@/components/common/empty-state";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/components/common/filter-bar";
import { cn } from "@/lib/utils";

/**
 * Filter card + client-side search + two-column card grid.
 *
 * Shared by the staff fee remittance page (branch cards) and the operator
 * remittance page (car cards), which used the same markup in the legacy app.
 */

export type SearchableGridItem = {
  key: string;
  /** Lower-cased haystack used by the search box. */
  search: string;
  node: React.ReactNode;
};

export function SearchableGrid({
  items,
  filterControls,
  resetHref,
  searchId,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  noMatchTitle,
  noMatchDescription,
}: {
  items: SearchableGridItem[];
  /** Extra filter fields rendered before the search box. */
  filterControls?: React.ReactNode;
  resetHref: string;
  searchId: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  noMatchTitle: string;
  noMatchDescription: string;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.search.includes(needle));
  }, [items, query]);

  return (
    <>
      <FilterBar>
        <FormAutoSubmit />
        {filterControls}

        <FilterField label="Search" className="min-w-[220px] flex-[2]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder={searchPlaceholder}
              className={cn(filterControlClass, "pl-9")}
            />
          </div>
        </FilterField>

        <div className="flex min-w-[120px] flex-1 items-end">
          <Link
            href={resetHref}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-4" />
            Reset
          </Link>
        </div>
      </FilterBar>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={Search}
            title={emptyTitle}
            description={emptyDescription}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={Search}
            title={noMatchTitle}
            description={noMatchDescription}
          />
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visible.map((item) => (
            <div key={item.key}>{item.node}</div>
          ))}
        </div>
      )}
    </>
  );
}
