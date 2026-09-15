"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getStaffSafetyCheck } from "@/lib/data";
import { ROLES } from "@/config/constants";
import type { StaffDeletionSafety } from "@/types";

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: string): string | null {
  return value ? value : null;
}

export async function createAcademicYearAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const name = getText(formData, "name");
  const start_date = getText(formData, "start_date");
  const end_date = getText(formData, "end_date");

  if (!name || !start_date || !end_date) {
    redirect("/admin/academic-years");
  }

  const { error } = await supabase.from("academic_years").insert({
    name,
    start_date,
    end_date,
    is_current: false,
  });

  if (error) {
    console.error("createAcademicYearAction error:", error);
  }

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function setCurrentAcademicYearAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const id = getText(formData, "academic_year_id");

  if (!id) {
    redirect("/admin/academic-years");
  }

  const { error: clearError } = await supabase.from("academic_years").update({ is_current: false });
  if (clearError) {
    console.error("setCurrentAcademicYearAction clear error:", clearError);
    redirect("/admin/academic-years");
  }

  const { error } = await supabase.from("academic_years").update({ is_current: true }).eq("id", id);
  if (error) {
    console.error("setCurrentAcademicYearAction select error:", error);
    redirect("/admin/academic-years");
  }

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function updateAcademicYearAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const id = getText(formData, "academic_year_id");
  const name = getText(formData, "name");
  const start_date = getText(formData, "start_date");
  const end_date = getText(formData, "end_date");

  if (!id || !name || !start_date || !end_date) {
    redirect("/admin/academic-years");
  }

  const { error } = await supabase
    .from("academic_years")
    .update({ name, start_date, end_date })
    .eq("id", id);

  if (error) {
    console.error("updateAcademicYearAction error:", error);
    redirect("/admin/academic-years");
  }

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function deleteAcademicYearAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const id = getText(formData, "academic_year_id");
  if (!id) {
    redirect("/admin/academic-years");
  }

  const { data: rowToDelete, error: fetchError } = await supabase
    .from("academic_years")
    .select("id, is_current")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("deleteAcademicYearAction fetch error:", fetchError);
    redirect("/admin/academic-years");
  }

  const { error: deleteError } = await supabase.from("academic_years").delete().eq("id", id);
  if (deleteError) {
    console.error("deleteAcademicYearAction delete error:", deleteError);
    redirect("/admin/academic-years");
  }

  if (rowToDelete?.is_current) {
    const { data: fallbackYear, error: fallbackError } = await supabase
      .from("academic_years")
      .select("id")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fallbackError && fallbackYear?.id) {
      await supabase.from("academic_years").update({ is_current: false });
      await supabase.from("academic_years").update({ is_current: true }).eq("id", fallbackYear.id);
    }
  }

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function createHouseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const name = getText(formData, "name");

  if (!name) {
    redirect("/admin/houses");
  }

  const { error } = await supabase.from("houses").insert({ name });

  if (error) {
    console.error("createHouseAction error:", error);
  }

  revalidatePath("/admin/houses");
  redirect("/admin/houses");
}

export async function createProgramAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const name = getText(formData, "name");
  const code = getText(formData, "code");

  if (!name) {
    redirect("/admin/programs");
  }

  const { error } = await supabase.from("programs").insert({ name, code: code || name.slice(0, 8).toUpperCase() });

  if (error) {
    console.error("createProgramAction error:", error);
  }

  revalidatePath("/admin/programs");
  redirect("/admin/programs");
}

export async function createFeeTypeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const name = getText(formData, "name");
  const description = normalizeOptionalText(getText(formData, "description"));

  if (!name) {
    redirect("/admin/fee-types");
  }

  const { error } = await supabase.from("fee_types").insert({
    name,
    description,
    is_active: true,
  });

  if (error) {
    console.error("createFeeTypeAction error:", error);
  }

  revalidatePath("/admin/fee-types");
  redirect("/admin/fee-types");
}

export async function createStaffAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const full_name = getText(formData, "full_name");
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const phone = normalizeOptionalText(getText(formData, "phone"));
  const role = getText(formData, "role");

  if (!full_name || !email || !password || !ROLES.includes(role as never)) {
    redirect("/admin/staff");
  }

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role,
        phone,
        is_active: true,
      },
    },
  });

  if (signUpError || !authData.user) {
    console.error("createStaffAction signUp error:", signUpError);
    redirect("/admin/staff");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: authData.user.id,
      full_name,
      role: role as (typeof ROLES)[number],
      phone,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (profileError) {
    console.error("createStaffAction profile upsert error:", profileError);
  }

  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}

export type StaffActionResult =
  | { success: true; message: string; warning?: string }
  | { success: false; message: string };

export async function updateStaffRoleAction(formData: FormData): Promise<StaffActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const staffId = getText(formData, "staff_id");
  const newRole = getText(formData, "role");

  if (!staffId || !ROLES.includes(newRole as never)) {
    return { success: false, message: "Invalid staff ID or role specified." };
  }

  // Check current profile
  const { data: currentProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", staffId)
    .single();

  if (fetchError || !currentProfile) {
    return { success: false, message: "Staff account not found." };
  }

  const oldRole = currentProfile.role;

  // Try authoritative database RPC first
  const { error: rpcError } = await supabase.rpc("update_staff_role", {
    p_staff_id: staffId,
    p_new_role: newRole,
  });

  if (rpcError) {
    console.warn("update_staff_role RPC fallback to direct update:", rpcError);
    // Fallback: direct update + audit log
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole as (typeof ROLES)[number], updated_at: new Date().toISOString() })
      .eq("id", staffId);

    if (updateError) {
      console.error("updateStaffRoleAction update error:", updateError);
      return { success: false, message: "Failed to update staff role." };
    }

    await supabase.from("audit_logs").insert({
      user_id: session.id,
      actor_role: session.role,
      action: "ROLE_CHANGED",
      module: "STAFF",
      target_identifier: staffId,
      description: `Role for ${currentProfile.full_name || "Staff"} changed from ${oldRole} to ${newRole}`,
      severity: "SECURITY",
      status: "SUCCESS",
      before_data: { role: oldRole },
      after_data: { role: newRole },
    });
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/audit-logs");
  revalidatePath("/it/dashboard");
  revalidatePath("/it/audit");

  return {
    success: true,
    message: `Role for ${currentProfile.full_name} updated to ${newRole.replace("_", " ").toUpperCase()}.`,
  };
}

export async function toggleStaffActiveAction(formData: FormData): Promise<StaffActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const staffId = getText(formData, "staff_id");
  const activeStr = getText(formData, "active");
  const shouldBeActive = activeStr === "true";

  if (!staffId) {
    return { success: false, message: "Staff ID is required." };
  }

  if (staffId === session.id) {
    return { success: false, message: "You cannot deactivate your own active administrator account." };
  }

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("full_name, is_active")
    .eq("id", staffId)
    .single();

  if (fetchError || !profile) {
    return { success: false, message: "Staff profile not found." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ is_active: shouldBeActive, updated_at: new Date().toISOString() })
    .eq("id", staffId);

  if (updateError) {
    console.error("toggleStaffActiveAction error:", updateError);
    return { success: false, message: "Failed to update staff status." };
  }

  const actionName = shouldBeActive ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED";
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: actionName,
    module: "STAFF",
    target_identifier: staffId,
    description: `${shouldBeActive ? "Activated" : "Deactivated"} staff account for ${profile.full_name}`,
    severity: "WARNING",
    status: "SUCCESS",
    before_data: { is_active: profile.is_active },
    after_data: { is_active: shouldBeActive },
  });

  revalidatePath("/admin/staff");
  revalidatePath("/it/dashboard");
  revalidatePath("/it/audit");

  return {
    success: true,
    message: `Staff account for ${profile.full_name} is now ${shouldBeActive ? "Active" : "Disabled"}.`,
  };
}

export async function safeDeleteStaffAction(formData: FormData): Promise<StaffActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const staffId = getText(formData, "staff_id");

  if (!staffId) {
    return { success: false, message: "Staff ID is required." };
  }

  if (staffId === session.id) {
    return { success: false, message: "You cannot delete your own active administrator account." };
  }

  // Run safety check first
  const { data: safetyResult, error: checkError } = await supabase.rpc("check_staff_deletion_safety", {
    p_staff_id: staffId,
  });

  if (checkError) {
    console.error("check_staff_deletion_safety error:", checkError);
    return {
      success: false,
      message: "Unable to verify deletion safety. Deactivate the account instead of permanent deletion.",
    };
  }

  if (safetyResult && !safetyResult.safe) {
    const reasons = Array.isArray(safetyResult.reasons) ? safetyResult.reasons.join(", ") : "Historical records exist";
    return {
      success: false,
      message: `Permanent deletion blocked: Account is referenced by ${safetyResult.total_references} historical record(s) (${reasons}). Please deactivate the account instead.`,
    };
  }

  // Safe to delete - invoke delete_staff_account RPC
  const { data: delResult, error: delError } = await supabase.rpc("delete_staff_account", {
    p_staff_id: staffId,
  });

  if (delError) {
    console.error("delete_staff_account error:", delError);
    return {
      success: false,
      message: delError.message || "Failed to permanently delete staff account.",
    };
  }

  revalidatePath("/admin/staff");
  revalidatePath("/it/dashboard");
  revalidatePath("/it/audit");

  // The RPC returns auth_deleted: false when the profile was removed but the
  // underlying auth.users row could not be deleted (requires service role access).
  // This is a partial-success state — the staff member can no longer log in via
  // the application (profile gone) but their auth credential may still exist.
  // Surface this distinction so the admin can take manual action if needed.
  if (delResult && delResult.auth_deleted === false) {
    return {
      success: true,
      message: delResult.message,
      warning:
        "The staff profile has been removed from the system, but the authentication account " +
        "could not be deleted automatically. Please remove it manually via the " +
        "Supabase Authentication dashboard to prevent an orphaned credential.",
    };
  }

  return {
    success: true,
    message: delResult?.message || "Staff account has been permanently removed.",
  };
}

export async function updateStaffProfileAction(formData: FormData): Promise<StaffActionResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const staffId = getText(formData, "staff_id");
  const fullName = getText(formData, "full_name");
  const phone = normalizeOptionalText(getText(formData, "phone"));

  if (!staffId || !fullName) {
    return { success: false, message: "Staff ID and name are required." };
  }

  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", staffId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staffId);

  if (error) {
    console.error("updateStaffProfileAction error:", error);
    return { success: false, message: "Failed to update staff profile." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "STAFF_UPDATED",
    module: "STAFF",
    target_identifier: staffId,
    description: `Updated profile details for ${fullName}`,
    severity: "INFO",
    status: "SUCCESS",
    before_data: oldProfile || {},
    after_data: { full_name: fullName, phone },
  });

  revalidatePath("/admin/staff");
  return { success: true, message: `Profile for ${fullName} updated successfully.` };
}

export async function initiateStaffPasswordResetAction(formData: FormData): Promise<StaffActionResult> {
  const session = await requireAdmin();
  const email = getText(formData, "email").toLowerCase();

  if (!email || !email.includes("@")) {
    return { success: false, message: "Valid staff email address is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://khulafasco-sms.vercel.app"}/login`,
  });

  if (error) {
    console.error("initiateStaffPasswordResetAction error:", error);
    return { success: false, message: "Unable to dispatch password reset email." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "PASSWORD_RESET_INITIATED",
    module: "AUTH",
    target_identifier: email,
    description: `Admin initiated secure password reset dispatch for ${email}`,
    severity: "SECURITY",
    status: "SUCCESS",
  });

  return {
    success: true,
    message: `Password reset instructions have been dispatched securely to ${email}.`,
  };
}

export async function checkStaffSafetyAction(staffId: string): Promise<StaffDeletionSafety> {
  await requireAdmin();
  return await getStaffSafetyCheck(staffId);
}
