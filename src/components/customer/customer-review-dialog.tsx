"use client";

import { useState } from "react";
import { Star, Sparkles, MessageSquareHeart } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveReviewAction } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

const RATING_LABELS: Record<number, string> = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent",
};

interface CustomerReviewDialogProps {
  booking: {
    id: number;
    cars?: {
      brand: string | null;
      model: string | null;
    } | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerReviewDialog({
  booking,
  open,
  onOpenChange,
}: CustomerReviewDialogProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  if (!booking) return null;

  const carName =
    [booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") ||
    "Vehicle";

  const activeStars = hoverRating ?? rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-[#0d0f12] text-foreground sm:rounded-2xl p-6 sm:p-7">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffcc00]">
            <Sparkles className="size-3.5" />
            <span>Rate Experience</span>
          </div>
          <DialogTitle className="mt-1 text-lg font-black text-foreground">
            Review Your Rental
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Booking #{booking.id} — {carName}
          </DialogDescription>
        </DialogHeader>

        <form action={saveReviewAction} className="space-y-4 pt-2">
          <input type="hidden" name="booking_id" value={booking.id} />
          <input type="hidden" name="rating" value={rating} />
          <input type="hidden" name="return_url" value="/user/mybookings" />

          {/* Star Rating Selector */}
          <div className="space-y-1.5 rounded-xl border border-border/80 bg-card p-4 text-center">
            <Label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Your Rating
            </Label>
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="rounded-md p-1 transition-transform hover:scale-125 focus:outline-none"
                  aria-label={`${star} Stars`}
                >
                  <Star
                    className={cn(
                      "size-7 transition-colors",
                      star <= activeStars
                        ? "fill-[#ffcc00] text-[#ffcc00] drop-shadow-[0_0_8px_rgba(255,204,0,0.4)]"
                        : "fill-muted text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-[#ffcc00]">
              {RATING_LABELS[activeStars] || `${activeStars} Stars`}
            </p>
          </div>

          {/* Review Title */}
          <div className="space-y-1.5">
            <Label htmlFor="review_title" className="text-xs font-bold text-foreground">
              Review Headline <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="review_title"
              name="review_title"
              placeholder="e.g. Smooth drive & great condition!"
              required
              className="rounded-xl border-border bg-card text-xs font-medium"
            />
          </div>

          {/* Review Details */}
          <div className="space-y-1.5">
            <Label htmlFor="review_text" className="text-xs font-bold text-foreground">
              Your Feedback <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="review_text"
              name="review_text"
              rows={4}
              placeholder="How was the vehicle condition, pickup handoff, and overall service? Your honest feedback helps future drivers."
              required
              className="rounded-xl border-border bg-card text-xs font-medium"
            />
          </div>

          <DialogFooter className="gap-2 border-t border-border/70 pt-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="rounded-xl bg-[#ffcc00] px-5 text-xs font-extrabold text-black transition hover:bg-[#ffd633]"
            >
              <MessageSquareHeart className="size-3.5 mr-1" />
              Submit Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
