"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, Eye, Inbox, Mail, Reply, Trash } from "lucide-react";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteContactMessageAction } from "@/lib/actions/contact";
import { cn } from "@/lib/utils";

/** The subset of `contact_messages` the table needs (props stay serialisable). */
export type ContactMessageRow = {
  id: number;
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string | null;
};

function initials(name: string | null) {
  const value = (name ?? "").trim();
  return value ? value.slice(0, 1).toUpperCase() : "?";
}

/** Legacy `date('M d, Y • h:i A')` / `date('F d, Y • h:i A')`. */
function stamp(value: string | null, long = false) {
  if (!value) return "—";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  return date
    .toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      month: long ? "long" : "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/, (?=\d{1,2}:\d{2})/, " • ");
}

/**
 * Inquiries table with the legacy view / reply / delete actions.
 *
 * The filters live in the server page (GET form + pills), exactly like the
 * other ported listings; this component only handles the row dialogs.
 */
export function ContactMessagesTable({
  messages,
  subjectHrefs,
}: {
  messages: ContactMessageRow[];
  subjectHrefs: Record<string, string>;
}) {
  const [viewing, setViewing] = useState<ContactMessageRow | null>(null);
  const [deleting, setDeleting] = useState<ContactMessageRow | null>(null);

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No Inquiries Found"
        description="Messages submitted through the landing page form will appear here."
      />
    );
  }

  const columns: DataTableColumn<ContactMessageRow>[] = [
    {
      key: "id",
      header: "#",
      className: "w-[5%] align-top",
      cell: (row) => (
        <span className="font-semibold text-muted-foreground">#{row.id}</span>
      ),
    },
    {
      key: "sender",
      header: "Sender",
      className: "w-[25%]",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#ffcc00]/30 bg-[#ffcc00]/15 text-sm font-bold text-[#b38a00] dark:text-[#ffd700]">
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  "truncate text-foreground",
                  row.is_read ? "font-semibold" : "font-extrabold",
                )}
              >
                {row.name ?? "—"}
              </p>
              {!row.is_read ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ffcc00]/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#b38a00] dark:text-[#ffd700]">
                  <span className="size-1.5 rounded-full bg-[#ffcc00]" />
                  New
                </span>
              ) : null}
            </div>
            <a
              href={`mailto:${row.email ?? ""}`}
              className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{row.email ?? "—"}</span>
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      className: "w-[20%]",
      cell: (row) => (
        <div>
          <Link
            href={
              subjectHrefs[row.subject ?? ""] ?? "/admin/contact_messages"
            }
            className="inline-block max-w-full truncate rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-[#ffcc00]/40 hover:bg-[#ffcc00]/15 hover:text-[#b38a00]"
          >
            {row.subject ?? "—"}
          </Link>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {stamp(row.created_at)}
          </div>
        </div>
      ),
    },
    {
      key: "message",
      header: "Message",
      className: "w-[32%] whitespace-normal",
      cell: (row) => (
        <p className="line-clamp-2 max-w-[420px] text-sm text-muted-foreground">
          {row.message ?? "—"}
        </p>
      ),
    },
    {
      key: "action",
      header: "Action",
      className: "w-[18%] text-right",
      cell: (row) => (
        <div className="inline-flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            title="Read Message"
            onClick={() => setViewing(row)}
          >
            <Eye className="size-4" />
            <span className="sr-only">Read message</span>
          </Button>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-[#ffcc00]/40 bg-[#ffcc00]/10 font-semibold text-[#b38a00] hover:bg-[#ffcc00] hover:text-black dark:text-[#ffd700] dark:hover:text-black"
          >
            <a
              href={`mailto:${row.email ?? ""}?subject=${encodeURIComponent(
                `Re: ${row.subject ?? ""}`,
              )}`}
              title="Reply to Sender"
            >
              <Reply className="size-3.5" />
              Reply
            </a>
          </Button>

          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            title="Delete Inquiry"
            className="text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
            onClick={() => setDeleting(row)}
          >
            <Trash className="size-4" />
            <span className="sr-only">Delete inquiry</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        className="rounded-none border-0 shadow-none"
        columns={columns}
        rows={messages}
        keyExtractor={(row) => String(row.id)}
        emptyMessage="No inquiries match the current filters."
      />

      {/* Message Detail Modal — legacy `#viewModal` */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-lg">
          <DialogHeader className="border-b border-border/70 pb-3 pr-8">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Mail className="size-4 text-[#b38a00] dark:text-[#ffd700]" />
              Inquiry Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Sender
              </p>
              <p className="text-base font-bold text-foreground">
                {viewing?.name ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {viewing?.email ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Subject &amp; Received Date
              </p>
              <p className="font-medium text-foreground">
                {viewing?.subject ?? "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {viewing ? stamp(viewing.created_at, true) : "—"}
              </p>
            </div>

            <hr className="border-border" />

            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Message
              </p>
              <div className="whitespace-pre-wrap rounded-xl border border-border bg-muted/50 p-3 text-sm leading-relaxed text-foreground">
                {viewing?.message ?? "—"}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button asChild>
              <a
                href={`mailto:${viewing?.email ?? ""}?subject=${encodeURIComponent(
                  `Re: ${viewing?.subject ?? ""}`,
                )}`}
              >
                <Reply className="size-4" />
                Reply via Email
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — legacy SweetAlert `confirmDelete()` */}
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-md">
          <DialogHeader className="border-b border-border/70 pb-3 pr-8">
            <DialogTitle>Delete Inquiry?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the message from &quot;
              {deleting?.name ?? "this sender"}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>

            <form action={deleteContactMessageAction}>
              <input type="hidden" name="id" value={deleting?.id ?? ""} />
              <Button type="submit" variant="destructive">
                Yes, Delete
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
