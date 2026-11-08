import { NextRequest, NextResponse } from "next/server";

import { manilaToday } from "@/lib/datetime";
import { ACTIVE_CAR_STATUSES, OPEN_BOOKING_STATUSES } from "@/lib/data/legacy-status";
import { getAdminClient } from "@/lib/supabase-admin";
import { carImageUrl } from "@/lib/storage";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  const admin = getAdminClient();
  if (admin) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return null;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function formatCurrency(amount: number | null | undefined): string {
  const val = Number(amount ?? 0);
  return `₱${val.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}

/**
 * Public backend API route to check car availability by date range.
 *
 * Parameters (query string):
 *   - start / start_date / startDate: YYYY-MM-DD (defaults to today in Manila time)
 *   - end / end_date / endDate:     YYYY-MM-DD (defaults to start date)
 *   - type:                         Car type (e.g. "Sedan", "SUV", "MPV") (optional)
 *   - branch_id / branchId:         Branch ID number (optional)
 *
 * Live URL:
 *   GET https://instacar.vercel.app/api/cars/available?start=2026-11-10&end=2026-11-12
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const rawStart =
    searchParams.get("start") ||
    searchParams.get("start_date") ||
    searchParams.get("startDate");

  const rawEnd =
    searchParams.get("end") ||
    searchParams.get("end_date") ||
    searchParams.get("endDate");

  const type = (searchParams.get("type") || "").trim();
  const branchParam = searchParams.get("branch_id") || searchParams.get("branchId");
  const branchId = branchParam ? Number(branchParam) : null;

  const today = manilaToday();
  const startDate = rawStart ? rawStart.trim() : today;
  const endDate = rawEnd ? rawEnd.trim() : startDate;

  // Validate date format YYYY-MM-DD
  if (!DATE_REGEX.test(startDate)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid start date: "${startDate}". Must be in YYYY-MM-DD format (e.g. 2026-11-10).`,
      },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  if (!DATE_REGEX.test(endDate)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid end date: "${endDate}". Must be in YYYY-MM-DD format (e.g. 2026-11-12).`,
      },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      {
        success: false,
        error: `Start date (${startDate}) cannot be after end date (${endDate}).`,
      },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  const supabase = getClient();
  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: "Database connection not available on server.",
      },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  try {
    // 1. Fetch all rentable cars in the active fleet
    let carQuery = supabase
      .from("cars")
      .select(
        `
        id,
        brand,
        model,
        type,
        transmission,
        capacity,
        fuel_type,
        color,
        price_24_hours,
        price_12_hours,
        price_10_hours,
        image_path,
        status,
        branch_id,
        branches!cars_branch_id_fkey ( id, name )
      `,
      )
      .in("status", ACTIVE_CAR_STATUSES);

    if (branchId && Number.isInteger(branchId)) {
      carQuery = carQuery.eq("branch_id", branchId);
    }

    if (type && type.toLowerCase() !== "all") {
      carQuery = carQuery.ilike("type", type);
    }

    const { data: cars, error: carError } = await carQuery.order("id", { ascending: true });

    if (carError) {
      console.error("[api/cars/available] Error querying cars:", carError);
      return NextResponse.json(
        { success: false, error: carError.message },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    if (!cars || cars.length === 0) {
      return NextResponse.json(
        {
          success: true,
          query: {
            start_date: startDate,
            end_date: endDate,
            type: type || "all",
            branch_id: branchId,
          },
          total_available: 0,
          available_cars: [],
        },
        { headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    const carIds = cars.map((c) => c.id);

    // 2. Fetch conflicting bookings and maintenance schedules for the date window
    // Overlap condition: requested_start <= existing_end AND requested_end >= existing_start
    const [bookingsRes, schedulesRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("car_id")
        .in("car_id", carIds)
        .in("status", OPEN_BOOKING_STATUSES)
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("car_schedules")
        .select("car_id")
        .in("car_id", carIds)
        .lte("start_date", endDate)
        .gte("end_date", startDate),
    ]);

    const busyIds = new Set<number>();

    if (bookingsRes.data) {
      for (const b of bookingsRes.data) {
        if (b.car_id) busyIds.add(b.car_id);
      }
    }

    if (schedulesRes.data) {
      for (const s of schedulesRes.data) {
        if (s.car_id) busyIds.add(s.car_id);
      }
    }

    // 3. Filter out busy vehicles
    const available = cars.filter((car) => !busyIds.has(car.id));

    // 4. Format available units for frontend / bots / Messenger
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://instacar.vercel.app";

    const formattedCars = available.map((car) => {
      const brand = car.brand || "Vehicle";
      const model = car.model || "";
      const name = `${brand} ${model}`.trim();
      const primaryPhoto = car.image_path ? car.image_path.split(",")[0].trim() : "default.png";
      const photoUrl = carImageUrl(primaryPhoto || "default.png");
      const rawBranch = Array.isArray(car.branches) ? car.branches[0] : car.branches;
      const branchInfo = rawBranch as { id?: number; name?: string } | null | undefined;
      const userBookingPath = `/user/cars?search=${encodeURIComponent(name)}&car_id=${car.id}&start=${startDate}&end=${endDate}`;
      const directBookingUrl = `${appOrigin}/login?next=${encodeURIComponent(userBookingPath)}`;

      return {
        id: car.id,
        name,
        brand: car.brand,
        model: car.model,
        type: car.type || "Sedan",
        transmission: car.transmission || "Automatic",
        capacity: car.capacity ?? 5,
        fuel_type: car.fuel_type || "Gasoline",
        color: car.color || null,
        rate_per_day: `${formatCurrency(car.price_24_hours)}/day`,
        price_24_hours: car.price_24_hours ?? 0,
        price_12_hours: car.price_12_hours ?? 0,
        price_10_hours: car.price_10_hours ?? 0,
        image_url: photoUrl,
        booking_url: directBookingUrl,
        branch: branchInfo?.name ?? "Iloilo Main",
      };
    });

    return NextResponse.json(
      {
        success: true,
        query: {
          start_date: startDate,
          end_date: endDate,
          type: type || "all",
          branch_id: branchId,
        },
        total_available: formattedCars.length,
        available_cars: formattedCars,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err: any) {
    console.error("[api/cars/available] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}
