"use server";

/**
 * Car and schedule server actions — the port of
 *   car-rental/pages/shared/handlers/car_actions.php
 *   car-rental/pages/shared/handlers/schedule_actions.php
 *
 * Rules kept from the PHP app:
 *   - admin + operator only (staff/customers cannot manage the fleet)
 *   - plate numbers are unique and stored uppercased
 *   - `default.png` is the "no photo" sentinel
 *   - operators may only edit / delete / schedule their own cars
 *   - a schedule block cannot be in the past, must end on/after its start,
 *     and cannot overlap another booking or schedule block
 */

import { revalidatePath } from "next/cache";

import { getSupabase, requireRole } from "@/lib/auth";
import { today } from "@/lib/data/scope";
import { flashRedirect } from "@/lib/flash";
import {
  BUCKETS,
  DEFAULT_IMAGE,
  buildFileName,
  removeFile,
  splitImagePaths,
  uploadFile,
} from "@/lib/storage";

const SCHEDULE_REASONS = [
  "Maintenance",
  "Personal Use",
  "Unavailable",
  "Other",
] as const;

type ScheduleReason = (typeof SCHEDULE_REASONS)[number];

function str(form: FormData, key: string, fallback = ""): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function int(form: FormData, key: string, fallback = 0): number {
  const parsed = Number.parseInt(str(form, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function num(form: FormData, key: string): number {
  const parsed = Number.parseFloat(str(form, key).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function files(form: FormData, key: string): File[] {
  return form
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function fleetHome(session: { role: string }) {
  return session.role === "operator" ? "/operator/view_car" : "/shared/cars";
}

function revalidateFleet() {
  revalidatePath("/shared/cars");
  revalidatePath("/operator/view_car");
  revalidatePath("/staff/dashboard");
  revalidatePath("/admin/dashboard");
  revalidatePath("/user/cars");
  revalidatePath("/");
}

/* ------------------------------------------------------------------ */
/* Add / update car                                                    */
/* ------------------------------------------------------------------ */

export async function saveCarAction(formData: FormData) {
  const session = await requireRole("admin", "operator");
  const home = fleetHome(session);

  const carId = int(formData, "id");
  const plate = str(formData, "plate_number").toUpperCase();
  const brand = str(formData, "brand");
  const model = str(formData, "model");

  if (!brand || !model || !plate) {
    flashRedirect(home, "error", "Brand, model and plate number are required.");
  }

  const supabase = await getSupabase();

  // Plate uniqueness (ignoring the car being edited).
  const { data: plateMatch } = await supabase
    .from("cars")
    .select("id")
    .eq("plate_number", plate)
    .neq("id", carId || 0)
    .limit(1);

  if (plateMatch && plateMatch.length) {
    flashRedirect(
      home,
      "error",
      carId
        ? `Plate number '${plate}' is already assigned to another vehicle.`
        : `Plate number '${plate}' is already registered.`,
    );
  }

  /* ---------------- existing car (authorisation) ---------------- */
  type ExistingCar = {
    id: number;
    image_path: string | null;
    user_id: number | null;
  };

  let existing: ExistingCar | null = null;

  if (carId) {
    let query = supabase
      .from("cars")
      .select("id, image_path, user_id")
      .eq("id", carId);

    if (session.role !== "admin") {
      query = query.eq("user_id", session.userId);
    }

    const { data } = await query.maybeSingle();
    const row = (data as ExistingCar | null) ?? null;

    if (!row) {
      flashRedirect(home, "error", "Car not found or access denied.");
    }

    existing = row;
  }

  /* ---------------- images ---------------- */
  const deleted = formData
    .getAll("delete_existing_images")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  let images = existing?.image_path ? splitImagePaths(existing.image_path) : [];

  if (deleted.length) {
    images = images.filter((name) => !deleted.includes(name));

    for (const name of deleted) {
      if (name !== DEFAULT_IMAGE) {
        await removeFile(supabase, BUCKETS.carImages, name);
      }
    }
  }

  for (const upload of files(formData, "car_images")) {
    const fileName = buildFileName("car", upload);
    const result = await uploadFile(supabase, {
      bucket: BUCKETS.carImages,
      fileName,
      file: upload,
    });

    if (result.ok) {
      images = images.filter((name) => name !== DEFAULT_IMAGE);
      if (!images.includes(fileName)) images.push(fileName);
    }
  }

  if (!images.length) images = [DEFAULT_IMAGE];
  images = [...new Set(images)];

  /* ---------------- owner / branch ---------------- */
  let ownerId = existing?.user_id ?? session.userId;

  if (session.role === "admin") {
    const picked = int(formData, "user_id");
    if (picked > 0) {
      const { data: owner } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("id", picked)
        .maybeSingle();

      const row = owner as { id: number; name: string; role: string } | null;

      if (!row || !["operator", "admin"].includes(row.role)) {
        flashRedirect(home, "error", "Invalid operator selected.");
      }

      ownerId = row.id;
    } else if (!carId) {
      ownerId = session.userId;
    }
  }

  const branchRaw = str(formData, "branch_id");
  const branchId = branchRaw === "" || branchRaw === "0" ? null : Number(branchRaw);

  const statusVal = str(formData, "status");

  const payload = {
    user_id: ownerId,
    branch_id: Number.isFinite(branchId as number) ? branchId : null,
    brand,
    model,
    plate_number: plate,
    fuel_type: str(formData, "fuel_type"),
    type: str(formData, "type"),
    transmission: str(formData, "transmission", "Manual"),
    capacity: int(formData, "capacity"),
    color: str(formData, "color"),
    image_path: images.join(","),
    ...(statusVal ? { status: statusVal as import("@/lib/types").CarStatus } : {}),
    price_10_hours: num(formData, "price_10_hours"),
    operator_10_hours: num(formData, "operator_10_hours"),
    price_12_hours: num(formData, "price_12_hours"),
    operator_12_hours: num(formData, "operator_12_hours"),
    price_24_hours: num(formData, "price_24_hours"),
    operator_24_hours: num(formData, "operator_24_hours"),
    ext_price_1_6: num(formData, "ext_price_1_6"),
    ext_price_7_10: num(formData, "ext_price_7_10"),
    ext_price_11_12: num(formData, "ext_price_11_12"),
    ext_price_13_24: num(formData, "ext_price_13_24"),
  };

  if (carId) {
    const { error } = await supabase
      .from("cars")
      .update(payload)
      .eq("id", carId);

    if (error) flashRedirect(home, "error", `Update failed: ${error.message}`);

    revalidateFleet();
    flashRedirect(home, "success", "Vehicle updated successfully!");
  }

  const { error } = await supabase.from("cars").insert({
    ...payload,
    status: "Available",
  });

  if (error) flashRedirect(home, "error", `Insert failed: ${error.message}`);

  let message = "Car added successfully!";

  if (ownerId !== session.userId) {
    const { data: owner } = await supabase
      .from("users")
      .select("name")
      .eq("id", ownerId)
      .maybeSingle();

    const name = (owner as { name: string | null } | null)?.name;
    message = `Car added successfully and assigned to ${name ?? "operator"}!`;
  }

  revalidateFleet();
  flashRedirect(home, "success", message);
}

/* ------------------------------------------------------------------ */
/* Delete car                                                          */
/* ------------------------------------------------------------------ */

export async function deleteCarAction(formData: FormData) {
  const session = await requireRole("admin", "operator");
  const home = fleetHome(session);

  const carId = int(formData, "car_id") || int(formData, "delete_car");

  if (!carId) flashRedirect(home, "error", "Invalid vehicle.");

  const supabase = await getSupabase();

  let query = supabase.from("cars").select("id, image_path").eq("id", carId);

  if (session.role !== "admin") {
    query = query.eq("user_id", session.userId);
  }

  const { data } = await query.maybeSingle();
  const car = data as { id: number; image_path: string | null } | null;

  if (!car) flashRedirect(home, "error", "Car not found or access denied.");

  const { error } = await supabase.from("cars").delete().eq("id", carId);

  if (error) flashRedirect(home, "error", `Delete failed: ${error.message}`);

  for (const name of splitImagePaths(car.image_path)) {
    if (name !== DEFAULT_IMAGE) {
      await removeFile(supabase, BUCKETS.carImages, name);
    }
  }

  revalidateFleet();
  flashRedirect(home, "success", "Vehicle deleted successfully.");
}

/* ------------------------------------------------------------------ */
/* Main photo                                                          */
/* ------------------------------------------------------------------ */

export async function setMainImageAction(formData: FormData) {
  const session = await requireRole("admin", "operator");
  const home = fleetHome(session);

  const carId = int(formData, "car_id");
  const imageName = str(formData, "image_name");

  if (!carId || !imageName) {
    flashRedirect(home, "error", "Failed to change main photo.");
  }

  const supabase = await getSupabase();

  let query = supabase.from("cars").select("id, image_path").eq("id", carId);

  if (session.role !== "admin") {
    query = query.eq("user_id", session.userId);
  }

  const { data } = await query.maybeSingle();
  const car = data as { id: number; image_path: string | null } | null;

  const images = car ? splitImagePaths(car.image_path) : [];

  if (!car || !images.includes(imageName)) {
    flashRedirect(home, "error", "Failed to change main photo.");
  }

  const reordered = [imageName, ...images.filter((name) => name !== imageName)];

  const { error } = await supabase
    .from("cars")
    .update({ image_path: reordered.join(",") })
    .eq("id", carId);

  if (error) flashRedirect(home, "error", "Failed to change main photo.");

  revalidateFleet();
  flashRedirect(home, "success", "Main photo updated.");
}

/* ------------------------------------------------------------------ */
/* Car schedules                                                       */
/* ------------------------------------------------------------------ */

export async function saveScheduleAction(formData: FormData) {
  const session = await requireRole("admin", "operator");
  const home = "/shared/my_car_schedules";

  const carId = int(formData, "car_id");
  const startDate = str(formData, "start_date");
  const endDate = str(formData, "end_date");
  const rawReason = str(formData, "reason", "Unavailable");
  const notes = str(formData, "notes");

  if (!carId || !startDate || !endDate) {
    flashRedirect(home, "error", "Please fill in all required fields.");
  }

  const reason: ScheduleReason = SCHEDULE_REASONS.includes(
    rawReason as ScheduleReason,
  )
    ? (rawReason as ScheduleReason)
    : "Unavailable";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    flashRedirect(home, "error", "Invalid date format.");
  }

  if (endDate < startDate) {
    flashRedirect(home, "error", "End date cannot be before the start date.");
  }

  if (startDate < today()) {
    flashRedirect(home, "error", "Start date cannot be in the past.");
  }

  const supabase = await getSupabase();

  let carQuery = supabase.from("cars").select("id, user_id").eq("id", carId);

  if (session.role !== "admin") {
    carQuery = carQuery.eq("user_id", session.userId);
  }

  const { data: carData } = await carQuery.maybeSingle();

  if (!carData) {
    flashRedirect(
      home,
      "error",
      "Car not found or you don't have permission to schedule it.",
    );
  }

  const { data: bookingConflict } = await supabase
    .from("bookings")
    .select("id")
    .eq("car_id", carId)
    .in("status", ["Pending", "Confirmed", "Released"])
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);

  if (bookingConflict && bookingConflict.length) {
    flashRedirect(
      home,
      "error",
      "There's already a booking on those dates. Cancel or move it first.",
    );
  }

  const { data: scheduleConflict } = await supabase
    .from("car_schedules")
    .select("id")
    .eq("car_id", carId)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);

  if (scheduleConflict && scheduleConflict.length) {
    flashRedirect(
      home,
      "error",
      "This car already has a schedule block overlapping those dates.",
    );
  }

  const { error } = await supabase.from("car_schedules").insert({
    car_id: carId,
    created_by: session.userId,
    start_date: startDate,
    end_date: endDate,
    reason,
    notes: notes || null,
  });

  if (error) {
    flashRedirect(home, "error", `Failed to save schedule block: ${error.message}`);
  }

  revalidatePath("/shared/my_car_schedules");
  revalidatePath("/shared/cars");
  revalidatePath("/operator/view_car");
  flashRedirect(home, "success", "Schedule block added successfully.");
}

export async function deleteScheduleAction(formData: FormData) {
  const session = await requireRole("admin", "operator");
  const home = "/shared/my_car_schedules";

  const scheduleId = int(formData, "schedule_id") || int(formData, "id");

  if (!scheduleId) flashRedirect(home, "error", "Invalid schedule.");

  const supabase = await getSupabase();

  const { data: schedule } = await supabase
    .from("car_schedules")
    .select("id, car_id")
    .eq("id", scheduleId)
    .maybeSingle();

  if (!schedule) flashRedirect(home, "error", "Schedule not found.");

  const carId = (schedule as { id: number; car_id: number }).car_id;

  if (session.role !== "admin") {
    const { data: car } = await supabase
      .from("cars")
      .select("id, user_id")
      .eq("id", carId)
      .maybeSingle();

    const owner = (car as { id: number; user_id: number | null } | null)?.user_id;

    if (owner !== session.userId) {
      flashRedirect(home, "error", "You don't have permission to delete this schedule.");
    }
  }

  const { error } = await supabase
    .from("car_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) flashRedirect(home, "error", `Delete failed: ${error.message}`);

  revalidatePath("/shared/my_car_schedules");
  revalidatePath("/shared/cars");
  revalidatePath("/operator/view_car");
  flashRedirect(home, "success", "Schedule block deleted.");
}
