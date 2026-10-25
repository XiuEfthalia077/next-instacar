"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_HOME } from "@/lib/constants";
import type { AppSession, Branch } from "@/lib/types";

/**
 * Client frame that owns the off-canvas sidebar state shared between the
 * sidebar itself and the top bar hamburger button.
 */
export function DashboardFrame({
  session,
  branches,
  children,
}: {
  session: AppSession;
  branches: Branch[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Multi-tab session conflict protection:
  // If another tab changed the active session role (e.g. logging in as User in Tab 2 while Tab 1 is on Admin),
  // immediately reload to the correct role home to prevent router freezing or deadlocks.
  useEffect(() => {
    const isMismatched =
      (session.role === "user" && (pathname.startsWith("/admin") || pathname.startsWith("/staff") || pathname.startsWith("/operator"))) ||
      (session.role !== "admin" && pathname.startsWith("/admin"));

    if (isMismatched) {
      window.location.replace(ROLE_HOME[session.role]);
    }
  }, [pathname, session.role]);

  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <aside className="fixed inset-y-0 left-0 z-[1090] hidden w-[220px] border-r border-[#333] bg-black p-[20px_14px] md:block xl:w-[260px]" />
        }
      >
        <Sidebar
          role={session.role}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </Suspense>

      <div className="md:pl-[220px] xl:pl-[260px]">
        <Topbar
          session={session}
          branches={branches}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />

        <main className="px-3.5 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
