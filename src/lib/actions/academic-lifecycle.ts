"use server";

import { revalidatePath } from "next/cache";
import { requireAcademicOrAdmin, requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { FORM_LEVELS, type FormLevel } from "@/config/constants";

export type AcademicLifecycleResult =
  | { success: true; message: string }
  | { success: false; message: string };

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function canBeAssignedTeachingWork(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staffId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("role, additional_roles, is_active")
    .eq("id", staffId)
    .single();

  return Boolean(
    data?.is_active &&
      (data.role === "admin" ||
        data.role === "academic_head" ||
        data.role === "teacher" ||
        data.additional_roles?.includes("teacher"))
  );
}

// ---------------------------------------------------------------------------
// SEMESTER ACTIONS
// ---------------------------------------------------------------------------

export async function createSemesterAction(formData: FormData): Promise<AcademicLifecycleResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const academicYearId = getText(formData, "academic_year_id");
  const name = getText(formData, "name");
  const semesterNumber = Number(formData.get("semester_number") || 1);
  const startDate = getText(formData, "start_date");
  const endDate = getText(formData, "end_date");
  const isCurrent = formData.get("is_current") === "true";

  if (!academicYearId || !name || !startDate || !endDate) {
    return { success: false, message: "Academic year, name, start date, and end date are required." };
  }

  // If set as current, clear current status on other semesters for this academic year
  if (isCurrent) {
    await supabase
      .from("semesters")
      .update({ is_current: false })
      .eq("academic_year_id", academicYearId);
  }

  const { data: newSemester, error } = await supabase
    .from("semesters")
    .insert({
      academic_year_id: academicYearId,
      name,
      semester_number: semesterNumber,
      start_date: startDate,
      end_date: endDate,
      is_current: isCurrent,
    })
    .select()
    .single();

  if (error) {
    console.error("createSemesterAction error:", error);
    if (error.code === "23505") {
      return { success: false, message: "A semester with this number already exists for the selected academic year." };
    }
    return { success: false, message: "Failed to create semester." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "SEMESTER_CREATED",
    module: "ACADEMIC",
    target_identifier: newSemester.id,
    description: `Created ${name} for academic year`,
    severity: "INFO",
    status: "SUCCESS",
    after_data: newSemester,
  });

  revalidatePath("/admin/semesters");
  revalidatePath("/admin/academic-years");
  revalidatePath("/academic/dashboard");

  return { success: true, message: `Semester "${name}" created successfully.` };
}

export async function updateSemesterAction(formData: FormData): Promise<AcademicLifecycleResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const semesterId = getText(formData, "semester_id");
  const name = getText(formData, "name");
  const startDate = getText(formData, "start_date");
  const endDate = getText(formData, "end_date");

  if (!semesterId || !name || !startDate || !endDate) {
    return { success: false, message: "Missing required semester fields." };
  }

  const { error } = await supabase
    .from("semesters")
    .update({
      name,
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", semesterId);

  if (error) {
    console.error("updateSemesterAction error:", error);
    return { success: false, message: "Failed to update semester." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "SEMESTER_UPDATED",
    module: "ACADEMIC",
    target_identifier: semesterId,
    description: `Updated semester "${name}"`,
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath("/admin/semesters");
  revalidatePath("/admin/academic-years");
  return { success: true, message: `Semester "${name}" updated successfully.` };
}

export async function setCurrentSemesterAction(formData: FormData): Promise<AcademicLifecycleResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const semesterId = getText(formData, "semester_id");
  const academicYearId = getText(formData, "academic_year_id");

  if (!semesterId || !academicYearId) {
    return { success: false, message: "Semester ID and academic year ID are required." };
  }

  // Clear current flags for this year
  await supabase
    .from("semesters")
    .update({ is_current: false })
    .eq("academic_year_id", academicYearId);

  // Set the selected one as current
  const { error } = await supabase
    .from("semesters")
    .update({ is_current: true, updated_at: new Date().toISOString() })
    .eq("id", semesterId);

  if (error) {
    console.error("setCurrentSemesterAction error:", error);
    return { success: false, message: "Failed to set active semester." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "ACTIVE_SEMESTER_CHANGED",
    module: "ACADEMIC",
    target_identifier: semesterId,
    description: "Changed active semester for academic year",
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath("/admin/semesters");
  revalidatePath("/admin/academic-years");
  revalidatePath("/academic/dashboard");

  return { success: true, message: "Active semester updated successfully." };
}

export async function deleteSemesterAction(formData: FormData): Promise<AcademicLifecycleResult> {
  const session = await requireAdmin();
  const supabase = await createClient();

  const semesterId = getText(formData, "semester_id");

  if (!semesterId) {
    return { success: false, message: "Semester ID is required." };
  }

  // Check references in student enrollments
  const { count } = await supabase
    .from("student_academic_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("semester_id", semesterId);

  if (count && count > 0) {
    return {
      success: false,
      message: `Cannot delete semester: ${count} student enrollment record(s) are associated with it.`,
    };
  }

  const { error } = await supabase.from("semesters").delete().eq("id", semesterId);

  if (error) {
    console.error("deleteSemesterAction error:", error);
    return { success: false, message: "Failed to delete semester." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "SEMESTER_DELETED",
    module: "ACADEMIC",
    target_identifier: semesterId,
    description: `Deleted semester record ${semesterId}`,
    severity: "WARNING",
    status: "SUCCESS",
  });

  revalidatePath("/admin/semesters");
  revalidatePath("/admin/academic-years");
  return { success: true, message: "Semester deleted successfully." };
}

// ---------------------------------------------------------------------------
// CLASS & STREAM ACTIONS
// ---------------------------------------------------------------------------

export async function createClassAction(formData: FormData): Promise<AcademicLifecycleResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const name = getText(formData, "name");
  const formLevel = getText(formData, "form_level");
  const stream = getText(formData, "stream") || null;
  const programId = getText(formData, "program_id") || null;
  const academicYearId = getText(formData, "academic_year_id");
  const classTeacherId = getText(formData, "class_teacher_id") || null;
  const capacity = Number(formData.get("capacity") || 50);

  if (!name || !formLevel || !academicYearId) {
    return { success: false, message: "Class name, form level, and academic year are required." };
  }

  if (!FORM_LEVELS.includes(formLevel as FormLevel)) {
    return { success: false, message: "Invalid form level. Must be Form 1, Form 2, or Form 3." };
  }

  if (classTeacherId && !(await canBeAssignedTeachingWork(supabase, classTeacherId))) {
    return { success: false, message: "The selected class teacher must be an active teacher or hold teaching as an additional role." };
  }

  const { data: newClass, error } = await supabase
    .from("classes")
    .insert({
      name,
      form_level: formLevel,
      stream,
      program_id: programId,
      academic_year_id: academicYearId,
      class_teacher_id: classTeacherId,
      capacity,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("createClassAction error:", error);
    return { success: false, message: "Failed to create class stream." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "CLASS_CREATED",
    module: "ACADEMIC",
    target_identifier: newClass.id,
    description: `Created class "${name}" (${formLevel}${stream ? ` Stream ${stream}` : ""})`,
    severity: "INFO",
    status: "SUCCESS",
    after_data: newClass,
  });

  revalidatePath("/admin/classes");
  revalidatePath("/academic/classes");
  revalidatePath("/academic/dashboard");

  return { success: true, message: `Class "${name}" created successfully.` };
}

export async function updateClassAction(formData: FormData): Promise<AcademicLifecycleResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const classId = getText(formData, "class_id");
  const name = getText(formData, "name");
  const formLevel = getText(formData, "form_level");
  const stream = getText(formData, "stream") || null;
  const programId = getText(formData, "program_id") || null;
  const classTeacherId = getText(formData, "class_teacher_id") || null;
  const capacity = Number(formData.get("capacity") || 50);

  if (!classId || !name || !formLevel) {
    return { success: false, message: "Class ID, name, and form level are required." };
  }

  if (classTeacherId && !(await canBeAssignedTeachingWork(supabase, classTeacherId))) {
    return { success: false, message: "The selected class teacher must be an active teacher or hold teaching as an additional role." };
  }

  const { error } = await supabase
    .from("classes")
    .update({
      name,
      form_level: formLevel,
      stream,
      program_id: programId,
      class_teacher_id: classTeacherId,
      capacity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", classId);

  if (error) {
    console.error("updateClassAction error:", error);
    return { success: false, message: "Failed to update class." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "CLASS_UPDATED",
    module: "ACADEMIC",
    target_identifier: classId,
    description: `Updated class "${name}"`,
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath("/admin/classes");
  revalidatePath("/academic/classes");
  return { success: true, message: `Class "${name}" updated successfully.` };
}

export async function assignClassTeacherAction(formData: FormData): Promise<AcademicLifecycleResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const classId = getText(formData, "class_id");
  const teacherId = getText(formData, "teacher_id") || null;

  if (!classId) {
    return { success: false, message: "Class ID is required." };
  }

  if (teacherId && !(await canBeAssignedTeachingWork(supabase, teacherId))) {
    return { success: false, message: "The selected class teacher must be an active teacher or hold teaching as an additional role." };
  }

  const { error } = await supabase
    .from("classes")
    .update({
      class_teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", classId);

  if (error) {
    console.error("assignClassTeacherAction error:", error);
    return { success: false, message: "Failed to assign class teacher." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "CLASS_TEACHER_ASSIGNED",
    module: "ACADEMIC",
    target_identifier: classId,
    description: teacherId ? `Assigned class teacher to class` : `Removed class teacher assignment`,
    severity: "INFO",
    status: "SUCCESS",
    metadata: { class_id: classId, teacher_id: teacherId },
  });

  revalidatePath("/admin/classes");
  revalidatePath("/academic/classes");
  revalidatePath("/teacher/dashboard");

  return { success: true, message: "Class teacher assignment updated." };
}

export async function toggleClassActiveAction(formData: FormData): Promise<AcademicLifecycleResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const classId = getText(formData, "class_id");
  const activeStr = getText(formData, "active");
  const shouldBeActive = activeStr === "true";

  if (!classId) {
    return { success: false, message: "Class ID is required." };
  }

  const { error } = await supabase
    .from("classes")
    .update({
      is_active: shouldBeActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", classId);

  if (error) {
    console.error("toggleClassActiveAction error:", error);
    return { success: false, message: "Failed to update class status." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: shouldBeActive ? "CLASS_ACTIVATED" : "CLASS_ARCHIVED",
    module: "ACADEMIC",
    target_identifier: classId,
    description: `${shouldBeActive ? "Activated" : "Archived"} class`,
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath("/admin/classes");
  revalidatePath("/academic/classes");

  return { success: true, message: `Class is now ${shouldBeActive ? "Active" : "Archived"}.` };
}
