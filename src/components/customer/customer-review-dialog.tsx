"use client";

import { useState, useRef } from "react";
import { Star, Sparkles, MessageSquareHeart, ImagePlus, X } from "lucide-react";
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
import { LoadingButton } from "@/components/common/loading-button";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!booking) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const removePhoto = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const carName =
    [booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") ||
    "Vehicle";

  const activeStars = hoverRating ?? rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card text-card-foreground sm:rounded-2xl p-6 sm:p-7">
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
          <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/40 p-4 text-center">
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
            <p className="text-xs font-bold text-amber-600 dark:text-[#ffcc00]">
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
              rows={3}
              placeholder="How was the vehicle condition, pickup handoff, and overall service? Your honest feedback helps future drivers."
              required
              className="rounded-xl border-border bg-card text-xs font-medium"
            />
          </div>

          {/* Optional Trip Photo Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Add Vehicle/Trip Photo</span>
              <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
            </Label>
            {previewUrl ? (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border group bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Review photo preview" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 size-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600 transition"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-[#ffcc00] hover:bg-muted/30 transition">
                <ImagePlus className="size-5 text-muted-foreground mb-1" />
                <span className="text-xs font-medium text-foreground">Click to upload photo</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG, WebP up to 5MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
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
            <LoadingButton
              type="submit"
              loadingText="Submitting Review..."
              className="rounded-xl bg-[#ffcc00] px-5 text-xs font-extrabold text-black transition hover:bg-[#ffd633]"
            >
              <MessageSquareHeart className="size-3.5 mr-1" />
              Submit Review
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
