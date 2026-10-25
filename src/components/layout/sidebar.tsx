"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";

import { SIDEBAR_NAV, isNavParent } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

const STORAGE_KEY = "sidebar-open-groups";

function isHrefActive(
  pathname: string,
  searchParams: URLSearchParams,
  href: string,
) {
  const [path, query] = href.split("?");
  if (path !== pathname) return false;
  if (!query) return true;
  const [key, value] = query.split("=");
  return searchParams.get(key) === value;
}

function getActiveGroupLabels(
  groups: (typeof SIDEBAR_NAV)[UserRole],
  pathname: string,
  searchParams: URLSearchParams,
): string[] {
  const active: string[] = [];
  groups.forEach((group) => {
    group.items.forEach((entry) => {
      if (!isNavParent(entry)) return;
      const child = entry.children.find((c) =>
        isHrefActive(pathname, searchParams, c.href),
      );
      if (child && !active.includes(entry.label)) {
        active.push(entry.label);
      }
    });
  });
  return active;
}

export function Sidebar({
  role,
  open: mobileOpen = false,
  onClose,
}: {
  role: UserRole;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groups = SIDEBAR_NAV[role];

  // Initialize with groups whose children match the current URL.
  // Because pathname and searchParams are identical on server and client,
  // this matches SSR without causing hydration mismatches.
  const [open, setOpen] = useState<string[]>(() =>
    getActiveGroupLabels(groups, pathname, searchParams),
  );

  const setMobileOpen = useCallback((value: boolean) => {
    if (!value) onClose?.();
  }, [onClose]);

  // Restore additional open collapse groups from sessionStorage after hydration.
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(stored) && stored.length > 0) {
        setOpen((prev) => Array.from(new Set([...prev, ...stored])));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(open));
    } catch {
      /* ignore */
    }
  }, [open]);

  // Auto expand the group that owns the active child when navigating.
  useEffect(() => {
    const active = getActiveGroupLabels(groups, pathname, searchParams);
    if (active.length > 0) {
      setOpen((prev) => Array.from(new Set([...prev, ...active])));
    }
  }, [groups, pathname, searchParams]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const toggle = (label: string) =>
    setOpen((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );

  const renderChild = (child: { label: string; href: string; icon: typeof ChevronRight }) => {
    const active = isHrefActive(pathname, searchParams, child.href);
    const Icon = child.icon;
    return (
      <li key={child.href}>
        <Link
          href={child.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
            active
              ? "font-bold text-[#FFD700]"
              : "text-[#BBBBBB] hover:text-[#FFD700]",
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          {child.label}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        id="sidebarOverlay"
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-[1080] bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-[1090] flex w-[280px] -translate-x-full flex-col overflow-y-auto border-r border-[#333] bg-black p-[20px_14px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:w-[220px] md:translate-x-0 xl:w-[260px]",
          mobileOpen && "translate-x-0",
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="absolute right-4 top-4 text-white md:hidden"
        >
          <X className="size-6" />
        </button>

        <div className="mb-4 px-2">
          <div className="text-[24px] font-extrabold leading-none tracking-[-0.5px] text-white">
            InstaCar
            <span className="text-[#FFD700]">.</span>
          </div>
          <small
            className="mt-1 block text-[10px] font-extrabold uppercase tracking-wide text-[#FFD700]"
          >
            {role} Portal
          </small>
        </div>

        <nav className="flex-1">
          {groups.map((group) => (
            <div key={group.section ?? group.items[0]?.label}>
              {group.section ? (
                <div className="mb-2.5 mt-6 px-2.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#666]">
                  {group.section}
                </div>
              ) : null}

              <ul className="flex list-none flex-col px-0">
                {group.items.map((entry) => {
                  if (!isNavParent(entry)) {
                    const active = isHrefActive(
                      pathname,
                      searchParams,
                      entry.href,
                    );
                    const Icon = entry.icon;
                    return (
                      <li key={entry.href}>
                        <Link
                          href={entry.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "relative mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors",
                            active
                              ? "bg-[#FFD700] font-bold text-black shadow-[0_4px_15px_rgba(255,215,0,0.3)] before:absolute before:-left-3.5 before:top-1/2 before:h-[70%] before:w-1 before:-translate-y-1/2 before:rounded-[10px] before:bg-[#FFD700]"
                              : "text-[#EEEEEE] hover:bg-[#1A1A1A] hover:text-[#FFD700]",
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          {entry.label}
                        </Link>
                      </li>
                    );
                  }

                  const isOpen = open.includes(entry.label);
                  const hasActiveChild = entry.children.some((child) =>
                    isHrefActive(pathname, searchParams, child.href),
                  );
                  const Icon = entry.icon;

                  return (
                    <li key={entry.label}>
                      <button
                        type="button"
                        onClick={() => toggle(entry.label)}
                        aria-expanded={isOpen}
                        className={cn(
                          "relative mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors",
                          hasActiveChild
                            ? "bg-[#1A1A1A] font-bold text-[#FFD700] before:absolute before:-left-3.5 before:top-1/2 before:h-[70%] before:w-1 before:-translate-y-1/2 before:rounded-[10px] before:bg-[#FFD700]"
                            : "text-[#EEEEEE] hover:bg-[#1A1A1A] hover:text-[#FFD700]",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {entry.label}
                        <ChevronRight
                          className={cn(
                            "ml-auto size-3.5 transition-transform duration-200 ease-in-out",
                            isOpen && "rotate-90",
                            hasActiveChild && "text-[#FFD700]",
                          )}
                        />
                      </button>

                      <div
                        className={cn(
                          "grid transition-all duration-200 ease-in-out overflow-hidden",
                          isOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0 pointer-events-none",
                        )}
                      >
                        <div className="overflow-hidden">
                          <ul className="list-none pb-2.5 pl-5 pt-1.5 space-y-0.5">
                            {entry.children.map((child) => renderChild(child))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
