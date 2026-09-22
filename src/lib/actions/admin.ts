"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStaffSafetyCheck } from "@/lib/data";
import { ROLES, HOUSE_RESPONSIBILITIES, type HouseResponsibility } from "@/config/constants";
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
  const session = await requireAdmin();
  const supabase = await createClient();
  const name = getText(formData, "name");
  const code = getText(formData, "code");
  const capacityStr = getText(formData, "capacity");

  if (!name) {
    redirect("/admin/houses");
  }

  const capacity = capacityStr ? parseInt(capacityStr, 10) : 150;

  // Try inserting with code and capacity; fallback to basic columns
  let insertError = null;
  const { error: fullInsertError } = await supabase.from("houses").insert({
    name,
    code: code || name.slice(0, 3).toUpperCase(),
    capacity: isNaN(capacity) ? 150 : capacity,
    is_active: true,
  });

  if (fullInsertError && fullInsertError.message.includes("does not exist")) {
    const { error: basicError } = await supabase.from("houses").insert({
      name,
      is_active: true,
    });
    insertError = basicError;
  } else {
    insertError = fullInsertError;
  }

  if (insertError) {
    console.error("createHouseAction error:", insertError);
  } else {
    await supabase.from("audit_logs").insert({
      user_id: session.id,
      actor_role: session.role,
      action: "HOUSE_CREATED",
      module: "HOUSE",
      target_identifier: name,
      description: `Created new house "${name}" with capacity ${capacity}`,
      severity: "INFO",
      status: "SUCCESS",
    });
  }

  revalidatePath("/admin/houses");
  redirect("/admin/houses");
}

export async function updateHouseAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  const session = await requireAdmin();
  const supabase = await createClient();
  const id = getText(formData, "id");
  const name = getText(formData, "name");
  const code = getText(formData, "code");
  const capacityStr = getText(formData, "capacity");
  const isActive = formData.get("is_active") === "true" || formData.get("is_active") === "on";

  if (!id || !name) {
    return { success: false, message: "House ID and name are required." };
  }

  const capacity = capacityStr ? parseInt(capacityStr, 10) : 150;

  // Try updating with code and capacity; fallback if columns don't exist
  let updateError = null;
  const { error: fullUpdateError } = await supabase
    .from("houses")
    .update({
      name,
      code: code || name.slice(0, 3).toUpperCase(),
      capacity: isNaN(capacity) ? 150 : capacity,
      is_active: isActive,
    })
    .eq("id", id);

  if (fullUpdateError && fullUpdateError.message.includes("does not exist")) {
    const { error: basicError } = await supabase
      .from("houses")
      .update({
        name,
        is_active: isActive,
      })
      .eq("id", id);
    updateError = basicError;
  } else {
    updateError = fullUpdateError;
  }

  if (updateError) {
    console.error("updateHouseAction error:", updateError);
    return { success: false, message: "Failed to update house: " + updateError.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "HOUSE_UPDATED",
    module: "HOUSE",
    target_identifier: name,
    description: `Updated house settings for ${name} (capacity: ${capacity}, active: ${isActive})`,
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath("/admin/houses");
  return { success: true, message: `House ${name} updated successfully.` };
}

export async function rebalanceHousesAction(
  moves: {
    studentId: string;
    toHouseId: string;
    fromHouseId?: string | null;
    studentName?: string;
    jhsIndexNumber?: string;
  }[]
): Promise<{ success: boolean; message: string; movesApplied: number }> {
  const session = await requireAdmin();
  const supabase = await createClient();

  if (!moves || moves.length === 0) {
    return { success: false, message: "No moves provided for rebalancing.", movesApplied: 0 };
  }

  // 1. Try atomic PostgreSQL RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("rebalance_houses_atomic", {
      p_moves: moves,
      p_actor_id: session.id,
      p_actor_role: session.role,
    });

    if (!rpcError && rpcData?.success) {
      revalidatePath("/admin/houses");
      revalidatePath("/students");
      revalidatePath("/dashboard");
      revalidatePath("/admin/audit-logs");

      const applied = rpcData.moves_applied ?? moves.length;
      return {
        success: true,
        message: `Successfully executed atomic rebalancing. ${applied} student${applied === 1 ? "" : "s"} updated.`,
        movesApplied: applied,
      };
    }
    if (rpcError) {
      console.warn("rebalance_houses_atomic RPC unavailable or failed, utilizing fallback:", rpcError.message);
    }
  } catch (err) {
    console.warn("rebalance_houses_atomic exception, proceeding with transactional fallback:", err);
  }

  // 2. Resilient fallback execution with full audit logging
  // Pre-fetch houses to populate human-readable names
  const { data: housesList } = await supabase.from("houses").select("id, name");
  const houseMap = new Map((housesList || []).map((h) => [h.id, h.name]));

  // Pre-fetch students being moved
  const studentIds = moves.map((m) => m.studentId);
  const { data: studentsData } = await supabase
    .from("students")
    .select("id, jhs_index_number, first_name, last_name, gender, house_id")
    .in("id", studentIds);
  const studentMap = new Map((studentsData || []).map((s) => [s.id, s]));

  let applied = 0;
  let newAssignments = 0;
  let reassignments = 0;

  for (const move of moves) {
    const student = studentMap.get(move.studentId);
    const fromHouseId = student?.house_id ?? move.fromHouseId ?? null;
    const fromHouseName = fromHouseId ? houseMap.get(fromHouseId) ?? "Unknown House" : "Unassigned";
    const toHouseName = houseMap.get(move.toHouseId) ?? "Unknown House";
    const studentName = student ? `${student.first_name} ${student.last_name}` : move.studentName ?? "Student";
    const jhsIndexNumber = student?.jhs_index_number ?? move.jhsIndexNumber ?? "N/A";
    const isNew = !fromHouseId;

    const { error: updateError } = await supabase
      .from("students")
      .update({ house_id: move.toHouseId, updated_at: new Date().toISOString() })
      .eq("id", move.studentId);

    if (!updateError) {
      applied++;
      if (isNew) newAssignments++;
      else reassignments++;

      // Log per-student audit entry
      await supabase.from("audit_logs").insert({
        user_id: session.id,
        actor_role: session.role,
        action: isNew ? "STUDENT_HOUSE_ASSIGNED" : "STUDENT_HOUSE_REASSIGNED",
        entity_type: "students",
        entity_id: move.studentId,
        module: "HOUSE",
        target_identifier: jhsIndexNumber,
        description: isNew
          ? `Assigned student ${studentName} (${jhsIndexNumber}) to ${toHouseName} via automated rebalance.`
          : `Reassigned student ${studentName} (${jhsIndexNumber}) from ${fromHouseName} to ${toHouseName} via automated rebalance.`,
        before_data: { house_id: fromHouseId, house_name: fromHouseName },
        after_data: { house_id: move.toHouseId, house_name: toHouseName },
        metadata: {
          student_id: move.studentId,
          jhs_index_number: jhsIndexNumber,
          student_name: studentName,
          gender: student?.gender,
          from_house_id: fromHouseId,
          from_house_name: fromHouseName,
          to_house_id: move.toHouseId,
          to_house_name: toHouseName,
        },
        severity: "INFO",
        status: "SUCCESS",
      });
    }
  }

  // Master rebalance audit log entry
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "HOUSE_REBALANCED",
    entity_type: "houses",
    entity_id: null,
    module: "HOUSE",
    target_identifier: "ALL_HOUSES",
    description: `Executed automated house rebalancing across houses. Evaluated ${moves.length} students: ${applied} updated (${newAssignments} new assignments, ${reassignments} reassignments).`,
    severity: "INFO",
    status: applied === moves.length ? "SUCCESS" : "WARNING",
    metadata: {
      totalEvaluated: moves.length,
      applied,
      newAssignments,
      reassignments,
      timestamp: new Date().toISOString(),
    },
  });

  revalidatePath("/admin/houses");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/admin/audit-logs");

  return {
    success: true,
    message: `Successfully rebalanced houses. ${applied} student${applied === 1 ? "" : "s"} updated (${newAssignments} assigned, ${reassignments} reassigned).`,
    movesApplied: applied,
  };
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
  const additionalRolesValue = getText(formData, "additional_roles");
  const houseResponsibilityInput = getText(formData, "house_responsibility");
  const houseIdInput = getText(formData, "house_id") || null;

  if (!staffId || !ROLES.includes(newRole as never)) {
    return { success: false, message: "Invalid staff ID or role specified." };
  }

  let additionalRoles: (typeof ROLES)[number][] = [];
  try {
    const parsed = JSON.parse(additionalRolesValue || "[]");
    if (!Array.isArray(parsed) || parsed.some((role) => !ROLES.includes(role as never))) {
      return { success: false, message: "Invalid additional role selection." };
    }
    additionalRoles = parsed.filter((role): role is (typeof ROLES)[number] => role !== newRole);
  } catch {
    return { success: false, message: "Invalid additional role selection." };
  }

  const validResponsibility = HOUSE_RESPONSIBILITIES.includes(houseResponsibilityInput as never)
    ? (houseResponsibilityInput as HouseResponsibility)
    : null;

  // Check current profile
  const { data: currentProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("role, full_name, house_id, house_responsibility")
    .eq("id", staffId)
    .single();

  if (fetchError || !currentProfile) {
    return { success: false, message: "Staff account not found." };
  }

  const oldRole = currentProfile.role;
  const oldResponsibility = (currentProfile as { house_responsibility?: string | null }).house_responsibility;
  const oldHouseId = currentProfile.house_id;

  // Determine final house_id based on responsibility.
  // Senior house oversight is school-wide and does not require a specific house assignment.
  const isSeniorHouseResponsibility =
    validResponsibility === "senior_house_master" || validResponsibility === "senior_house_mistress";

  let finalHouseId: string | null = null;
  if (isSeniorHouseResponsibility) {
    finalHouseId = null;
  } else if (validResponsibility === "house_master" || validResponsibility === "house_mistress" || newRole === "house_master" || newRole === "house_mistress") {
    finalHouseId = houseIdInput;
    if (!finalHouseId) {
      return { success: false, message: "Please select a residential house for the House Master/Mistress responsibility." };
    }
  }

  // Update profile
  const updatePayload: {
    role: (typeof ROLES)[number];
    additional_roles: (typeof ROLES)[number][];
    house_responsibility: HouseResponsibility | null;
    house_id: string | null;
    updated_at: string;
  } = {
    role: newRole as (typeof ROLES)[number],
    additional_roles: additionalRoles,
    house_responsibility: validResponsibility,
    house_id: finalHouseId,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", staffId);

  if (updateError) {
    console.error("updateStaffRoleAction update error:", updateError);
    return { success: false, message: "Failed to update staff role and house assignment." };
  }

  // Manage house leadership in houses table
  // 1. Clear previous leadership if this staff was assigned to an old house
  if (oldHouseId && oldHouseId !== finalHouseId) {
    await supabase
      .from("houses")
      .update({ house_master_id: null })
      .eq("id", oldHouseId)
      .eq("house_master_id", staffId);

    await supabase
      .from("houses")
      .update({ house_mistress_id: null })
      .eq("id", oldHouseId)
      .eq("house_mistress_id", staffId);
  }

  // 2. Set new leadership if assigned to a specific house
  if (finalHouseId && (validResponsibility === "house_master" || validResponsibility === "house_mistress" || newRole === "house_master" || newRole === "house_mistress")) {
    const isMaster = validResponsibility === "house_master" || newRole === "house_master";
    const houseField = isMaster ? "house_master_id" : "house_mistress_id";
    await supabase.from("houses").update({ [houseField]: staffId }).eq("id", finalHouseId);
  }

  // Audit logging
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "ROLE_CHANGED",
    entity_type: "profiles",
    entity_id: staffId,
    module: "STAFF",
    target_identifier: staffId,
    description: `Staff ${currentProfile.full_name || "Account"} updated: Role=${newRole}, House Responsibility=${validResponsibility || "none"}, House=${finalHouseId || "all/none"}`,
    severity: "SECURITY",
    status: "SUCCESS",
    before_data: { role: oldRole, house_responsibility: oldResponsibility, house_id: oldHouseId },
    after_data: { role: newRole, house_responsibility: validResponsibility, house_id: finalHouseId },
  });

  revalidatePath("/admin/staff");
  revalidatePath("/admin/audit-logs");
  revalidatePath("/admin/houses");
  revalidatePath("/house/dashboard");
  revalidatePath("/house/students");
  revalidatePath("/house/exeats");
  revalidatePath("/it/dashboard");
  revalidatePath("/it/audit");

  const respLabel = validResponsibility ? ` with ${validResponsibility.replace(/_/g, " ").toUpperCase()} responsibility` : "";
  return {
    success: true,
    message: `Role for ${currentProfile.full_name} updated to ${newRole.replace(/_/g, " ").toUpperCase()}${respLabel}.`,
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

interface ServiceRoleStaffClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    delete: () => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
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

  // Fetch staff details for audit trail (before any mutation)
  const { data: staffProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", staffId)
    .single();

  if (fetchError || !staffProfile) {
    return { success: false, message: "Staff account not found." };
  }

  const staffName = staffProfile.full_name ?? "Unknown";
  const staffRole = String(staffProfile.role ?? "unknown");

  // Helper: write a blocked/failed deletion audit event without touching data
  async function auditBlockedAttempt(reason: string): Promise<void> {
    try {
      const { error: rpcErr } = await supabase.rpc("audit_failed_deletion_attempt", {
        p_staff_id:   staffId,
        p_actor_id:   session.id,
        p_actor_role: session.role,
        p_staff_name: staffName,
        p_staff_role: staffRole,
        p_reason:     reason,
      });

      if (rpcErr) {
        await supabase.from("audit_logs").insert({
          user_id: session.id,
          actor_role: session.role,
          action: "STAFF_DELETION_BLOCKED",
          module: "STAFF",
          target_identifier: staffId,
          description: `Permanent deletion blocked for: ${staffName} (${staffRole}). Reason: ${reason}`,
          severity: "CRITICAL",
          status: "FAILED",
          metadata: {
            reason,
            staff_id: staffId,
            staff_name: staffName,
            auth_deleted: false,
            profile_deleted: false,
          },
        });
      }
    } catch (e) {
      console.error("auditBlockedAttempt error:", e);
    }
  }

  // A. Business safety check — block if historical records reference this account
  const { data: safetyResult, error: checkError } = await supabase.rpc(
    "check_staff_deletion_safety",
    { p_staff_id: staffId }
  );

  if (checkError) {
    console.error("check_staff_deletion_safety error:", checkError);
    return {
      success: false,
      message: "Unable to verify deletion safety. Deactivate the account instead of permanent deletion.",
    };
  }

  if (safetyResult && !safetyResult.safe) {
    const reasons = Array.isArray(safetyResult.reasons)
      ? safetyResult.reasons.join(", ")
      : "Historical records exist";
    return {
      success: false,
      message: `Permanent deletion blocked: Account is referenced by ${safetyResult.total_references} historical record(s) (${reasons}). Please deactivate the account instead.`,
    };
  }

  // B. Verify a trusted server-side mechanism (Admin API) is available.
  //    createAdminClient() returns null when SUPABASE_SERVICE_ROLE_KEY is not configured.
  //    Without it we cannot guarantee auth.users deletion — block and surface the requirement.
  const adminClient = createAdminClient();
  if (!adminClient) {
    const reason =
      "SUPABASE_SERVICE_ROLE_KEY is not configured on this server. " +
      "Permanent deletion requires the Admin API to remove the authentication account. " +
      "Add SUPABASE_SERVICE_ROLE_KEY to the server environment variables (never NEXT_PUBLIC_) " +
      "and redeploy, or remove the user manually via the Supabase Authentication dashboard.";
    await auditBlockedAttempt("SERVICE_ROLE_KEY_NOT_CONFIGURED");
    return { success: false, message: reason };
  }

  const serviceClient = adminClient as unknown as ServiceRoleStaffClient;

  // C. Delete the authentication account via the Admin API.
  //    If this fails because the user is already deleted/not found, proceed to clean up profile.
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(staffId);

  let authAlreadyDeleted = false;
  if (authDeleteError) {
    const errorMsg = (authDeleteError.message || "").toLowerCase();
    const status = (authDeleteError as { status?: number }).status;
    if (
      errorMsg.includes("user not found") ||
      errorMsg.includes("not found") ||
      status === 404
    ) {
      console.warn(`Auth user ${staffId} not found in auth.users (already deleted). Proceeding to remove profile row.`);
      authAlreadyDeleted = true;
    } else {
      console.error("auth.admin.deleteUser error:", authDeleteError);
      const reason = `Admin API auth deletion failed: ${authDeleteError.message}`;
      await auditBlockedAttempt(reason);
      return {
        success: false,
        message:
          "Failed to delete the authentication account. The staff profile has NOT been removed. " +
          `Reason: ${authDeleteError.message}`,
      };
    }
  }

  // D. Auth account confirmed deleted (or already deleted). Now delete public.profiles and write audit log.
  //    Try the official finalize_staff_deletion RPC first with adminClient (service role)
  let finalizeResultMsg: string | null = null;
  const { data: finalizeResult, error: finalizeError } = await serviceClient.rpc(
    "finalize_staff_deletion",
    {
      p_staff_id:   staffId,
      p_actor_id:   session.id,
      p_actor_role: session.role,
      p_staff_name: staffName,
      p_staff_role: staffRole,
      p_status:     "SUCCESS",
    }
  );

  if (!finalizeError) {
    finalizeResultMsg = (finalizeResult as { message?: string })?.message ?? null;
  } else {
    // If the RPC failed (migration not applied, function missing, or permissions):
    console.warn("finalize_staff_deletion RPC failed or not present, executing direct service-role profile deletion:", finalizeError);

    const { error: directDeleteError } = await serviceClient
      .from("profiles")
      .delete()
      .eq("id", staffId);

    if (directDeleteError) {
      console.error("Direct profile deletion failed:", directDeleteError);
      await supabase.from("audit_logs").insert({
        user_id: session.id,
        actor_role: session.role,
        action: "STAFF_DELETED",
        module: "STAFF",
        target_identifier: staffId,
        description: `Failed to remove profile row for staff: ${staffName} (${staffRole}). Auth account was deleted.`,
        severity: "CRITICAL",
        status: "CRITICAL_PARTIAL",
        before_data: { id: staffId, full_name: staffName, role: staffRole },
        metadata: {
          auth_deleted: true,
          profile_deleted: false,
          error: directDeleteError.message,
        },
      });

      return {
        success: false,
        message:
          "The authentication account was deleted, but removing the profile row encountered a database error: " +
          directDeleteError.message,
      };
    }

    // Direct deletion succeeded — write authoritative audit log
    try {
      await supabase.from("audit_logs").insert({
        user_id: session.id,
        actor_role: session.role,
        action: "STAFF_DELETED",
        module: "STAFF",
        target_identifier: staffId,
        description: `Permanently deleted staff account: ${staffName} (${staffRole})`,
        severity: "CRITICAL",
        status: "SUCCESS",
        before_data: { id: staffId, full_name: staffName, role: staffRole },
        metadata: {
          auth_deleted: true,
          profile_deleted: true,
          auth_already_deleted: authAlreadyDeleted,
          direct_fallback: true,
        },
      });
    } catch (auditErr) {
      console.error("Failed to write staff deletion audit log:", auditErr);
    }
  }

  // E. Full success — both auth.users and public.profiles deleted.
  revalidatePath("/admin/staff");
  revalidatePath("/it/dashboard");
  revalidatePath("/it/audit");

  return {
    success: true,
    message:
      finalizeResultMsg ??
      `Staff account for ${staffName} has been permanently and fully deleted.`,
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

export async function updateStaffEmailAction(formData: FormData): Promise<StaffActionResult> {
  const session = await requireAdmin();

  const staffId = getText(formData, "staff_id");
  const newEmail = getText(formData, "email").toLowerCase().trim();

  if (!staffId) return { success: false, message: "Staff ID is required." };
  if (!newEmail || !newEmail.includes("@")) {
    return { success: false, message: "A valid email address is required." };
  }

  // Check email not already taken by another user
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", newEmail)
    .neq("id", staffId)
    .maybeSingle();

  if (existing) {
    return { success: false, message: "This email address is already assigned to another staff account." };
  }

  // Use admin client to update auth.users email (bypasses confirmation for admin-initiated change)
  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      success: false,
      message:
        "Server administration configuration error: SUPABASE_SERVICE_ROLE_KEY is required to update authentication email.",
    };
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(staffId, {
    email: newEmail,
    email_confirm: true, // admin-initiated, no confirmation required
  });

  if (authError) {
    console.error("updateStaffEmailAction auth error:", authError);
    return { success: false, message: "Failed to update email in authentication system: " + authError.message };
  }

  // Update profiles table
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ email: newEmail, updated_at: new Date().toISOString() })
    .eq("id", staffId);

  if (profileError) {
    console.error("updateStaffEmailAction profile error:", profileError);
    // Auth was updated — log the partial failure
    return { success: false, message: "Email updated in auth but profile sync failed: " + profileError.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "STAFF_EMAIL_UPDATED",
    module: "STAFF",
    entity_type: "profiles",
    entity_id: staffId,
    target_identifier: staffId,
    description: `Admin updated staff email to ${newEmail}`,
    severity: "SECURITY",
    status: "SUCCESS",
    after_data: { email: newEmail },
  });

  revalidatePath("/admin/staff");
  return { success: true, message: `Email successfully updated to ${newEmail}.` };
}
