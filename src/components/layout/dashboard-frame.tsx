"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RealtimeListener } from "@/components/common/realtime-listener";
import { ROLE_HOME } from "@/lib/constants";
import { cn } from "@/lib/utils";
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
  const [tabletCollapsed, setTabletCollapsed] = useState(false);
  const pathname = usePathname();

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen((open) => !open);
    } else {
      setTabletCollapsed((collapsed) => !collapsed);
    }
  };

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
      <RealtimeListener />
      <Suspense
        fallback={
          <aside className="fixed inset-y-0 left-0 z-[1090] hidden w-[200px] border-r border-[#333] bg-black p-[20px_14px] md:block lg:w-[240px] xl:w-[260px]" />
        }
      >
        <Sidebar
          role={session.role}
          branches={branches}
          viewBranch={session.viewBranch}
          open={sidebarOpen}
          tabletCollapsed={tabletCollapsed}
          onClose={() => setSidebarOpen(false)}
        />
      </Suspense>

      <div
        className={cn(
          "min-w-0 max-w-full transition-all duration-300",
          // Tablet width (collapsible or takes 200px)
          tabletCollapsed ? "md:pl-0" : "md:pl-[200px]",
          // Laptop/Desktop width (always visible and takes 240px - 260px)
          "lg:pl-[240px] xl:pl-[260px]",
        )}
      >
        <Topbar
          session={session}
          branches={branches}
          onToggleSidebar={handleToggleSidebar}
        />

        <main className="min-w-0 max-w-full overflow-x-hidden px-3.5 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
