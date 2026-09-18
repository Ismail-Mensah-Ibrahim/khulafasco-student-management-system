"use server";

import { revalidatePath } from "next/cache";
import {
  requireAcademicOrAdmin,
  requireFinanceOrAdmin,
  requireHeadmaster,
  requireStaff,
  requireAdmin,
} from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getHouseDistributionData, assignBalancedHouse } from "@/lib/services/house-allocation";
import type { StudentTransfer, TransferDirection, TransferStatus } from "@/types";
import { normalizeIndexNumber } from "@/lib/utils";

export type TransferActionResult =
  | { success: true; message: string; transferId?: string; reference?: string }
  | { success: false; message: string };

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function generateReference(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("generate_transfer_reference");
    if (!error && data) return String(data);
  } catch (err) {
    console.warn("generate_transfer_reference RPC fallback:", err);
  }
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `STP-${year}-${rand}`;
}

// ---------------------------------------------------------------------------
// 1. CREATE TRANSFER-IN ACTION
// ---------------------------------------------------------------------------
export async function createTransferInAction(formData: FormData): Promise<TransferActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const jhsIndexRaw = getText(formData, "jhs_index_number");
  const jhsIndex = normalizeIndexNumber(jhsIndexRaw);
  const firstName = getText(formData, "first_name");
  const middleName = getText(formData, "middle_name") || null;
  const lastName = getText(formData, "last_name");
  const gender = getText(formData, "gender") as "male" | "female";
  const dob = getText(formData, "date_of_birth") || null;
  const previousSchool = getText(formData, "previous_school");
  const previousForm = getText(formData, "previous_form") || null;
  const previousClass = getText(formData, "previous_class") || null;
  const previousYear = getText(formData, "previous_academic_year") || null;

  const targetYearId = getText(formData, "target_academic_year_id");
  const targetSemesterId = getText(formData, "target_semester_id") || null;
  const targetForm = getText(formData, "target_form") || "Form 1";
  const targetProgramId = getText(formData, "target_program_id") || null;
  const targetClassId = getText(formData, "target_class_id") || null;
  const targetHouseId = getText(formData, "target_house_id") || null;

  const reason = getText(formData, "reason");
  const documentationNotes = getText(formData, "documentation_notes") || null;
  const remarks = getText(formData, "remarks") || null;

  if (!jhsIndex || !firstName || !lastName || !gender || !previousSchool || !targetYearId) {
    return {
      success: false,
      message: "Index number, student name, gender, previous school, and target academic year are required.",
    };
  }

  // Check if student with this index already exists in Khulafasco
  const { data: existingStudent } = await supabase
    .from("students")
    .select("id, enrollment_status")
    .eq("jhs_index_number", jhsIndex)
    .single();

  if (existingStudent && existingStudent.enrollment_status === "active") {
    return {
      success: false,
      message: `A student with JHS Index ${jhsIndex} is already actively enrolled at Khulafasco. Use Transfer-Out or Promotion instead.`,
    };
  }

  const transferReference = await generateReference(supabase);

  const { data: transferRecord, error } = await supabase
    .from("student_transfers")
    .insert({
      transfer_reference: transferReference,
      direction: "transfer_in",
      student_id: existingStudent?.id || null,
      jhs_index_number: jhsIndex,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      gender,
      date_of_birth: dob,
      previous_school: previousSchool,
      transfer_date: new Date().toISOString().slice(0, 10),
      previous_form: previousForm,
      previous_class: previousClass,
      previous_academic_year: previousYear,
      target_academic_year_id: targetYearId,
      target_semester_id: targetSemesterId,
      target_form: targetForm,
      target_program_id: targetProgramId,
      target_class_id: targetClassId,
      target_house_id: targetHouseId,
      reason,
      documentation_notes: documentationNotes,
      remarks,
      status: "submitted",
      created_by: session.id,
    })
    .select()
    .single();

  if (error || !transferRecord) {
    console.error("createTransferInAction error:", error);
    return { success: false, message: "Failed to create transfer-in request." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TRANSFER_CREATED",
    module: "STUDENT",
    target_identifier: transferReference,
    description: `Created Transfer-In application (${transferReference}) for ${firstName} ${lastName} from ${previousSchool}`,
    severity: "INFO",
    status: "SUCCESS",
    after_data: transferRecord,
  });

  revalidatePath("/students/transfers");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Transfer-In application registered successfully with reference ${transferReference}.`,
    transferId: transferRecord.id,
    reference: transferReference,
  };
}

// ---------------------------------------------------------------------------
// 2. CREATE TRANSFER-OUT ACTION
// ---------------------------------------------------------------------------
export async function createTransferOutAction(formData: FormData): Promise<TransferActionResult> {
  const session = await requireStaff();
  const supabase = await createClient();

  const studentId = getText(formData, "student_id");
  const destinationSchool = getText(formData, "destination_school");
  const reason = getText(formData, "reason");
  const documentationNotes = getText(formData, "documentation_notes") || null;
  const remarks = getText(formData, "remarks") || null;

  if (!studentId || !destinationSchool || !reason) {
    return {
      success: false,
      message: "Student selection, destination school, and transfer reason are required.",
    };
  }

  // Fetch student details
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      id, jhs_index_number, first_name, middle_name, last_name, gender, date_of_birth,
      program_id, house_id, academic_year_id, enrollment_status
    `)
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return { success: false, message: "Student record not found." };
  }

  if (student.enrollment_status !== "active") {
    return {
      success: false,
      message: `Student status is "${student.enrollment_status}". Only active students can be transferred out.`,
    };
  }

  // Fetch student's latest academic enrollment
  const { data: enrollment } = await supabase
    .from("student_academic_enrollments")
    .select("level, class_id, academic_year_id, class:classes(name)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Calculate financial status (total fee charges vs payments)
  let totalDue = 0;
  let totalPaid = 0;
  let balance = 0;

  try {
    const [{ data: charges }, { data: payments }] = await Promise.all([
      supabase.from("student_fee_charges").select("amount_due").eq("student_id", studentId),
      supabase.from("payments").select("amount").eq("student_id", studentId),
    ]);

    totalDue = charges?.reduce((sum: number, c: { amount_due: number }) => sum + Number(c.amount_due || 0), 0) ?? 0;
    totalPaid = payments?.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount || 0), 0) ?? 0;
    balance = Math.max(0, totalDue - totalPaid);
  } catch (finErr) {
    console.warn("Transfer-out fee calculation warning:", finErr);
  }

  const transferReference = await generateReference(supabase);

  const { data: transferRecord, error } = await supabase
    .from("student_transfers")
    .insert({
      transfer_reference: transferReference,
      direction: "transfer_out",
      student_id: student.id,
      jhs_index_number: student.jhs_index_number,
      first_name: student.first_name,
      middle_name: student.middle_name,
      last_name: student.last_name,
      gender: student.gender,
      date_of_birth: student.date_of_birth,
      destination_school: destinationSchool,
      transfer_date: new Date().toISOString().slice(0, 10),
      previous_form: enrollment?.level || "Form 1",
      previous_class: (enrollment?.class as any)?.name || null,
      previous_academic_year: enrollment?.academic_year_id || student.academic_year_id,
      reason,
      documentation_notes: documentationNotes,
      remarks,
      status: "submitted",
      finance_total_due: totalDue,
      finance_total_paid: totalPaid,
      finance_balance: balance,
      finance_clearance_status: balance === 0 ? "cleared" : "pending",
      created_by: session.id,
    })
    .select()
    .single();

  if (error || !transferRecord) {
    console.error("createTransferOutAction error:", error);
    return { success: false, message: "Failed to register transfer-out request." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TRANSFER_CREATED",
    module: "STUDENT",
    target_identifier: transferReference,
    description: `Initiated Transfer-Out request (${transferReference}) for ${student.first_name} ${student.last_name} to ${destinationSchool}. Outstanding Balance: GH₵${balance.toFixed(2)}`,
    severity: "INFO",
    status: "SUCCESS",
    after_data: transferRecord,
  });

  revalidatePath("/students/transfers");

  return {
    success: true,
    message: `Transfer-Out request submitted successfully with reference ${transferReference}.`,
    transferId: transferRecord.id,
    reference: transferReference,
  };
}

// ---------------------------------------------------------------------------
// 3. VERIFY ACADEMIC CLEARANCE ACTION
// ---------------------------------------------------------------------------
export async function verifyAcademicTransferAction(formData: FormData): Promise<TransferActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const transferId = getText(formData, "transfer_id");
  const status = getText(formData, "status") as "cleared" | "flagged";
  const notes = getText(formData, "notes") || null;

  if (!transferId || !status) {
    return { success: false, message: "Transfer ID and clearance status are required." };
  }

  const { data: transfer, error: fetchErr } = await supabase
    .from("student_transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (fetchErr || !transfer) {
    return { success: false, message: "Transfer record not found." };
  }

  const { error } = await supabase
    .from("student_transfers")
    .update({
      academic_clearance_status: status,
      academic_clearance_notes: notes,
      academic_cleared_by: session.id,
      academic_cleared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);

  if (error) {
    return { success: false, message: "Failed to update academic clearance." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TRANSFER_ACADEMIC_VERIFIED",
    module: "ACADEMIC",
    target_identifier: transfer.transfer_reference,
    description: `Academic clearance ${status.toUpperCase()} for transfer ${transfer.transfer_reference} by ${session.fullName}`,
    severity: status === "cleared" ? "INFO" : "WARNING",
    status: "SUCCESS",
  });

  revalidatePath(`/students/transfers/${transferId}`);
  revalidatePath("/students/transfers");

  return { success: true, message: `Academic clearance marked as ${status}.` };
}

// ---------------------------------------------------------------------------
// 4. VERIFY FINANCE CLEARANCE ACTION
// ---------------------------------------------------------------------------
export async function verifyFinanceTransferAction(formData: FormData): Promise<TransferActionResult> {
  const session = await requireFinanceOrAdmin();
  const supabase = await createClient();

  const transferId = getText(formData, "transfer_id");
  const status = getText(formData, "status") as "cleared" | "flagged" | "waived";
  const notes = getText(formData, "notes") || null;

  if (!transferId || !status) {
    return { success: false, message: "Transfer ID and financial clearance status are required." };
  }

  const { data: transfer, error: fetchErr } = await supabase
    .from("student_transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (fetchErr || !transfer) {
    return { success: false, message: "Transfer record not found." };
  }

  const { error } = await supabase
    .from("student_transfers")
    .update({
      finance_clearance_status: status,
      finance_clearance_notes: notes,
      finance_cleared_by: session.id,
      finance_cleared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);

  if (error) {
    return { success: false, message: "Failed to update financial clearance." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TRANSFER_FINANCE_VERIFIED",
    module: "FINANCE",
    target_identifier: transfer.transfer_reference,
    description: `Financial clearance ${status.toUpperCase()} for transfer ${transfer.transfer_reference} by ${session.fullName}`,
    severity: status === "cleared" ? "INFO" : "WARNING",
    status: "SUCCESS",
  });

  revalidatePath(`/students/transfers/${transferId}`);
  revalidatePath("/students/transfers");

  return { success: true, message: `Financial clearance marked as ${status}.` };
}

// ---------------------------------------------------------------------------
// 5. APPROVE TRANSFER ACTION
// ---------------------------------------------------------------------------
export async function approveTransferAction(formData: FormData): Promise<TransferActionResult> {
  const session = await requireHeadmaster(); // Headmaster or Admin
  const supabase = await createClient();

  const transferId = getText(formData, "transfer_id");
  const remarks = getText(formData, "remarks") || null;

  if (!transferId) {
    return { success: false, message: "Transfer ID is required." };
  }

  const { data: transfer, error: fetchErr } = await supabase
    .from("student_transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (fetchErr || !transfer) {
    return { success: false, message: "Transfer record not found." };
  }

  // Segregation of duties: Creator cannot approve own transfer if other staff exists
  if (transfer.created_by === session.id && session.role !== "admin") {
    return {
      success: false,
      message: "Segregation of duties violation: You cannot approve a transfer you initiated.",
    };
  }

  const { error } = await supabase
    .from("student_transfers")
    .update({
      status: "approved",
      approved_by: session.id,
      remarks: remarks || transfer.remarks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);

  if (error) {
    return { success: false, message: "Failed to approve transfer." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TRANSFER_APPROVED",
    module: "STUDENT",
    target_identifier: transfer.transfer_reference,
    description: `Approved ${transfer.direction === "transfer_in" ? "Transfer-In" : "Transfer-Out"} (${transfer.transfer_reference}) by ${session.fullName}`,
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath(`/students/transfers/${transferId}`);
  revalidatePath("/students/transfers");

  return { success: true, message: "Transfer approved successfully." };
}

// ---------------------------------------------------------------------------
// 6. FINALIZE TRANSFER ENROLLMENT (TRANSFER-IN)
// ---------------------------------------------------------------------------
export async function finalizeTransferEnrollmentAction(formData: FormData): Promise<TransferActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const transferId = getText(formData, "transfer_id");
  if (!transferId) {
    return { success: false, message: "Transfer ID is required." };
  }

  const { data: transfer, error: fetchErr } = await supabase
    .from("student_transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (fetchErr || !transfer) {
    return { success: false, message: "Transfer record not found." };
  }

  if (transfer.direction !== "transfer_in") {
    return { success: false, message: "Only Transfer-In records can be enrolled." };
  }

  if (transfer.status !== "approved") {
    return { success: false, message: "Transfer must be approved before final enrollment." };
  }

  // Automatic balanced house allocation if no house chosen
  let allocatedHouseId = transfer.target_house_id;
  let allocatedHouseName = "";

  if (!allocatedHouseId) {
    try {
      const distributions = await getHouseDistributionData(supabase);
      const allocResult = assignBalancedHouse(transfer.gender as any, distributions);
      allocatedHouseId = allocResult.assignedHouseId;
      allocatedHouseName = allocResult.assignedHouseName;
    } catch (allocErr: any) {
      return { success: false, message: `House allocation error: ${allocErr.message}` };
    }
  }

  // Create or upsert student record
  const { data: studentRecord, error: studentError } = await supabase
    .from("students")
    .upsert(
      {
        jhs_index_number: transfer.jhs_index_number,
        first_name: transfer.first_name,
        middle_name: transfer.middle_name,
        last_name: transfer.last_name,
        gender: transfer.gender,
        date_of_birth: transfer.date_of_birth || "2008-01-01",
        previous_school: transfer.previous_school,
        program_id: transfer.target_program_id,
        house_id: allocatedHouseId,
        student_type: "day",
        academic_year_id: transfer.target_academic_year_id,
        enrollment_status: "active",
        parent_name: "Guardian",
        parent_relationship: "Guardian",
        parent_phone: "0200000000",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "jhs_index_number" }
    )
    .select("id")
    .single();

  if (studentError || !studentRecord) {
    console.error("finalizeTransferEnrollment student upsert error:", studentError);
    return { success: false, message: "Failed to create student profile for transfer." };
  }

  const studentId = studentRecord.id;

  // Create academic enrollment record
  await supabase.from("student_academic_enrollments").upsert(
    {
      student_id: studentId,
      academic_year_id: transfer.target_academic_year_id,
      semester_id: transfer.target_semester_id,
      level: transfer.target_form || "Form 1",
      class_id: transfer.target_class_id,
      enrollment_status: "active",
      promotion_status: "pending",
      created_by: session.id,
      updated_by: session.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,academic_year_id" }
  );

  // If class is assigned, record in student_class_assignments
  if (transfer.target_class_id) {
    await supabase.from("student_class_assignments").upsert(
      {
        student_id: studentId,
        class_id: transfer.target_class_id,
        academic_year_id: transfer.target_academic_year_id,
      },
      { onConflict: "student_id,academic_year_id" }
    );
  }

  // Update transfer record to 'enrolled'
  await supabase
    .from("student_transfers")
    .update({
      status: "enrolled",
      student_id: studentId,
      target_house_id: allocatedHouseId,
      completed_by: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TRANSFER_ENROLLED",
    module: "STUDENT",
    target_identifier: transfer.jhs_index_number,
    description: `Finalized enrollment for transfer-in student ${transfer.first_name} ${transfer.last_name} (${transfer.jhs_index_number}). House: ${allocatedHouseName || allocatedHouseId}`,
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath(`/students/transfers/${transferId}`);
  revalidatePath("/students/transfers");
  revalidatePath("/students");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `Student ${transfer.first_name} ${transfer.last_name} enrolled successfully.`,
  };
}

// ---------------------------------------------------------------------------
// 7. FINALIZE TRANSFER OUT ACTION
// ---------------------------------------------------------------------------
export async function finalizeTransferOutAction(formData: FormData): Promise<TransferActionResult> {
  const session = await requireHeadmaster();
  const supabase = await createClient();

  const transferId = getText(formData, "transfer_id");
  if (!transferId) {
    return { success: false, message: "Transfer ID is required." };
  }

  const { data: transfer, error: fetchErr } = await supabase
    .from("student_transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (fetchErr || !transfer) {
    return { success: false, message: "Transfer record not found." };
  }

  if (transfer.direction !== "transfer_out") {
    return { success: false, message: "Only Transfer-Out records can be completed here." };
  }

  if (transfer.status !== "approved") {
    return { success: false, message: "Transfer must be approved before completion." };
  }

  if (!transfer.student_id) {
    return { success: false, message: "Associated student ID missing from transfer record." };
  }

  // Mark student as transferred (DO NOT DELETE — PRESERVE HISTORY)
  const { error: studentUpdateErr } = await supabase
    .from("students")
    .update({
      enrollment_status: "transferred",
      updated_at: new Date().toISOString(),
    })
    .eq("id", transfer.student_id);

  if (studentUpdateErr) {
    return { success: false, message: "Failed to update student status to transferred." };
  }

  // Update latest academic enrollment status
  await supabase
    .from("student_academic_enrollments")
    .update({
      enrollment_status: "transferred",
      promotion_status: "transferred",
      updated_by: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", transfer.student_id)
    .eq("academic_year_id", transfer.previous_academic_year);

  // Mark transfer record completed
  await supabase
    .from("student_transfers")
    .update({
      status: "completed",
      completed_by: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TRANSFER_OUT_COMPLETED",
    module: "STUDENT",
    target_identifier: transfer.jhs_index_number,
    description: `Completed Transfer-Out for ${transfer.first_name} ${transfer.last_name} (${transfer.jhs_index_number}) to ${transfer.destination_school}. All historical records preserved.`,
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath(`/students/transfers/${transferId}`);
  revalidatePath("/students/transfers");
  revalidatePath("/students");
  revalidatePath(`/students/${transfer.jhs_index_number}`);

  return {
    success: true,
    message: `Transfer-Out completed for ${transfer.first_name} ${transfer.last_name}. Status updated to Transferred.`,
  };
}

// ---------------------------------------------------------------------------
// 8. REJECT OR CANCEL TRANSFER ACTION
// ---------------------------------------------------------------------------
export async function rejectTransferAction(formData: FormData): Promise<TransferActionResult> {
  const session = await requireHeadmaster();
  const supabase = await createClient();

  const transferId = getText(formData, "transfer_id");
  const reason = getText(formData, "reason");

  if (!transferId || !reason) {
    return { success: false, message: "Transfer ID and rejection reason are required." };
  }

  const { data: transfer } = await supabase
    .from("student_transfers")
    .select("transfer_reference")
    .eq("id", transferId)
    .single();

  const { error } = await supabase
    .from("student_transfers")
    .update({
      status: "rejected",
      remarks: reason,
      completed_by: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transferId);

  if (error) {
    return { success: false, message: "Failed to reject transfer." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TRANSFER_REJECTED",
    module: "STUDENT",
    target_identifier: transfer?.transfer_reference || transferId,
    description: `Rejected transfer (${transfer?.transfer_reference}). Reason: ${reason}`,
    severity: "WARNING",
    status: "SUCCESS",
  });

  revalidatePath(`/students/transfers/${transferId}`);
  revalidatePath("/students/transfers");

  return { success: true, message: "Transfer has been rejected." };
}
