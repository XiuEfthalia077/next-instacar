import {
  Activity,
  BadgeCheck,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock,
  Flag,
  Inbox,
  Pencil,
  Plus,
  Users,
  Zap,
} from "lucide-react";

import { StaffRoster, type StaffRosterRow } from "@/components/admin/staff-roster";
import { AddUserDialog } from "@/components/admin/user-dialogs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/shared/StatCard";
import { getSupabase, requireRole } from "@/lib/auth";
import { connection } from "next/server";
import { formatDate } from "@/lib/datetime";
import { listBranches } from "@/lib/data/cars";
import {
  branchFilter,
  endOfMonth,
  fetchRows,
  startOfMonth,
  today,
} from "@/lib/data/scope";
import { listStaff } from "@/lib/data/users";
import { readFlash } from "@/lib/flash";
import { cn } from "@/lib/utils";

type StaffBookingStat = {
  id: number;
  created_by: number | null;
  last_action_by: number | null;
  last_action_at: string | null;
  last_action_type: string | null;
  created_at: string | null;
  start_date: string | null;
};

type ActivityRow = {
  id: number;
  status: string;
  last_action_type: string | null;
  last_action_at: string | null;
  guest_name: string | null;
  actor: { id: number; name: string | null; role: string } | null;
  customer: { name: string | null } | null;
  cars: {
    brand: string | null;
    model: string | null;
    plate_number: string | null;
  } | null;
};

function mondayOfWeek(date: string): string {
  const stamp = new Date(`${date}T00:00:00Z`);
  const offset = (stamp.getUTCDay() + 6) % 7;
  stamp.setUTCDate(stamp.getUTCDate() - offset);
  return stamp.toISOString().slice(0, 10);
}

function relativeTime(value: string | null): string {
  if (!value) return "Never";

  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "Never";

  const diff = Math.floor((Date.now() - stamp) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return new Date(stamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`;
  return initials.toUpperCase() || "?";
}

function staffStatus(lastTs: number): {
  status: StaffRosterRow["status"];
  statusLabel: string;
} {
  if (!lastTs) return { status: "idle", statusLabel: "No activity" };

  const daysSince = (Date.now() - lastTs) / 86_400_000;

  if (daysSince <= 7) return { status: "active", statusLabel: "Active" };
  if (daysSince <= 30) return { status: "idle", statusLabel: "Idle" };
  return { status: "inactive", statusLabel: "Inactive" };
}

const ACTION_ICON = {
  Confirmed: {
    icon: CircleCheck,
    className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
  Completed: {
    icon: Flag,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  Cancelled: {
    icon: CircleX,
    className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
  Edited: {
    icon: Pencil,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
} as const;

function actionStyle(type: string | null) {
  return (
    ACTION_ICON[type as keyof typeof ACTION_ICON] ?? {
      icon: Clock,
      className: "bg-muted text-muted-foreground",
    }
  );
}

export const instant = false;

export default async function AdminStaffConsolePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const branch = branchFilter(session);
  const day = today();
  const monthStart = startOfMonth(day);
  const monthEnd = endOfMonth(day);
  const weekStart = mondayOfWeek(day);

  // Fetch branches and staff
  const [branches, staff] = await Promise.all([
    listBranches(),
    listStaff(session),
  ]);
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  // Booking aggregates
  const supabase = await getSupabase();

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id, created_by, last_action_by, last_action_at, last_action_type, created_at, start_date",
    );

  if (branch !== null) {
    bookingsQuery = bookingsQuery.eq("branch_id", branch);
  }

  const bookings = await fetchRows<StaffBookingStat>(bookingsQuery);

  const createdTotals = new Map<number, number>();
  const createdMonths = new Map<number, number>();
  const actionTotals = new Map<number, number>();
  const actionMonths = new Map<number, number>();
  const createdLast = new Map<number, string>();
  const actionLast = new Map<number, { at: string; type: string | null }>();

  const bump = (map: Map<number, number>, id: number) => {
    map.set(id, (map.get(id) ?? 0) + 1);
  };

  for (const booking of bookings) {
    if (booking.created_by !== null) {
      const id = booking.created_by;
      bump(createdTotals, id);

      const bookingDay = booking.start_date?.slice(0, 10);
      if (bookingDay && bookingDay >= monthStart && bookingDay <= monthEnd) {
        bump(createdMonths, id);
      }

      if (booking.created_at) {
        const previous = createdLast.get(id);
        if (
          !previous ||
          new Date(booking.created_at).getTime() > new Date(previous).getTime()
        ) {
          createdLast.set(id, booking.created_at);
        }
      }
    }

    if (booking.last_action_by !== null && booking.last_action_at) {
      const id = booking.last_action_by;
      bump(actionTotals, id);

      const actionDay = formatDate(booking.last_action_at, "iso");
      if (actionDay >= monthStart && actionDay <= monthEnd) {
        bump(actionMonths, id);
      }

      const previous = actionLast.get(id);
      if (
        !previous ||
        new Date(booking.last_action_at).getTime() > new Date(previous.at).getTime()
      ) {
        actionLast.set(id, {
          at: booking.last_action_at,
          type: booking.last_action_type,
        });
      }
    }
  }

  const staffRows: StaffRosterRow[] = staff.map((member) => {
    const createdTotal = createdTotals.get(member.id) ?? 0;
    const createdMonth = createdMonths.get(member.id) ?? 0;
    const actionTotal = actionTotals.get(member.id) ?? 0;
    const actionMonth = actionMonths.get(member.id) ?? 0;

    const createdStamp = createdLast.get(member.id) ?? null;
    const actionStamp = actionLast.get(member.id)?.at ?? null;

    let lastActivity: string | null = null;
    if (createdStamp && actionStamp) {
      lastActivity =
        new Date(actionStamp).getTime() >= new Date(createdStamp).getTime()
          ? actionStamp
          : createdStamp;
    } else {
      lastActivity = actionStamp ?? createdStamp;
    }

    const lastTs = lastActivity ? new Date(lastActivity).getTime() : 0;
    const { status, statusLabel } = staffStatus(lastTs);

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      initials: initialsOf(member.name),
      branchId: member.branch_id,
      branchName: member.branch_id ? branchMap.get(member.branch_id) : null,
      status,
      statusLabel,
      totalCreated: createdTotal,
      monthCreated: createdMonth,
      totalActions: actionTotal,
      monthActions: actionMonth,
      lastActivityTs: lastTs,
      lastActivityLabel: relativeTime(lastActivity),
    };
  });

  // Summary stats
  const totalStaff = staffRows.length;
  const totalCreatedAll = staffRows.reduce((sum, row) => sum + row.totalCreated, 0);
  const totalActionsAll = staffRows.reduce((sum, row) => sum + row.totalActions, 0);
  const activeThisWeek = staffRows.filter((row) => {
    const last = row.lastActivityTs
      ? formatDate(new Date(row.lastActivityTs).toISOString(), "iso")
      : null;
    return Boolean(last && last >= weekStart);
  }).length;

  // Recent activity feed
  const staffIds = staff.map((member) => member.id);
  let feed: ActivityRow[] = [];

  if (staffIds.length > 0) {
    let feedQuery = supabase
      .from("bookings")
      .select(
        `
        id, status, last_action_type, last_action_at, guest_name,
        actor:users!bookings_last_action_by_fkey ( id, name, role ),
        customer:users!bookings_user_id_fkey ( name ),
        cars!bookings_car_id_fkey ( brand, model, plate_number )
      `,
      )
      .in("last_action_by", staffIds)
      .not("last_action_at", "is", null)
      .order("last_action_at", { ascending: false })
      .limit(30);

    if (branch !== null) {
      feedQuery = feedQuery.eq("branch_id", branch);
    }

    feed = await fetchRows<ActivityRow>(feedQuery);
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Staff Console
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage dispatch accounts, monitor team roster KPIs, and review real-time booking actions.
          </p>
        </div>
        <div>
          <AddUserDialog role="staff" branches={branches} />
        </div>
      </div>

      <Flash {...flash} />

      {/* Unified StatCards */}
      <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 w-full">
        <StatCard
          title="TOTAL STAFF"
          value={totalStaff}
          subtitle="Registered staff dispatchers"
          icon={Users}
          tone="default"
        />
        <StatCard
          title="ACTIVE THIS WEEK"
          value={activeThisWeek}
          subtitle="Staff active in the last 7 days"
          icon={Activity}
          tone="success"
        />
        <StatCard
          title="BOOKINGS CREATED"
          value={totalCreatedAll}
          subtitle="All-time walk-ins dispatched"
          icon={ClipboardList}
          tone="cyan"
        />
        <StatCard
          title="ACTIONS PERFORMED"
          value={totalActionsAll}
          subtitle="Releases, returns & updates"
          icon={Zap}
          tone="cyan"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Left: staff roster */}
        <div className="xl:col-span-7">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <BadgeCheck className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
              Staff Roster & Account Directory
            </h2>
            <Badge
              variant="outline"
              className="rounded-full border-transparent bg-[#ffcc00]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#b38a00] dark:text-[#ffcc00]"
            >
              {totalStaff} member{totalStaff === 1 ? "" : "s"}
            </Badge>
          </div>

          {staffRows.length === 0 ? (
            <SectionCard>
              <EmptyState
                icon={Users}
                title="No staff accounts yet"
                description="Click '+ Add Staff' above to create your first dispatch account."
              />
            </SectionCard>
          ) : (
            <StaffRoster rows={staffRows} branches={branches} />
          )}
        </div>

        {/* Right: activity feed */}
        <div className="xl:col-span-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Activity className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
              Live Dispatch Activity
            </h2>
            <Badge
              variant="outline"
              className="rounded-full border-transparent bg-[#ffcc00]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#b38a00] dark:text-[#ffcc00]"
            >
              Last {feed.length} Actions
            </Badge>
          </div>

          <SectionCard bodyClassName="divide-y divide-border max-h-[720px] overflow-y-auto">
            {feed.length === 0 ? (
              <EmptyState icon={Inbox} title="No staff activity recorded yet." />
            ) : (
              feed.map((activity) => {
                const actionType = activity.last_action_type ?? "Edited";
                const style = actionStyle(actionType);
                const Icon = style.icon;

                const actorName = activity.actor?.name ?? "Unknown";
                const customerName =
                  activity.customer?.name ?? activity.guest_name ?? "Unknown";
                const carName =
                  [activity.cars?.brand, activity.cars?.model]
                    .filter(Boolean)
                    .join(" ") || "Vehicle";
                const plate = activity.cars?.plate_number ?? "—";

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        style.className,
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>

                    <div className="min-w-0 flex-1 text-sm leading-snug text-foreground">
                      <p className="truncate">
                        <strong className="font-bold">{actorName}</strong>{" "}
                        {actionType.toLowerCase()}{" "}
                        <strong className="font-bold">
                          #BK-{activity.id}
                        </strong>{" "}
                        <span className="text-muted-foreground">
                          — {customerName}
                        </span>
                      </p>
                      <p className="mt-1 truncate text-[0.72rem] text-muted-foreground">
                        {carName} • {plate}
                      </p>
                    </div>

                    <div className="shrink-0 whitespace-nowrap text-[0.72rem] text-muted-foreground">
                      {relativeTime(activity.last_action_at)}
                    </div>
                  </div>
                );
              })
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
