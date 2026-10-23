"use client";

import { MessageSquareQuote } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { replyReviewAction } from "@/lib/actions/reviews";

/** The review fields the reply dialog needs (props stay serialisable). */
export type ReviewReplyTarget = {
  id: number;
  rating: number | null;
  review_title: string | null;
  review_text: string | null;
  admin_reply: string | null;
};

function starsFor(rating: number | null) {
  const value = Math.min(5, Math.max(0, Math.round(Number(rating ?? 0))));
  return "★".repeat(value) + "☆".repeat(5 - value);
}

function SaveReplyButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving changes..." : "Save Reply"}
    </Button>
  );
}

/**
 * Review details + admin reply modal — port of the reusable `#replyModal`
 * and the `reply_review.php` fetch handler in
 * `car-rental/pages/admin/review_list.php`.
 */
export function ReviewReplyDialog({ review }: { review: ReviewReplyTarget }) {
  const replied = Boolean(review.admin_reply && review.admin_reply.trim() !== "");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="px-3 py-2 text-[13px] font-semibold"
        >
          <MessageSquareQuote className="size-3.5" />
          {replied ? "Show & Edit Reply" : "Reply"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form action={replyReviewAction} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <MessageSquareQuote className="size-4 text-amber-500" />
              Review Details &amp; Response
            </DialogTitle>
          </DialogHeader>

          <input type="hidden" name="review_id" value={review.id} />

          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-base tracking-[0.15em] text-amber-500">
                {starsFor(review.rating)}
              </div>
              {replied ? (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  Replied
                </Badge>
              ) : null}
            </div>
            <div className="mb-1 text-sm font-bold text-foreground">
              {review.review_title ?? "—"}
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {review.review_text ?? "—"}
            </p>
          </div>

          {replied ? (
            <div className="rounded-lg border-l-4 border-[#ffcc00] bg-muted/60 px-3 py-2 text-sm text-foreground">
              <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Admin Reply
              </p>
              <p className="whitespace-pre-line">{review.admin_reply}</p>
            </div>
          ) : null}

          <div>
            <Label
              htmlFor={`reply-${review.id}`}
              className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
            >
              Your Reply
            </Label>
            <Textarea
              id={`reply-${review.id}`}
              name="admin_reply"
              rows={4}
              defaultValue={review.admin_reply ?? ""}
              placeholder="Type your reply to the customer here..."
              className="text-sm"
              required
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="font-semibold">
                Cancel
              </Button>
            </DialogClose>
            <SaveReplyButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
