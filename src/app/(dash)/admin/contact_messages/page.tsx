import { ArrowLeft, Inbox, Search } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { ContactMessagesTable } from "@/components/admin/contact-messages-table";
import { MarkContactMessagesRead } from "@/components/admin/mark-contact-messages-read";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { PillTabs } from "@/components/common/pill-tabs";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth";
import { listContactMessages } from "@/lib/data/misc";
import {
  MANILA_OFFSET_MS,
  formatDate,
  manilaNowTimestamp,
  manilaToday,
} from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

type ContactTimeFilter = "all" | "today" | "week";

/**
 * Admin inbox — port of `car-rental/pages/admin/contact_messages.php`.
 *
 * The legacy page marked every message as read on load (handled by
 * `<MarkContactMessagesRead />`), then rendered the newest-first inbox with a
 * search box, "All / Today / This Week" pills and a subject filter.
 *
 * The layout renders `DashboardShell`; this page only renders the content.
 */
export const instant = false;

export default async function AdminContactMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await requireRole("admin");

  const params = await searchParams;
  const flash = readFlash(params);

  const messages = await listContactMessages();

  const search = (searchParam(params, "q") ?? "").trim();
  const subject = searchParam(params, "subject") || "all";
  const timeParam = searchParam(params, "time");
  const time: ContactTimeFilter =
    timeParam === "today" || timeParam === "week" ? timeParam : "all";

  const subjects = Array.from(
    new Set(
      messages
        .map((message) => message.subject)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const unread = messages.filter((message) => !message.is_read).length;
  const needle = search.toLowerCase();
  const todayIso = manilaToday();
  // Legacy client filter: `new Date().setDate(getDate() - 7)` — a rolling
  // seven days measured from "now" (the offset is removed again so the value
  // stays comparable with `Date.parse(created_at)`).
  const weekCutoff =
    manilaNowTimestamp() - MANILA_OFFSET_MS - 7 * 24 * 60 * 60 * 1000;

  const rows = messages.filter((message) => {
    if (subject !== "all" && message.subject !== subject) return false;

    if (time !== "all") {
      if (!message.created_at) return false;

      const stamp = new Date(message.created_at).getTime();
      if (!Number.isFinite(stamp)) return false;

      if (time === "today") {
        if (formatDate(message.created_at, "iso") !== todayIso) return false;
      } else if (stamp < weekCutoff) {
        return false;
      }
    }

    if (needle) {
      const haystack = [
        message.name,
        message.email,
        message.subject,
        message.message,
      ]
        .map((value) => (value ?? "").toLowerCase())
        .join(" ");

      if (!haystack.includes(needle)) return false;
    }

    return true;
  });

  function buildHref(overrides: Record<string, string | undefined>) {
    const bag = new URLSearchParams();

    if (search) bag.set("q", search);

    if (subject !== "all") bag.set("subject", subject);

    if (time !== "all") bag.set("time", time);

    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === "all") bag.delete(key);
      else bag.set(key, value);
    }

    const query = bag.toString();
    return query ? `/admin/contact_messages?${query}` : "/admin/contact_messages";
  }

  const subjectHrefs = Object.fromEntries(
    subjects.map((item) => [item, buildHref({ subject: item })] as const),
  );

  return (
    <>
      <PageHeader
        title="Customer Inquiries"
        description="Manage and reply to inquiries sent through the contact form."
        actions={
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href="/admin/dashboard">
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Link>
          </Button>
        }
      />

      <Flash {...flash} />

      {/* Marks every unread inquiry as read, exactly like the legacy page load. */}
      <MarkContactMessagesRead />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Inquiries"
          value={messages.length}
          hint={unread > 0 ? `${unread} unread` : "All messages read"}
          icon={Inbox}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          className="w-fit"
          tabs={[
            { label: "All", href: buildHref({ time: "all" }), active: time === "all" },
            { label: "Today", href: buildHref({ time: "today" }), active: time === "today" },
            {
              label: "This Week",
              href: buildHref({ time: "week" }),
              active: time === "week",
            },
          ]}
        />
      </div>

      <FilterBar
        actions={
          <>
            <Button type="submit" size="sm">
              <Search className="size-4" />
              Search
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/contact_messages">Reset</Link>
            </Button>
          </>
        }
      >
        <input type="hidden" name="time" value={time} />

        <FilterField label="Search" className="min-w-[220px] flex-[2]">
          <Input
            name="q"
            defaultValue={search}
            placeholder="Search by name, email, or message..."
            className={filterControlClass}
          />
        </FilterField>

        <FilterField label="Subject" className="max-w-[260px]">
          <select name="subject" defaultValue={subject} className={filterControlClass}>
            <option value="all">All Subjects</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <SectionCard bodyClassName="p-0">
        <ContactMessagesTable messages={rows} subjectHrefs={subjectHrefs} />
      </SectionCard>
    </>
  );
}
