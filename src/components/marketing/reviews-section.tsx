"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  MessageSquareHeart,
  ImagePlus,
  X,
  Car,
  AlertCircle,
  LogIn,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/common/loading-button";
import {
  saveReviewAction,
  getUserCompletedBookingsAction,
  type EligibleBooking,
} from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

export interface ReviewItem {
  id: string | number;
  carId?: number | null;
  authorName: string;
  rating: number;
  date: string;
  carName: string;
  title: string;
  text: string;
  verified: boolean;
  photoUrl?: string | null;
}

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: "r1",
    authorName: "Miguel Santos",
    rating: 5,
    date: "November 2026",
    carName: "Toyota Fortuner (7-Seater)",
    title: "Spotless vehicle and seamless airport handoff!",
    text: "Rented the Fortuner for a family road trip to Carles and Gigantes. The car was spotless, smelled fresh, and performed wonderfully on provincial roads. The team met us right outside Iloilo airport baggage claim. Outstanding service!",
    verified: true,
  },
  {
    id: "r2",
    authorName: "Sarah Jenkins",
    rating: 5,
    date: "October 2026",
    carName: "Mitsubishi Xpander Cross",
    title: "Best rental experience in Western Visayas",
    text: "Smooth online booking and instant paperless contract. The 24-hour rate was straightforward with zero hidden charges. Highly recommend InstaCar for both tourists and business travelers.",
    verified: true,
  },
  {
    id: "r3",
    authorName: "Marco De Leon",
    rating: 4,
    date: "October 2026",
    carName: "Toyota Vios 1.5G",
    title: "Great fuel economy & prompt doorstep delivery",
    text: "Car was delivered straight to our hotel in Mandurriao right on time. Very fuel efficient and in top mechanical condition. Returning the car took less than 3 minutes. Will definitely book again.",
    verified: true,
  },
  {
    id: "r4",
    authorName: "Elena Rostova",
    rating: 5,
    date: "September 2026",
    carName: "Nissan Urvan Premium (15-Seater)",
    title: "Spacious van for our company team retreat",
    text: "We booked the Urvan for our 12-person executive team. Aircon was ice-cold, suspension was plush, and the interior was sanitized. The dispatch team checked in with us during our trip. 10/10!",
    verified: true,
  },
  {
    id: "r5",
    authorName: "Carlo Mendoza",
    rating: 5,
    date: "August 2026",
    carName: "Ford Everest Titanium",
    title: "Rugged yet premium comfort",
    text: "Superb vehicle for our mountain trip. The digital agreement was signed on my phone in 2 minutes, and the deposit was processed transparently. Truly elevated car rental in the Philippines.",
    verified: true,
  },
];

const STAR_DISTRIBUTION = [
  { stars: 5, percentage: 84, count: 1192 },
  { stars: 4, percentage: 11, count: 156 },
  { stars: 3, percentage: 3, count: 42 },
  { stars: 2, percentage: 1, count: 14 },
  { stars: 1, percentage: 1, count: 16 },
];

export function ReviewsSection({
  initialReviews,
}: {
  initialReviews?: ReviewItem[];
}) {
  const reviews = initialReviews && initialReviews.length > 0 ? initialReviews : DEFAULT_REVIEWS;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Dynamically calculate average rating and star breakdown from real reviews
  const { overallScore, totalCountLabel, starDistribution } = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return {
        overallScore: "4.6",
        totalCountLabel: "Based on 1,420+ verified ratings",
        starDistribution: STAR_DISTRIBUTION,
      };
    }

    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      const s = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[s] = (counts[s] || 0) + 1;
      sum += r.rating || 5;
    }

    const avg = (sum / reviews.length).toFixed(1);
    const dist = [5, 4, 3, 2, 1].map((stars) => {
      const c = counts[stars] || 0;
      const pct = Math.round((c / reviews.length) * 100);
      return { stars, percentage: pct, count: c };
    });

    const isRealDb = Boolean(initialReviews && initialReviews.length > 0);
    const dbCount = initialReviews?.length ?? 0;

    return {
      overallScore: avg,
      totalCountLabel: isRealDb
        ? `Based on ${dbCount} verified rating${dbCount > 1 ? "s" : ""}`
        : "Based on 1,420+ verified ratings",
      starDistribution: dist,
    };
  }, [reviews, initialReviews]);

  // Write a Review modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [completedBookings, setCompletedBookings] = useState<EligibleBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const prevReview = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const nextReview = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const openWriteReviewModal = async () => {
    setModalOpen(true);
    setIsLoadingEligibility(true);
    try {
      const res = await getUserCompletedBookingsAction();
      setIsLoggedIn(res.isLoggedIn);
      setCompletedBookings(res.completedBookings);
      if (res.completedBookings.length > 0) {
        setSelectedBookingId(res.completedBookings[0].id);
      }
    } catch {
      setIsLoggedIn(false);
      setCompletedBookings([]);
    } finally {
      setIsLoadingEligibility(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
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

  const currentReview = reviews[currentIndex] || DEFAULT_REVIEWS[0];
  const activeStars = hoverRating ?? rating;

  return (
    <section className="relative overflow-hidden border-t border-border bg-card/60 py-16 sm:py-24">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 -z-10 size-96 -translate-y-1/2 rounded-full bg-[#ffcc00]/5 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center sm:text-left mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ffcc00]/30 bg-[#ffcc00]/10 px-3 py-1 text-xs font-bold text-[#b38a00] dark:text-[#ffcc00]">
            <Sparkles className="size-3.5" />
            <span>Customer Testimonials</span>
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            What Customers Say
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
            Real feedback from verified drivers who have booked and traveled with InstaCar across the region.
          </p>
        </div>

        {/* 2-Column Grid: Left Aggregate + Right Carousel */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-center">
          {/* LEFT: Aggregate Rating & Star Bars */}
          <div className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-border/80 text-center sm:text-left">
              <div className="text-5xl sm:text-6xl font-black text-foreground tracking-tight">
                {overallScore}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "size-5",
                        s <= Math.round(Number(overallScore))
                          ? "fill-[#ffcc00] text-[#ffcc00]"
                          : "fill-[#ffcc00]/30 text-[#ffcc00]/30",
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {totalCountLabel}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="size-3.5" />
                  <span>100% Verified Rentals</span>
                </div>
              </div>
            </div>

            {/* Star Distribution Bars */}
            <div className="space-y-2.5 py-6 border-b border-border/80">
              {starDistribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-bold text-foreground shrink-0 flex items-center gap-1">
                    <span>{item.stars}</span>
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                  </span>
                  <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#ffcc00] transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-semibold text-muted-foreground shrink-0">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>

            {/* Write a Review CTA Button */}
            <div className="pt-6">
              <Button
                type="button"
                onClick={openWriteReviewModal}
                className="w-full rounded-2xl bg-[#ffcc00] py-6 text-sm font-black text-black hover:bg-[#ffd633] shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <MessageSquareHeart className="size-4 mr-2" />
                Write a Review
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Verified renters with completed trips are eligible to submit feedback.
              </p>
            </div>
          </div>

          {/* RIGHT: User Reviews Carousel */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl border border-border bg-card p-7 sm:p-10 shadow-lg min-h-[360px] flex flex-col justify-between">
              {/* Quote Mark Decoration */}
              <div className="absolute right-6 top-6 text-6xl font-serif text-muted-foreground/15 select-none pointer-events-none">
                “
              </div>

              <div>
                {/* Top Badge: Verified Renter & Car Type */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      <span>Verified Renter</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-foreground">
                      <Car className="size-3 text-[#ffcc00]" />
                      <span>{currentReview.carName}</span>
                    </span>
                  </div>

                  <span className="text-xs text-muted-foreground font-medium">
                    {currentReview.date}
                  </span>
                </div>

                {/* Star Rating */}
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "size-4",
                        s <= currentReview.rating
                          ? "fill-[#ffcc00] text-[#ffcc00]"
                          : "fill-muted text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>

                {/* Review Headline & Body */}
                <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight mb-2">
                  {currentReview.title}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-muted-foreground font-normal">
                  &ldquo;{currentReview.text}&rdquo;
                </p>

                {/* Optional Review Photo */}
                {currentReview.photoUrl ? (
                  <div className="mt-4 max-w-xs rounded-xl overflow-hidden border border-border shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentReview.photoUrl}
                      alt="Customer rental photo"
                      className="size-full object-cover aspect-video"
                    />
                  </div>
                ) : null}
              </div>

              {/* Author Info & Navigation Controls */}
              <div className="mt-8 flex items-center justify-between border-t border-border/80 pt-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#ffcc00] text-black font-black flex items-center justify-center text-sm shadow-xs">
                    {currentReview.authorName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-foreground">
                      {currentReview.authorName}
                    </h4>
                    <p className="text-xs text-muted-foreground">Verified Driver</p>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevReview}
                    aria-label="Previous review"
                    className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:border-[#ffcc00] hover:bg-muted active:scale-95 cursor-pointer shadow-xs"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  <div className="px-2 text-xs font-bold text-muted-foreground">
                    {currentIndex + 1} / {reviews.length}
                  </div>

                  <button
                    type="button"
                    onClick={nextReview}
                    aria-label="Next review"
                    className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:border-[#ffcc00] hover:bg-muted active:scale-95 cursor-pointer shadow-xs"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GATED WRITE A REVIEW MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg border-border bg-card text-card-foreground sm:rounded-3xl p-6 sm:p-7">
          <DialogHeader className="border-b border-border/70 pb-3 pr-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffcc00]">
              <Sparkles className="size-3.5" />
              <span>Rental Feedback</span>
            </div>
            <DialogTitle className="mt-1 text-lg sm:text-xl font-black text-foreground">
              Write a Customer Review
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Share your rental experience and help future drivers choose the right ride.
            </DialogDescription>
          </DialogHeader>

          {isLoadingEligibility ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <div className="size-6 animate-spin rounded-full border-2 border-[#ffcc00] border-t-transparent" />
              <span>Verifying rental history...</span>
            </div>
          ) : !isLoggedIn ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#ffcc00]/10 text-amber-600 dark:text-[#ffcc00]">
                <LogIn className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">Sign In Required</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Only customers with verified completed bookings can leave reviews. Please sign in to your InstaCar account.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button asChild className="rounded-xl bg-[#ffcc00] text-black font-bold text-xs hover:bg-[#ffd633]">
                  <Link href="/login?return_to=/">Sign In to Continue</Link>
                </Button>
              </div>
            </div>
          ) : completedBookings.length === 0 ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertCircle className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">No Completed Trips Found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  To ensure honest ratings, reviews can only be posted after a trip has officially reached &ldquo;Completed&rdquo; status.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl text-xs">
                  Close
                </Button>
                <Button asChild className="rounded-xl bg-[#ffcc00] text-black font-bold text-xs hover:bg-[#ffd633]">
                  <Link href="/availability">Explore Fleet to Book</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form action={saveReviewAction} className="space-y-4 pt-2">
              <input type="hidden" name="rating" value={rating} />
              <input type="hidden" name="return_url" value="/" />

              {/* Vehicle / Booking Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="booking_id" className="text-xs font-bold text-foreground">
                  Select Completed Trip <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="booking_id"
                  name="booking_id"
                  value={selectedBookingId ?? ""}
                  onChange={(e) => setSelectedBookingId(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:border-[#ffcc00] focus:outline-none"
                >
                  {completedBookings.map((b) => {
                    const name =
                      [b.cars?.brand, b.cars?.model].filter(Boolean).join(" ") || "Vehicle";
                    return (
                      <option key={b.id} value={b.id}>
                        Booking #{b.id} — {name} ({b.end_date})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Star Rating Selector */}
              <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/40 p-3.5 text-center">
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
                      className="rounded-md p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
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
                  {activeStars === 5
                    ? "5 - Excellent"
                    : activeStars === 4
                      ? "4 - Very Good"
                      : activeStars === 3
                        ? "3 - Good"
                        : activeStars === 2
                          ? "2 - Fair"
                          : "1 - Poor"}
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
                  placeholder="e.g. Spotless vehicle and punctual delivery!"
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
                  placeholder="How was the ride condition, pickup experience, and dispatch support?"
                  required
                  className="rounded-xl border-border bg-card text-xs font-medium"
                />
              </div>

              {/* Optional Trip Photo Upload */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Add Vehicle Photo</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </Label>
                {previewUrl ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border group bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Review photo preview"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 size-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600 transition cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-[#ffcc00] hover:bg-muted/30 transition">
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
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
