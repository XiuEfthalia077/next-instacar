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
  Users,
  Zap,
} from "lucide-react";

import { StaffRoster, type StaffRosterRow } from "@/components/admin/staff-roster";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { getSupabase, requireRole } from "@/lib/auth";
import { connection } from "next/server";
import { formatDate } from "@/lib/datetime";
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

/** A booking row with just the fields the staff aggregates need. */
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

/** Monday of the week of `date` (`YYYY-MM-DD`). */
function mondayOfWeek(date: string): string {
  const stamp = new Date(`${date}T00:00:00Z`);
  const offset = (stamp.getUTCDay() + 6) % 7;
  stamp.setUTCDate(stamp.getUTCDate() - offset);
  return stamp.toISOString().slice(0, 10);
}

/** Legacy `formatRelativeTime()`. */
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

/** Legacy roster status thresholds (7 days active, 30 days idle). */
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
    className:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
  Completed: {
    icon: Flag,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  Cancelled: {
    icon: CircleX,
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
  Edited: {
    icon: Pencil,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
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

/**
 * Staff Manager — port of `car-rental/pages/admin/staff_manager.php`.
 *
 * The roster numbers come from the bookings table (`created_by`,
 * `last_action_by`, `last_action_at`) exactly like the legacy GROUP BY
 * queries; the roster itself keeps the legacy client-side search, status
 * pills and sorting.
 */
export const instant = false;

export default async function StaffManagerPage({
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

  const staff = await listStaff(session);

  // Booking aggregates (legacy `createdCounts` / `actionCounts` /
  // `lastActivityTs` / `lastActionType` queries).
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

  // Summary stats.
  const totalStaff = staffRows.length;
  const totalCreatedAll = staffRows.reduce(
    (sum, row) => sum + row.totalCreated,
    0,
  );
  const totalActionsAll = staffRows.reduce(
    (sum, row) => sum + row.totalActions,
    0,
  );
  const activeThisWeek = staffRows.filter((row) => {
    const last = row.lastActivityTs
      ? formatDate(new Date(row.lastActivityTs).toISOString(), "iso")
      : null;
    return Boolean(last && last >= weekStart);
  }).length;

  // Recent activity feed (legacy LIMIT 30, staff actions only).
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
      <PageHeader
        title="Staff Manager"
        description="Monitor performance, bookings, and activity across your team."
      />

      <Flash {...flash} />

      {/* Summary stats */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Staff" value={totalStaff} icon={Users} />
        <StatCard
          label="Active This Week"
          value={activeThisWeek}
          icon={Activity}
        />
        <StatCard
          label="Bookings Created"
          value={totalCreatedAll}
          icon={ClipboardList}
        />
        <StatCard
          label="Actions Performed"
          value={totalActionsAll}
          icon={Zap}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Left: staff roster */}
        <div className="xl:col-span-7">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <BadgeCheck className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
              Team Roster
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
                description="Create staff accounts from the Users page."
              />
            </SectionCard>
          ) : (
            <StaffRoster rows={staffRows} />
          )}
        </div>

        {/* Right: activity feed */}
        <div className="xl:col-span-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Activity className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
              Recent Activity
            </h2>
            <Badge
              variant="outline"
              className="rounded-full border-transparent bg-[#ffcc00]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#b38a00] dark:text-[#ffcc00]"
            >
              Last {feed.length}
            </Badge>
          </div>

          <SectionCard bodyClassName="divide-y divide-border">
            {feed.length === 0 ? (
              <EmptyState icon={Inbox} title="No staff activity yet." />
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
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#ffcc00]/8"
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
