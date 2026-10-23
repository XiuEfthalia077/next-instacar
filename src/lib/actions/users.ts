"use server";

/**
 * User and branch server actions — the port of
 *   car-rental/pages/admin/process/user_actions.php
 *   car-rental/pages/admin/process/branch_actions.php
 *
 * Rules kept from the PHP app:
 *   - admin only
 *   - roles are whitelisted (`user`, `staff`, `operator`, `admin`)
 *   - an admin account never belongs to a branch (`branch_id = NULL`)
 *   - admin-created accounts are auto-verified
 *   - a new password is optional on update (blank keeps the current one)
 *   - an admin cannot delete their own account
 */

import { revalidatePath } from "next/cache";

import { getSupabase, requireRole } from "@/lib/auth";
import { flashRedirect } from "@/lib/flash";
import { getAdminClient } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["user", "staff", "operator", "admin"];

function str(form: FormData, key: string, fallback = ""): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function int(form: FormData, key: string, fallback = 0): number {
  const parsed = Number.parseInt(str(form, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roleValue(form: FormData): UserRole {
  const raw = str(form, "role");
  return ROLES.includes(raw as UserRole) ? (raw as UserRole) : "user";
}

function branchValue(form: FormData, role: UserRole): number | null {
  if (role === "admin") return null;

  const raw = str(form, "branch_id");
  if (raw === "" || raw === "0") return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function usersHome(role: UserRole) {
  return `/admin/users?role=${encodeURIComponent(role)}`;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export async function saveUserAction(formData: FormData) {
  await requireRole("admin");

  const userId = int(formData, "id");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const phone = str(formData, "phone");
  const password = str(formData, "password");
  const role = roleValue(formData);
  const branchId = branchValue(formData, role);

  if (!name || !email) {
    flashRedirect(usersHome(role), "error", "Name and e-mail are required.");
  }

  const supabase = await getSupabase();

  /* -------------------- create -------------------- */
  if (!userId) {
    if (!password) {
      flashRedirect(usersHome(role), "error", "Password is required.");
    }

    const admin = getAdminClient();

    if (!admin) {
      flashRedirect(
        usersHome(role),
        "error",
        "Account creation is not configured (missing service role key).",
      );
    }

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, role },
    });

    if (authError || !created.user) {
      flashRedirect(
        usersHome(role),
        "error",
        `Failed to create account: ${authError?.message ?? "unknown error"}`,
      );
    }

    // `public.users` is the master table. The database trigger mirrors the
    // bcrypt hash that GoTrue generated back into `users.password`.
    const { error } = await supabase.from("users").insert({
      auth_id: created.user.id,
      name,
      email,
      phone: phone || null,
      role,
      branch_id: branchId,
      is_verified: 1,
    });

    if (error) {
      // Roll the Supabase account back so a failed insert leaves no orphan.
      await admin.auth.admin.deleteUser(created.user.id);

      flashRedirect(usersHome(role), "error", `Failed to create account: ${error.message}`);
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/staff_manager");
    revalidatePath("/admin/branches");
    revalidatePath("/admin/dashboard");
    flashRedirect(usersHome(role), "success", "Account created successfully.");
  }

  /* -------------------- update -------------------- */
  const { data: existingData } = await supabase
    .from("users")
    .select("id, auth_id, role")
    .eq("id", userId)
    .maybeSingle();

  const existing = existingData as {
    id: number;
    auth_id: string | null;
    role: UserRole;
  } | null;

  if (!existing) {
    flashRedirect(usersHome(role), "error", "Account not found.");
  }

  const { error } = await supabase
    .from("users")
    .update({
      name,
      email,
      phone: phone || null,
      role,
      branch_id: branchId,
    })
    .eq("id", userId);

  if (error) {
    flashRedirect(usersHome(role), "error", `Update failed: ${error.message}`);
  }

  if (password) {
    const admin = getAdminClient();

    if (!admin || !existing.auth_id) {
      flashRedirect(
        usersHome(role),
        "warning",
        "Account updated, but the password could not be changed.",
      );
    }

    const { error: passwordError } = await admin.auth.admin.updateUserById(
      existing.auth_id,
      { password },
    );

    if (passwordError) {
      flashRedirect(
        usersHome(role),
        "error",
        `Account updated, but the password change failed: ${passwordError.message}`,
      );
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/staff_manager");
  revalidatePath("/admin/branches");
  revalidatePath("/admin/dashboard");
  flashRedirect(usersHome(role), "success", "Account updated successfully.");
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireRole("admin");

  const userId = int(formData, "id") || int(formData, "delete");
  const role = roleValue(formData);

  if (!userId) {
    flashRedirect(usersHome(role), "error", "Invalid account.");
  }

  if (userId === session.userId) {
    flashRedirect(
      usersHome(role),
      "error",
      "You cannot delete your own account while logged in!",
    );
  }

  const supabase = await getSupabase();

  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) {
    flashRedirect(usersHome(role), "error", `Delete failed: ${error.message}`);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/staff_manager");
  revalidatePath("/admin/branches");
  revalidatePath("/admin/dashboard");
  flashRedirect(usersHome(role), "success", "User deleted successfully.");
}

/* ------------------------------------------------------------------ */
/* Branches                                                            */
/* ------------------------------------------------------------------ */

export async function saveBranchAction(formData: FormData) {
  await requireRole("admin");

  const mode = str(formData, "action", "add");
  const branchId = int(formData, "id");
  const name = str(formData, "name");
  const address = str(formData, "address");
  const phone = str(formData, "phone");

  if (!name) {
    flashRedirect(
      "/admin/branches",
      "error",
      mode === "edit" ? "Invalid branch data." : "Branch name is required.",
    );
  }

  const supabase = await getSupabase();

  if (mode === "edit") {
    if (!branchId) {
      flashRedirect("/admin/branches", "error", "Invalid branch data.");
    }

    const { error } = await supabase
      .from("branches")
      .update({ name, address: address || null, phone: phone || null })
      .eq("id", branchId);

    if (error) {
      flashRedirect("/admin/branches", "error", `Failed to update branch: ${error.message}`);
    }

    revalidatePath("/admin/branches");
    flashRedirect("/admin/branches", "success", "Branch updated successfully.");
  }

  const { error } = await supabase.from("branches").insert({
    name,
    address: address || null,
    phone: phone || null,
    is_active: true,
  });

  if (error) {
    flashRedirect("/admin/branches", "error", `Failed to create branch: ${error.message}`);
  }

  revalidatePath("/admin/branches");
  flashRedirect("/admin/branches", "success", `Branch '${name}' created successfully.`);
}

export async function toggleBranchAction(formData: FormData) {
  await requireRole("admin");

  const branchId = int(formData, "id") || int(formData, "toggle");

  if (!branchId) {
    flashRedirect("/admin/branches", "error", "Invalid branch.");
  }

  const supabase = await getSupabase();

  const { data } = await supabase
    .from("branches")
    .select("id, is_active")
    .eq("id", branchId)
    .maybeSingle();

  const branch = data as { id: number; is_active: boolean } | null;

  if (!branch) {
    flashRedirect("/admin/branches", "error", "Branch not found.");
  }

  const { error } = await supabase
    .from("branches")
    .update({ is_active: !branch.is_active })
    .eq("id", branchId);

  if (error) {
    flashRedirect("/admin/branches", "error", `Update failed: ${error.message}`);
  }

  revalidatePath("/admin/branches");
  flashRedirect("/admin/branches", "success", "Branch status updated.");
}
