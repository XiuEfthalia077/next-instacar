"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarContextValue {
  isPending: boolean;
  resetForm: (targetHref?: string) => void;
}

const FilterBarContext = React.createContext<FilterBarContextValue>({
  isPending: false,
  resetForm: () => {},
});

export function useFilterBar() {
  return React.useContext(FilterBarContext);
}

/**
 * Responsive filter card above listings.
 * Intercepts form submissions to perform soft client transitions via React.startTransition
 * and Next.js router.replace({ scroll: false }), completely eliminating full-page reloads,
 * screen flashes, and unneeded loading screens.
 */
export function FilterBar({
  children,
  actions,
  className,
  action,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  action?: string;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const submitWithForm = React.useCallback(
    (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const params = new URLSearchParams();

      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          const trimmed = value.trim();
          // Skip empty values to keep URL clean
          if (trimmed !== "") {
            params.append(key, trimmed);
          }
        }
      }

      // Reset page to 1 when applying new filters
      params.delete("page");

      const qs = params.toString();
      const basePath = action || pathname;
      const targetUrl = qs ? `${basePath}?${qs}` : basePath;

      startTransition(() => {
        router.replace(targetUrl, { scroll: false });
      });
    },
    [action, pathname, router],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitWithForm(e.currentTarget);
  };

  const resetForm = React.useCallback(
    (targetHref?: string) => {
      if (formRef.current) {
        formRef.current.reset();
        const inputs = formRef.current.querySelectorAll<HTMLInputElement>(
          'input[type="text"], input[type="search"], input[type="date"]',
        );
        inputs.forEach((input) => {
          input.value = "";
        });
        const selects = formRef.current.querySelectorAll<HTMLSelectElement>("select");
        selects.forEach((select) => {
          select.selectedIndex = 0;
        });
      }

      const destination = targetHref || action || pathname;
      startTransition(() => {
        router.replace(destination, { scroll: false });
        router.refresh();
      });
    },
    [action, pathname, router],
  );

  // If search input is cleared via browser native (x) button, auto-refresh to show all items
  const handleSearchClear = (e: React.SyntheticEvent<HTMLFormElement>) => {
    const target = e.target as HTMLInputElement;
    if (
      (target?.type === "search" || target?.name === "search" || target?.name === "q") &&
      target.value === "" &&
      (searchParams?.has("search") || searchParams?.has("q"))
    ) {
      if (formRef.current) {
        submitWithForm(formRef.current);
      }
    }
  };

  return (
    <FilterBarContext.Provider value={{ isPending, resetForm }}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onInput={handleSearchClear}
        data-no-loader="true"
        method="get"
        className={cn(
          "relative mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm md:p-4 transition-opacity",
          isPending && "opacity-90",
          className,
        )}
      >
        {/* Subtle active transition bar */}
        {isPending && (
          <div className="absolute top-0 left-0 right-0 h-[2.5px] overflow-hidden rounded-t-2xl z-10">
            <div className="h-full w-full bg-gradient-to-r from-[#e6b800] via-[#ffd700] to-[#ffcc00] animate-pulse" />
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          {children}
          {actions ? (
            <div className="flex items-end gap-2">{actions}</div>
          ) : null}
        </div>
      </form>
    </FilterBarContext.Provider>
  );
}

/** A labelled filter control inside {@link FilterBar}. */
export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-[140px] flex-1", className)}>
      <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Modern Filter submit button with built-in transition spinner */
export function FilterSubmitButton({
  children = "Filter",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { isPending } = useFilterBar();

  return (
    <button
      type="submit"
      disabled={isPending}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-[#ffcc00] px-4 text-sm font-bold text-black transition-colors hover:bg-[#e6b800] disabled:opacity-75 cursor-pointer",
        className,
      )}
    >
      {isPending ? <Loader2 className="size-4 animate-spin text-black" /> : null}
      <span>{children}</span>
    </button>
  );
}

/** Filter reset button that resets form inputs and softly replaces URL */
export function FilterResetButton({
  href,
  children = "Reset",
  className,
}: {
  href: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { resetForm } = useFilterBar();

  return (
    <button
      type="button"
      data-no-loader="true"
      onClick={() => resetForm(href)}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[10px] border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted cursor-pointer",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Shared look for the `select` elements inside a {@link FilterBar}. */
export const filterControlClass =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50 dark:bg-[#121417] dark:text-foreground";
