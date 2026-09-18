"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { STUDENT_PHOTOS_BUCKET, removeStudentPhoto, uploadStudentPhoto } from "@/lib/storage/student-photos";
import { normalizeIndexNumber } from "@/lib/utils";
import {
  studentEnrollmentSchema,
  studentUpdateSchema,
  type StudentEnrollmentValues,
  type StudentUpdateValues,
} from "@/lib/validation/student-enrollment";
import { getHouseDistributionData, assignBalancedHouse } from "@/lib/services/house-allocation";

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

  let resolvedHouseId = values.house_id;
  if (!resolvedHouseId) {
    try {
      const distributions = await getHouseDistributionData(supabase);
      if (distributions && distributions.length > 0) {
        const allocation = assignBalancedHouse(values.gender, distributions);
        resolvedHouseId = allocation.assignedHouseId;
      }
    } catch (allocError) {
      console.warn("Auto house allocation fallback:", allocError);
    }
  }

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
    p_house_id: resolvedHouseId,
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

export type UploadPhotoResult =
  | { success: true; photoPath: string }
  | { success: false; error: string };

export async function uploadStudentPhotoAction(formData: FormData): Promise<UploadPhotoResult> {
  await requireAdmin();

  const studentId = formData.get("studentId");
  const photo = formData.get("photo");

  if (typeof studentId !== "string" || !studentId.trim()) {
    return { success: false, error: "Invalid student reference." };
  }

  if (!(photo instanceof File) || photo.size <= 0) {
    return { success: false, error: "A valid student photograph is required." };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const storageClient = adminClient ?? supabase;

  // Verify student exists
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, jhs_index_number, photo_path")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    return { success: false, error: "Student record not found." };
  }

  const oldPhotoPath = student.photo_path;
  let savedPhotoPath: string | null = null;

  // Attempt storage upload
  try {
    if (adminClient) {
      try {
        const { data: bucket } = await adminClient.storage.getBucket(STUDENT_PHOTOS_BUCKET);
        if (!bucket) {
          await adminClient.storage.createBucket(STUDENT_PHOTOS_BUCKET, {
            public: false,
            fileSizeLimit: 5242880,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          });
        }
      } catch {
        // Non-fatal; proceed to upload
      }
    }

    savedPhotoPath = await uploadStudentPhoto(storageClient, student.id, photo);
  } catch (storageErr) {
    console.warn("Storage upload failed, attempting embedded image fallback:", storageErr);

    // If storage upload fails (e.g. bucket does not exist yet), embed as optimized base64 data URI
    // only if the image is within safe database size (< 500 KB)
    if (photo.size <= 500 * 1024) {
      try {
        const buffer = Buffer.from(await photo.arrayBuffer());
        const base64 = buffer.toString("base64");
        savedPhotoPath = `data:${photo.type || "image/jpeg"};base64,${base64}`;
      } catch {
        return {
          success: false,
          error: storageErr instanceof Error ? storageErr.message : "Unable to upload student photo.",
        };
      }
    } else {
      return {
        success: false,
        error: storageErr instanceof Error ? storageErr.message : "Unable to upload student photo.",
      };
    }
  }

  // Update student database record with new photo path or data URI
  const { error: updateError } = await supabase
    .from("students")
    .update({ photo_path: savedPhotoPath })
    .eq("id", student.id);

  if (updateError) {
    if (savedPhotoPath && !savedPhotoPath.startsWith("data:")) {
      try {
        await removeStudentPhoto(storageClient, savedPhotoPath);
      } catch {}
    }
    return { success: false, error: "Failed to update student photo in database." };
  }

  // Clean up old photo if it was in storage and different
  if (oldPhotoPath && !oldPhotoPath.startsWith("data:") && oldPhotoPath !== savedPhotoPath) {
    try {
      await removeStudentPhoto(storageClient, oldPhotoPath);
    } catch {}
  }

  revalidatePath(`/students/${encodeURIComponent(student.jhs_index_number)}`);
  revalidatePath(`/students/${encodeURIComponent(student.jhs_index_number)}/edit`);
  revalidatePath("/students");

  return { success: true, photoPath: savedPhotoPath };
}
