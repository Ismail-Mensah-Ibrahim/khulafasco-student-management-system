"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { removeStudentPhoto } from "@/lib/storage/student-photos";
import { normalizeIndexNumber } from "@/lib/utils";
import {
  studentEnrollmentSchema,
  studentUpdateSchema,
  type StudentEnrollmentValues,
  type StudentUpdateValues,
} from "@/lib/validation/student-enrollment";

export type EnrollmentState =
  | { success: true; indexNumber: string; studentId: string }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export type UpdateStudentState =
  | { success: true; indexNumber: string; studentId: string }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export type DeleteStudentResult =
  | { success: true; message: string }
  | { success: false; message: string };

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getRawValues(formData: FormData): Record<keyof StudentEnrollmentValues, string> {
  return {
    jhs_index_number: getText(formData, "jhs_index_number"),
    first_name: getText(formData, "first_name"),
    middle_name: getText(formData, "middle_name"),
    last_name: getText(formData, "last_name"),
    gender: getText(formData, "gender"),
    date_of_birth: getText(formData, "date_of_birth"),
    previous_school: getText(formData, "previous_school"),
    region: getText(formData, "region"),
    district: getText(formData, "district"),
    parent_name: getText(formData, "parent_name"),
    parent_relationship: getText(formData, "parent_relationship"),
    parent_phone: getText(formData, "parent_phone"),
    parent_alt_phone: getText(formData, "parent_alt_phone"),
    parent_email: getText(formData, "parent_email"),
    parent_address: getText(formData, "parent_address"),
    program_id: getText(formData, "program_id"),
    house_id: getText(formData, "house_id"),
    student_type: getText(formData, "student_type"),
    academic_year_id: getText(formData, "academic_year_id"),
    enrollment_status: getText(formData, "enrollment_status"),
  };
}

function getDatabaseErrorMessage(code: string | undefined, message?: string): string {
  const lowerMessage = message?.toLowerCase() ?? "";

  if (code === "23505" || lowerMessage.includes("already exists")) {
    return "A student with this JHS/BECE Index Number already exists.";
  }
  if (code === "42501" || lowerMessage.includes("not authorized") || lowerMessage.includes("unauthorized") || lowerMessage.includes("only administrators")) {
    return "You are not authorized to perform this operation.";
  }
  if (code === "23503") {
    return "One of the selected academic year, program, or house records is invalid. Refresh the page and try again.";
  }
  if (code === "22P02") {
    return "One of the submitted values is invalid. Review the form and try again.";
  }
  return "Unable to save student details right now. Please try again.";
}

export async function createStudentAction(
  _previousState: EnrollmentState,
  formData: FormData
): Promise<EnrollmentState> {
  await requireAdmin();

  const parsed = studentEnrollmentSchema.safeParse(getRawValues(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const values: StudentEnrollmentValues = parsed.data;
  const supabase = await createClient();
  const { data: student, error } = await supabase.rpc("enroll_student", {
    p_jhs_index_number: values.jhs_index_number,
    p_first_name: values.first_name,
    p_middle_name: values.middle_name,
    p_last_name: values.last_name,
    p_gender: values.gender,
    p_date_of_birth: values.date_of_birth,
    p_previous_school: values.previous_school,
    p_region: values.region,
    p_district: values.district,
    p_parent_name: values.parent_name,
    p_parent_relationship: values.parent_relationship,
    p_parent_phone: values.parent_phone,
    p_parent_alt_phone: values.parent_alt_phone,
    p_parent_email: values.parent_email,
    p_parent_address: values.parent_address,
    p_program_id: values.program_id,
    p_house_id: values.house_id,
    p_student_type: values.student_type,
    p_academic_year_id: values.academic_year_id,
    p_photo_path: null,
  });

  if (error) {
    return {
      success: false,
      message: getDatabaseErrorMessage(error.code, error.message),
    };
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");

  return { success: true, indexNumber: values.jhs_index_number, studentId: student.id };
}

export async function updateStudentAction(
  _previousState: UpdateStudentState,
  formData: FormData
): Promise<UpdateStudentState> {
  await requireAdmin();

  const parsed = studentUpdateSchema.safeParse(getRawValues(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const values: StudentUpdateValues = parsed.data;
  const supabase = await createClient();

  // Authoritative update via database RPC
  const { data: rpcResult, error: rpcError } = await supabase.rpc("update_student", {
    p_jhs_index_number: values.jhs_index_number,
    p_first_name: values.first_name,
    p_middle_name: values.middle_name,
    p_last_name: values.last_name,
    p_gender: values.gender,
    p_date_of_birth: values.date_of_birth,
    p_previous_school: values.previous_school,
    p_region: values.region,
    p_district: values.district,
    p_parent_name: values.parent_name,
    p_parent_relationship: values.parent_relationship,
    p_parent_phone: values.parent_phone,
    p_parent_alt_phone: values.parent_alt_phone,
    p_parent_email: values.parent_email,
    p_parent_address: values.parent_address,
    p_program_id: values.program_id,
    p_house_id: values.house_id,
    p_student_type: values.student_type,
    p_academic_year_id: values.academic_year_id,
    p_enrollment_status: values.enrollment_status,
  });

  if (rpcError) {
    console.error("update_student RPC error:", rpcError);
    if (rpcError.code === "PGRST202") {
      return {
        success: false,
        message: "The student update database function is not available. Please ensure database migrations have been applied.",
      };
    }
    return {
      success: false,
      message: getDatabaseErrorMessage(rpcError.code, rpcError.message),
    };
  }

  let studentId = "";
  if (rpcResult && typeof rpcResult === "object" && "id" in rpcResult) {
    studentId = String((rpcResult as { id: string }).id);
  }

  revalidatePath("/students");
  revalidatePath(`/students/${encodeURIComponent(values.jhs_index_number)}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    indexNumber: values.jhs_index_number,
    studentId,
  };
}

export async function deleteStudentAction(jhsIndexNumber: string): Promise<DeleteStudentResult> {
  await requireAdmin();
  const normalizedIndex = normalizeIndexNumber(jhsIndexNumber);

  if (!normalizedIndex) {
    return { success: false, message: "Valid JHS index number is required." };
  }

  const supabase = await createClient();

  // Find the student to get id and photo_path
  const { data: student, error: fetchError } = await supabase
    .from("students")
    .select("id, jhs_index_number, first_name, last_name, photo_path")
    .eq("jhs_index_number", normalizedIndex)
    .maybeSingle();

  if (fetchError || !student) {
    return { success: false, message: "Student record not found." };
  }

  // Authoritative deletion via database RPC
  const { data: deleteResult, error: rpcError } = await supabase.rpc("delete_student", {
    p_jhs_index_number: normalizedIndex,
  });

  if (rpcError) {
    console.error("delete_student RPC error:", rpcError);
    if (rpcError.code === "PGRST202") {
      return {
        success: false,
        message: "The secure deletion database function is not available. Please ensure database migrations have been applied.",
      };
    }
    return {
      success: false,
      message: rpcError.message || "Failed to delete student record.",
    };
  }

  // Cleanup photo from storage if returned from successful DB deletion
  const deletedPhotoPath =
    (deleteResult && typeof deleteResult === "object" && "photo_path" in deleteResult
      ? (deleteResult as { photo_path: string | null }).photo_path
      : student.photo_path) ?? null;

  if (deletedPhotoPath) {
    try {
      await removeStudentPhoto(supabase, deletedPhotoPath);
    } catch (storageError) {
      console.warn("Storage cleanup warning during student deletion:", storageError);
    }
  }

  revalidatePath("/students");
  revalidatePath(`/students/${encodeURIComponent(normalizedIndex)}`);
  revalidatePath("/dashboard");
  revalidatePath("/finance");

  return { success: true, message: "Student record has been permanently deleted." };
}