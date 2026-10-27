import { redirect } from "next/navigation";

export const instant = false;

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/common/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { getBooking } from "@/lib/data/bookings";
import { requireRole } from "@/lib/auth";
import { readFlash } from "@/lib/flash";
import { saveReviewAction } from "@/lib/actions/reviews";

function searchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  if (!searchParams) return undefined;
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LeaveReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("user");
  const params = await searchParams;
  const flash = readFlash(params);
  const bookingId = Number.parseInt(searchParam(params, "booking_id") ?? "", 10);

  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    redirect("/user/mybookings");
  }

  const { booking } = await getBooking(session, bookingId);

  if (!booking || booking.user_id !== session.userId) {
    redirect("/user/mybookings");
  }

  const car = booking.cars;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title="Leave a Review"
        subtitle="Feedback"
        description="Share your experience with this booking."
      />

      <Flash {...flash} />

      <SectionCard
        title="Booking Details"
        description={`Booking #${booking.id}`}
        className="mb-4"
        bodyClassName="p-4 md:p-5"
      >
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Vehicle</dt>
            <dd className="font-semibold text-foreground">
              {[car?.brand, car?.model].filter(Boolean).join(" ") || "Vehicle"}{" "}
              {car?.plate_number ? `(${car.plate_number})` : null}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dates</dt>
            <dd className="font-semibold text-foreground">
              {booking.start_date} to {booking.end_date}
            </dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Your Review" bodyClassName="p-4 md:p-6">
        <form action={saveReviewAction} className="space-y-4">
          <input type="hidden" name="booking_id" value={booking.id} />

          <div className="space-y-1.5">
            <Label htmlFor="rating">Rating</Label>
            <select
              id="rating"
              name="rating"
              defaultValue="5"
              className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm font-medium"
            >
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Very Good</option>
              <option value="3">3 - Good</option>
              <option value="2">2 - Fair</option>
              <option value="1">1 - Poor</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review_title">Review Title</Label>
            <Input id="review_title" name="review_title" required placeholder="Summarize your experience" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review_text">Your Review</Label>
            <Textarea id="review_text" name="review_text" required rows={6} placeholder="Tell us about your experience..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <a href="/user/mybookings">Cancel</a>
            </Button>
            <LoadingButton type="submit" loadingText="Submitting Review...">
              Submit Review
            </LoadingButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
