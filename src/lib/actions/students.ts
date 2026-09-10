"use server";

import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  studentEnrollmentSchema,
  type StudentEnrollmentValues,
} from "@/lib/validation/student-enrollment";

export type EnrollmentState =
  | { success: true; indexNumber: string }
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
  const { error } = await supabase.from("students").insert(values);

  if (error) {
    return {
      success: false,
      message: getDatabaseErrorMessage(error.code),
    };
  }

  return { success: true, indexNumber: values.jhs_index_number };
}