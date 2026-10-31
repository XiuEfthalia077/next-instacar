"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Globe2, LogOut, Menu, MoonStar, Store, Sun, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction, switchBranchAction } from "@/lib/actions/auth";
import { PANEL_TITLE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AppSession, Branch } from "@/lib/types";

const THEME_STORAGE_KEY = "instacar-admin-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);

    document.documentElement.classList.toggle("dark", next);
    document.body.classList.toggle("dark-mode", next);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle dark mode"
      aria-label="Toggle dark mode"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-black bg-white text-black transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:border-[#facc15] dark:bg-[#18181b] dark:text-[#facc15] dark:hover:border-white dark:hover:shadow-[0_0_12px_rgba(255,255,255,0.35)] cursor-pointer"
    >
      {dark ? (
        <Sun className="size-4" />
      ) : (
        <MoonStar className="size-4" />
      )}
    </button>
  );
}

export function Topbar({
  session,
  branches,
  onToggleSidebar,
}: {
  session: AppSession;
  branches: Branch[];
  onToggleSidebar?: () => void;
}) {
  const firstLetter = (session.name || "G").charAt(0).toUpperCase();
  const logoutFormRef = useRef<HTMLFormElement>(null);

  const currentBranchName =
    session.viewBranch === "all"
      ? "All Branches"
      : branches.find((b) => String(b.id) === String(session.viewBranch))?.name ?? "Selected Branch";

  return (
    <nav className="sticky top-0 z-30 border-b border-[#e2e8f0] bg-white transition-colors dark:border-[#27272a] dark:bg-[#141414]">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD700] p-2 text-black lg:hidden active:scale-95 transition-transform cursor-pointer shadow-xs"
          >
            <Menu className="size-5 stroke-[2.5]" />
          </button>

          <div className="min-w-0 flex-1 overflow-hidden pr-1">
            <div className="truncate text-xs font-black uppercase tracking-[0.5px] text-black sm:text-base dark:text-white leading-tight">
              {PANEL_TITLE.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="text-[#FFD700]">
                {PANEL_TITLE.split(" ").slice(-1).join(" ")}
              </span>
            </div>
            <div className="truncate text-[9px] sm:text-[10px] font-extrabold tracking-[1px] text-[#6c757d] dark:text-[#a1a1aa] leading-tight">
              {session.role.toUpperCase()} ACCESS
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {session.role === "admin" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden sm:inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-[1.5px] border-[#ffcc00] bg-[#fffbe6] px-3 py-2 text-xs font-bold text-[#8a6a00] min-h-[44px] transition-all hover:bg-[#fff3b0] dark:bg-[#1a1600] dark:text-[#ffcc00] dark:border-[rgba(255,204,0,0.4)] dark:hover:bg-[#262100] dark:hover:border-[#ffcc00]"
                  title="Switch Branch"
                >
                  <Store className="size-4 shrink-0" />
                  <span className="max-w-[110px] truncate sm:max-w-[140px] md:max-w-[180px]">
                    {currentBranchName}
                  </span>
                  <ChevronDown className="size-3.5 opacity-70 shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border border-border bg-popover text-popover-foreground p-1.5 shadow-2xl z-[200]"
              >
                <form action={switchBranchAction}>
                  <button
                    type="submit"
                    name="branch"
                    value="all"
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold transition-colors min-h-[44px]",
                      session.viewBranch === "all"
                        ? "bg-[#ffcc00] text-black shadow-xs font-extrabold"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Globe2 className="size-4" />
                      All Branches
                    </span>
                    {session.viewBranch === "all" && <Check className="size-4" />}
                  </button>

                  {branches.map((b) => {
                    const isSelected = String(session.viewBranch) === String(b.id);
                    return (
                      <button
                        key={b.id}
                        type="submit"
                        name="branch"
                        value={String(b.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold transition-colors mt-0.5 min-h-[44px]",
                          isSelected
                            ? "bg-[#ffcc00] text-black shadow-xs font-extrabold"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Store className="size-4 shrink-0 text-[#ffcc00]" />
                          <span className="truncate">{b.name}</span>
                        </span>
                        {isSelected && <Check className="size-4 shrink-0" />}
                      </button>
                    );
                  })}
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-11 sm:w-auto items-center justify-center sm:gap-2.5 rounded-xl border-[1.5px] border-black bg-white sm:px-3 sm:py-1.5 text-black transition-all hover:-translate-y-px hover:bg-[#f8fafc] hover:shadow-[0_4px_15px_rgba(0,0,0,0.12)] dark:border-[#facc15] dark:bg-[#18181b] dark:text-white dark:hover:bg-[#27272a] dark:hover:border-white dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.35)] cursor-pointer"
              >
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-[#FFD700] text-sm font-extrabold text-black">
                  {firstLetter}
                </span>
                <span className="hidden text-start md:block">
                  <span className="block text-xs font-bold leading-none">
                    {session.name}
                  </span>
                  <span className="block text-[10px] font-extrabold text-[#ccac00]">
                    ACTIVE
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="min-w-[200px] rounded-xl bg-white p-1.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] dark:bg-[#18181b] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)]"
            >
              <div className="px-3 py-2 border-b border-border/60 mb-1">
                <p className="text-xs font-bold text-foreground truncate">{session.name || "User"}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">{session.role} portal</p>
              </div>

              {/* Mobile Admin Branch Switcher in Menu */}
              {session.role === "admin" && (
                <div className="sm:hidden px-2 py-1.5 mb-1.5 bg-muted/40 rounded-lg">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground mb-1 uppercase tracking-wider">
                    <Store className="size-3 text-[#ffcc00]" />
                    <span>Active Branch</span>
                  </div>
                  <form action={switchBranchAction}>
                    <select
                      name="branch"
                      defaultValue={session.viewBranch === "all" ? "all" : String(session.viewBranch)}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="w-full text-xs font-bold rounded-md bg-background border border-border p-1.5 text-foreground cursor-pointer outline-none"
                    >
                      <option value="all">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </form>
                </div>
              )}

              <DropdownMenuItem asChild>
                <Link
                  href={session.role === "user" ? "/user/profile" : "/shared/profile"}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-[#FFD700] hover:text-black dark:text-[#f4f4f5] dark:hover:bg-[#facc15] dark:hover:text-black min-h-[44px]"
                >
                  <UserRound className="size-4" />
                  My Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[#e2e8f0] dark:bg-[#27272a]" />

              <form ref={logoutFormRef} action={signOutAction} className="hidden" />

              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  logoutFormRef.current?.requestSubmit();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-red-600 transition-all hover:bg-red-500 hover:text-white dark:text-red-400 min-h-[44px]"
              >
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

/**
 * The admin branch switcher rendered as a plain list (mobile friendly).
 */
export function BranchSwitcherList({ branches }: { branches: Branch[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {branches.map((branch) => (
        <span
          key={branch.id}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-[#ffcc00]/40 bg-[#fffbe6] px-2.5 py-1 text-xs font-semibold text-[#8a6a00] dark:bg-[#1a1600] dark:text-[#ffcc00]",
          )}
        >
          <Store className="size-3.5" />
          {branch.name}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#ffcc00]/40 bg-[#fffbe6] px-2.5 py-1 text-xs font-semibold text-[#8a6a00] dark:bg-[#1a1600] dark:text-[#ffcc00]">
        <Globe2 className="size-3.5" />
        All Branches
      </span>
    </div>
  );
}
