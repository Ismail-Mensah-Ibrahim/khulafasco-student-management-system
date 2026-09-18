"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHouseStaff, requireAdmin } from "@/lib/dal";

/**
 * Issue a new exeat (leave of absence) for a student in the staff's house.
 */
export async function createHouseExeatAction(formData: FormData): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const session = await requireHouseStaff();
    const supabase = await createClient();

    const studentId = formData.get("student_id") as string;
    const houseId = formData.get("house_id") as string;
    const reason = (formData.get("reason") as string)?.trim();
    const departureDate = (formData.get("departure_date") as string) || new Date().toISOString().split("T")[0];
    const expectedReturnDate = (formData.get("expected_return_date") as string)?.trim();
    const parentContacted = formData.get("parent_contacted") === "true" || formData.get("parent_contacted") === "on";
    const remarks = (formData.get("remarks") as string)?.trim() || null;

    if (!studentId || !houseId || !reason || !expectedReturnDate) {
      return { success: false, error: "Missing required fields for exeat issuance." };
    }

    // Strict security check:
    // If caller is house_master or house_mistress, they can ONLY issue exeats for their assigned house
    if (session.role === "house_master" || session.role === "house_mistress") {
      if (!session.houseId || session.houseId !== houseId) {
        return { success: false, error: "Unauthorized: You may only manage students in your assigned house." };
      }
    }

    // Verify student belongs to this house
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, jhs_index_number, first_name, last_name, house_id")
      .eq("id", studentId)
      .single();

    if (studentError || !student || student.house_id !== houseId) {
      return { success: false, error: "Student does not belong to this house or does not exist." };
    }

    // Insert exeat record
    const { data: inserted, error: insertError } = await supabase
      .from("house_exeats")
      .insert({
        student_id: studentId,
        house_id: houseId,
        issued_by: session.id,
        reason,
        departure_date: departureDate,
        expected_return_date: expectedReturnDate,
        status: "active",
        parent_contacted: parentContacted,
        remarks,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("createHouseExeatAction insert error:", insertError);
      return { success: false, error: "Failed to create exeat record: " + insertError.message };
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: session.id,
      actor_role: session.role,
      action: "HOUSE_EXEAT_ISSUED",
      entity_type: "house_exeats",
      entity_id: inserted?.id,
      module: "HOUSE",
      target_identifier: student.jhs_index_number,
      description: `Issued exeat for ${student.first_name} ${student.last_name}`,
      severity: "INFO",
      status: "SUCCESS",
      metadata: {
        exeat_id: inserted?.id,
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        house_id: houseId,
        expected_return_date: expectedReturnDate,
        issued_by: session.fullName,
      },
    });

    revalidatePath("/house/dashboard");
    revalidatePath("/house/exeats");
    revalidatePath("/house/students");

    return { success: true, message: `Exeat issued successfully for ${student.first_name} ${student.last_name}.` };
  } catch (error) {
    console.error("createHouseExeatAction unexpected error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

/**
 * Mark a student returned from exeat.
 */
export async function returnHouseExeatAction(exeatId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const session = await requireHouseStaff();
    const supabase = await createClient();

    const { data: exeat, error: findError } = await supabase
      .from("house_exeats")
      .select("*, student:students(jhs_index_number, first_name, last_name)")
      .eq("id", exeatId)
      .single();

    if (findError || !exeat) {
      return { success: false, error: "Exeat record not found." };
    }

    // Strict security check
    if (session.role === "house_master" || session.role === "house_mistress") {
      if (!session.houseId || session.houseId !== exeat.house_id) {
        return { success: false, error: "Unauthorized: You may only manage students in your assigned house." };
      }
    }

    const actualReturnDate = new Date().toISOString().split("T")[0];

    const { error: updateError } = await supabase
      .from("house_exeats")
      .update({
        status: "returned",
        actual_return_date: actualReturnDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exeatId);

    if (updateError) {
      return { success: false, error: "Failed to update exeat: " + updateError.message };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = exeat.student as any;

    await supabase.from("audit_logs").insert({
      user_id: session.id,
      actor_role: session.role,
      action: "HOUSE_EXEAT_RETURNED",
      entity_type: "house_exeats",
      entity_id: exeatId,
      module: "HOUSE",
      target_identifier: student?.jhs_index_number || exeat.id,
      description: `Student ${student ? `${student.first_name} ${student.last_name}` : ""} returned from exeat`,
      severity: "INFO",
      status: "SUCCESS",
      metadata: {
        exeat_id: exeatId,
        student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
        returned_date: actualReturnDate,
        marked_by: session.fullName,
      },
    });

    revalidatePath("/house/dashboard");
    revalidatePath("/house/exeats");

    return { success: true, message: "Student marked as returned to house." };
  } catch (error) {
    console.error("returnHouseExeatAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

/**
 * Assign staff member to a house (Admin Only).
 */
export async function assignStaffToHouseAction(
  staffId: string,
  houseId: string | null,
  role?: "house_master" | "house_mistress"
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const session = await requireAdmin();
    const supabase = await createClient();

    const updatePayload: { house_id: string | null; role?: string } = {
      house_id: houseId,
    };
    if (role) {
      updatePayload.role = role;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", staffId);

    if (profileError) {
      return { success: false, error: "Failed to update staff house: " + profileError.message };
    }

    // If houseId is provided and role is house_master or house_mistress, also update houses table links
    if (houseId && role) {
      const houseUpdate: Record<string, string | null> = {};
      if (role === "house_master") {
        houseUpdate.house_master_id = staffId;
      } else if (role === "house_mistress") {
        houseUpdate.house_mistress_id = staffId;
      }

      await supabase.from("houses").update(houseUpdate).eq("id", houseId);
    }

    await supabase.from("audit_logs").insert({
      user_id: session.id,
      actor_role: session.role,
      action: "STAFF_HOUSE_ASSIGNED",
      entity_type: "profiles",
      entity_id: staffId,
      module: "HOUSE",
      target_identifier: staffId,
      description: `Staff assigned to house`,
      severity: "INFO",
      status: "SUCCESS",
      metadata: {
        staff_id: staffId,
        house_id: houseId,
        assigned_role: role || "unaltered",
        assigned_by: session.fullName,
      },
    });

    revalidatePath("/admin/staff");
    revalidatePath("/admin/houses");
    revalidatePath("/house/dashboard");

    return { success: true, message: "Staff house assignment updated successfully." };
  } catch (error) {
    console.error("assignStaffToHouseAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
