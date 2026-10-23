"use server";

/**
 * Remittance server actions — the port of
 *   car-rental/pages/admin/process/record_remittance.php
 *   car-rental/pages/admin/process/delete_remittance.php
 *   car-rental/pages/admin/process/staff_remittance_actions.php
 *
 * Rules kept from the PHP app:
 *   - admin only (staff fees are recorded by the admin on behalf of a branch)
 *   - the payment may never exceed the outstanding balance
 *   - operator balance   = SUM(booking_payments.operator_share) - SUM(operator_remittances.amount)
 *   - staff fee balance  = SUM(jer_delivery_fee + jer_pickup_fee) - SUM(staff_fee_remittances.amount)
 *   - proof files: jpeg / png / pdf, max 5 MB each, multiple allowed
 *   - deleting a remittance removes the rows *and* the stored proof files
 */

import { revalidatePath } from "next/cache";

import { getSupabase, requireRole } from "@/lib/auth";
import { flashRedirect } from "@/lib/flash";
import {
  BUCKETS,
  buildFileName,
  removeFile,
  remittancePhotoKey,
  uploadFile,
} from "@/lib/storage";

const PROOF_MIME = ["image/jpeg", "image/png", "application/pdf"];

function str(form: FormData, key: string, fallback = ""): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function int(form: FormData, key: string, fallback = 0): number {
  const parsed = Number.parseInt(str(form, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function amount(form: FormData): number {
  const parsed = Number.parseFloat(str(form, "amount").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function proofs(form: FormData): File[] {
  return form
    .getAll("proofs")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function peso(value: number) {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function revalidateRemittances() {
  revalidatePath("/admin/operator_revenue");
  revalidatePath("/admin/remittance");
  revalidatePath("/admin/admin_revenue");
  revalidatePath("/admin/income");
  revalidatePath("/admin/dashboard");
}

/** Uploads the optional proof files and returns `{ attached, skipped }`. */
async function attachProofs(options: {
  remittanceId: number;
  prefix: string;
  table: "operator_remittance_photos" | "staff_fee_remittance_photos";
  files: File[];
}) {
  const supabase = await getSupabase();
  let attached = 0;
  let skipped = 0;

  for (const upload of options.files) {
    if (!PROOF_MIME.includes(upload.type)) {
      skipped += 1;
      continue;
    }

    if (upload.size > 5 * 1024 * 1024) {
      skipped += 1;
      continue;
    }

    const fileName = buildFileName(
      `${options.prefix}_${options.remittanceId}`,
      upload,
    );

    const result = await uploadFile(supabase, {
      bucket: BUCKETS.remittancePhotos,
      fileName,
      file: upload,
    });

    if (!result.ok) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from(options.table).insert({
      remittance_id: options.remittanceId,
      file_name: fileName,
    });

    if (error) {
      await removeFile(supabase, BUCKETS.remittancePhotos, fileName);
      skipped += 1;
      continue;
    }

    attached += 1;
  }

  return { attached, skipped };
}

function proofSuffix(attached: number, skipped: number) {
  let text = "";

  if (attached > 0) {
    text += ` ${attached} proof file${attached === 1 ? "" : "s"} attached.`;
  }

  if (skipped > 0) {
    text += ` (${skipped} file${skipped === 1 ? "" : "s"} skipped — invalid format or too large.)`;
  }

  return text;
}

/* ------------------------------------------------------------------ */
/* Operator remittances                                                */
/* ------------------------------------------------------------------ */

export async function recordOperatorRemittanceAction(formData: FormData) {
  const session = await requireRole("admin");

  const carId = int(formData, "car_id");
  const value = amount(formData);
  const paymentDate = str(formData, "payment_date");
  const notes = str(formData, "notes");
  const home = "/admin/operator_revenue";

  if (carId <= 0 || value <= 0) {
    flashRedirect(home, "error", "Invalid payment data.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    flashRedirect(home, "error", "Invalid payment date format.");
  }

  const supabase = await getSupabase();

  const { data: carData } = await supabase
    .from("cars")
    .select("id, user_id, users!cars_user_id_fkey ( id, name, role )")
    .eq("id", carId)
    .maybeSingle();

  const car = carData as
    | {
        id: number;
        user_id: number | null;
        users:
          | { id: number; name: string | null; role: string }
          | { id: number; name: string | null; role: string }[]
          | null;
      }
    | null;

  const owner = Array.isArray(car?.users) ? car?.users[0] : car?.users;

  if (!car || !owner || owner.role !== "operator") {
    flashRedirect(home, "error", "Car not found or not owned by an operator.");
  }

  // Outstanding balance -------------------------------------------------
  const { data: paymentRows } = await supabase
    .from("booking_payments")
    .select(
      "operator_share, bookings!booking_payments_booking_id_fkey!inner ( car_id )",
    )
    .eq("bookings.car_id", carId)
    .gt("operator_share", 0);

  const totalOwed = ((paymentRows ?? []) as { operator_share: number | null }[]).reduce(
    (sum, row) => sum + Number(row.operator_share ?? 0),
    0,
  );

  const { data: remittanceRows } = await supabase
    .from("operator_remittances")
    .select("amount")
    .eq("car_id", carId);

  const totalPaid = ((remittanceRows ?? []) as { amount: number | null }[]).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  const balance = totalOwed - totalPaid;

  if (balance <= 0) {
    flashRedirect(home, "error", "This car has no outstanding balance.");
  }

  if (value > balance + 0.005) {
    flashRedirect(
      home,
      "error",
      `Payment amount exceeds the outstanding balance of ${peso(balance)}.`,
    );
  }

  const { data: inserted, error } = await supabase
    .from("operator_remittances")
    .insert({
      operator_id: owner.id,
      car_id: carId,
      amount: value,
      payment_date: paymentDate,
      notes: notes || null,
      recorded_by: session.userId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    flashRedirect(home, "error", `Failed to record payment: ${error.message}`);
  }

  const remittanceId = (inserted as { id: number } | null)?.id ?? 0;

  const { attached, skipped } = remittanceId
    ? await attachProofs({
        remittanceId,
        prefix: "remit",
        table: "operator_remittance_photos",
        files: proofs(formData),
      })
    : { attached: 0, skipped: 0 };

  const newBalance = balance - value;

  let message = `Payment of ${peso(value)} recorded.`;

  message +=
    newBalance <= 0.005
      ? " This car is now fully settled."
      : ` Remaining balance: ${peso(newBalance)}.`;

  message += proofSuffix(attached, skipped);

  revalidateRemittances();
  flashRedirect(home, "success", message);
}

export async function deleteOperatorRemittanceAction(formData: FormData) {
  await requireRole("admin");

  const remittanceId = int(formData, "remittance_id");
  const home = "/admin/operator_revenue";

  if (remittanceId <= 0) {
    flashRedirect(home, "error", "Invalid remittance.");
  }

  const supabase = await getSupabase();

  const { data: remittance } = await supabase
    .from("operator_remittances")
    .select("id, amount, payment_date")
    .eq("id", remittanceId)
    .maybeSingle();

  const row = remittance as {
    id: number;
    amount: number | null;
    payment_date: string | null;
  } | null;

  if (!row) {
    flashRedirect(home, "error", "Remittance not found.");
  }

  const { data: photoRows } = await supabase
    .from("operator_remittance_photos")
    .select("id, file_name")
    .eq("remittance_id", remittanceId);

  const photos = (photoRows ?? []) as { id: number; file_name: string }[];

  for (const photo of photos) {
    await removeFile(
      supabase,
      BUCKETS.remittancePhotos,
      remittancePhotoKey(photo.file_name),
    );
  }

  await supabase
    .from("operator_remittance_photos")
    .delete()
    .eq("remittance_id", remittanceId);

  const { error } = await supabase
    .from("operator_remittances")
    .delete()
    .eq("id", remittanceId);

  if (error) {
    flashRedirect(home, "error", `Delete failed: ${error.message}`);
  }

  let message = `Remittance of ${peso(Number(row.amount ?? 0))} for booking date ${row.payment_date ?? ""} has been deleted.`;

  if (photos.length) {
    message += ` ${photos.length} proof file${photos.length === 1 ? "" : "s"} removed.`;
  }

  revalidateRemittances();
  flashRedirect(home, "success", message);
}

/* ------------------------------------------------------------------ */
/* Staff fee remittances                                               */
/* ------------------------------------------------------------------ */

export async function recordStaffRemittanceAction(formData: FormData) {
  const session = await requireRole("admin");

  const branchId = int(formData, "branch_id");
  const value = amount(formData);
  const paymentDate = str(formData, "payment_date");
  const notes = str(formData, "notes");
  const home = "/admin/remittance";

  if (branchId <= 0 || value <= 0) {
    flashRedirect(home, "error", "Invalid payment data.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    flashRedirect(home, "error", "Invalid payment date format.");
  }

  const supabase = await getSupabase();

  const { data: branchData } = await supabase
    .from("branches")
    .select("id, name")
    .eq("id", branchId)
    .maybeSingle();

  const branch = branchData as { id: number; name: string | null } | null;

  if (!branch) {
    flashRedirect(home, "error", "Branch not found.");
  }

  const { data: paymentRows } = await supabase
    .from("booking_payments")
    .select(
      "jer_delivery_fee, jer_pickup_fee, bookings!booking_payments_booking_id_fkey!inner ( branch_id )",
    )
    .eq("bookings.branch_id", branchId);

  const totalOwed = (
    (paymentRows ?? []) as {
      jer_delivery_fee: number | null;
      jer_pickup_fee: number | null;
    }[]
  ).reduce(
    (sum, row) =>
      sum + Number(row.jer_delivery_fee ?? 0) + Number(row.jer_pickup_fee ?? 0),
    0,
  );

  const { data: remittanceRows } = await supabase
    .from("staff_fee_remittances")
    .select("amount")
    .eq("branch_id", branchId);

  const totalPaid = ((remittanceRows ?? []) as { amount: number | null }[]).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  const balance = totalOwed - totalPaid;

  if (balance <= 0) {
    flashRedirect(home, "error", "This branch has no outstanding staff fees.");
  }

  if (value > balance + 0.005) {
    flashRedirect(
      home,
      "error",
      `Payment amount exceeds the outstanding balance of ${peso(balance)}.`,
    );
  }

  const { data: inserted, error } = await supabase
    .from("staff_fee_remittances")
    .insert({
      branch_id: branchId,
      amount: value,
      payment_date: paymentDate,
      notes: notes || null,
      recorded_by: session.userId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    flashRedirect(home, "error", `Failed to record payment: ${error.message}`);
  }

  const remittanceId = (inserted as { id: number } | null)?.id ?? 0;

  const { attached, skipped } = remittanceId
    ? await attachProofs({
        remittanceId,
        prefix: "staffremit",
        table: "staff_fee_remittance_photos",
        files: proofs(formData),
      })
    : { attached: 0, skipped: 0 };

  const newBalance = balance - value;

  let message = `Payment of ${peso(value)} recorded for ${branch.name ?? "branch"}.`;

  message +=
    newBalance <= 0.005
      ? " This branch is now fully settled."
      : ` Remaining balance: ${peso(newBalance)}.`;

  message += proofSuffix(attached, skipped);

  revalidateRemittances();
  flashRedirect(home, "success", message);
}

export async function deleteStaffRemittanceAction(formData: FormData) {
  await requireRole("admin");

  const remittanceId = int(formData, "remittance_id");
  const home = "/admin/remittance";

  if (remittanceId <= 0) {
    flashRedirect(home, "error", "Invalid remittance.");
  }

  const supabase = await getSupabase();

  const { data: remittance } = await supabase
    .from("staff_fee_remittances")
    .select("id, branch_id, amount, payment_date, branches!staff_fee_remittances_branch_id_fkey ( name )")
    .eq("id", remittanceId)
    .maybeSingle();

  const row = remittance as
    | {
        id: number;
        branch_id: number | null;
        amount: number | null;
        payment_date: string | null;
        branches: { name: string | null } | { name: string | null }[] | null;
      }
    | null;

  if (!row) {
    flashRedirect(home, "error", "Remittance not found.");
  }

  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;

  const { data: photoRows } = await supabase
    .from("staff_fee_remittance_photos")
    .select("id, file_name")
    .eq("remittance_id", remittanceId);

  const photos = (photoRows ?? []) as { id: number; file_name: string }[];

  for (const photo of photos) {
    await removeFile(
      supabase,
      BUCKETS.remittancePhotos,
      remittancePhotoKey(photo.file_name),
    );
  }

  await supabase
    .from("staff_fee_remittance_photos")
    .delete()
    .eq("remittance_id", remittanceId);

  const { error } = await supabase
    .from("staff_fee_remittances")
    .delete()
    .eq("id", remittanceId);

  if (error) {
    flashRedirect(home, "error", `Delete failed: ${error.message}`);
  }

  let message = `Remittance of ${peso(Number(row.amount ?? 0))} for ${branch?.name ?? "branch"} (${row.payment_date ?? ""}) has been deleted.`;

  if (photos.length) {
    message += ` ${photos.length} file${photos.length === 1 ? "" : "s"} removed.`;
  }

  revalidateRemittances();
  flashRedirect(home, "success", message);
}
