"use server";

import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  studentEnrollmentSchema,
  type StudentEnrollmentValues,
} from "@/lib/validation/student-enrollment";

export type EnrollmentState =
  | { success: true; indexNumber: string; studentId: string }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

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

function getDatabaseErrorMessage(code: string | undefined): string {
  switch (code) {
    case "23505":
      return "A student with this JHS index number already exists.";
    case "23503":
      return "One of the selected academic year, program, or house records is invalid. Refresh the page and try again.";
    case "42501":
      return "You are not authorized to enroll students.";
    case "22P02":
      return "One of the submitted values is invalid. Review the form and try again.";
    default:
      return "Unable to enroll the student right now. Please try again.";
  }
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
      message: getDatabaseErrorMessage(error.code),
    };
  }

  return { success: true, indexNumber: values.jhs_index_number, studentId: student.id };
}