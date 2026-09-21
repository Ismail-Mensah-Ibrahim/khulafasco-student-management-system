"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher, requireAcademicOrAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ATTENDANCE_STATUSES, type AttendanceStatus, type ResultStatus } from "@/config/constants";

export type AcademicActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function calculateGradeAndRemarks(total: number): { grade: string; remarks: string } {
  if (total >= 80) return { grade: "A1", remarks: "Excellent" };
  if (total >= 70) return { grade: "B2", remarks: "Very Good" };
  if (total >= 65) return { grade: "B3", remarks: "Good" };
  if (total >= 60) return { grade: "C4", remarks: "Credit" };
  if (total >= 55) return { grade: "C5", remarks: "Credit" };
  if (total >= 50) return { grade: "C6", remarks: "Credit" };
  if (total >= 45) return { grade: "D7", remarks: "Pass" };
  if (total >= 40) return { grade: "E8", remarks: "Pass" };
  return { grade: "F9", remarks: "Fail" };
}

export async function recordAttendanceAction(
  _prevState: AcademicActionResult | undefined,
  formData: FormData
): Promise<AcademicActionResult> {
  const session = await requireTeacher();
  const classId = String(formData.get("class_id") || "");
  const date = String(formData.get("date") || new Date().toISOString().slice(0, 10));
  const studentId = String(formData.get("student_id") || "");
  const status = String(formData.get("status") || "present") as AttendanceStatus;
  const notes = String(formData.get("notes") || "").trim();

  if (!classId || !studentId) {
    return { success: false, message: "Class and student are required." };
  }

  if (!ATTENDANCE_STATUSES.includes(status)) {
    return { success: false, message: "Invalid attendance status." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("attendance_records").upsert(
    {
      class_id: classId,
      student_id: studentId,
      date,
      status,
      notes: notes || null,
      recorded_by: session.id,
    },
    { onConflict: "student_id,date" }
  );

  if (error) {
    console.error("recordAttendanceAction error:", error);
    return { success: false, message: "Failed to save attendance record." };
  }

  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/academic/dashboard");

  return { success: true, message: "Attendance recorded successfully." };
}

export async function submitStudentResultAction(
  _prevState: AcademicActionResult | undefined,
  formData: FormData
): Promise<AcademicActionResult> {
  const session = await requireTeacher();
  const studentId = String(formData.get("student_id") || "");
  const classId = String(formData.get("class_id") || "");
  const subjectId = String(formData.get("subject_id") || "");
  const academicYearId = String(formData.get("academic_year_id") || "");
  const term = String(formData.get("term") || "Term 1");
  const assessmentScore = Number(formData.get("assessment_score") || 0);
  const examScore = Number(formData.get("exam_score") || 0);
  const conduct = String(formData.get("conduct") || "").trim() || null;
  const punctuality = String(formData.get("punctuality") || "").trim() || null;
  const teacherComment = String(formData.get("teacher_comment") || "").trim() || null;

  if (!studentId || !classId || !subjectId || !academicYearId) {
    return { success: false, message: "Missing required academic result identifiers." };
  }

  if (assessmentScore < 0 || assessmentScore > 100 || examScore < 0 || examScore > 100) {
    return { success: false, message: "Scores must be between 0 and 100." };
  }

  const totalScore = Math.min(100, Math.round(((assessmentScore * 0.3) + (examScore * 0.7)) * 100) / 100);
  const { grade, remarks } = calculateGradeAndRemarks(totalScore);

  const supabase = await createClient();

  const { error } = await supabase.from("student_results").upsert(
    {
      student_id: studentId,
      class_id: classId,
      subject_id: subjectId,
      academic_year_id: academicYearId,
      term,
      assessment_score: assessmentScore,
      exam_score: examScore,
      total_score: totalScore,
      grade,
      remarks,
      conduct,
      punctuality,
      teacher_comment: teacherComment,
      status: "submitted",
      submitted_by: session.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,subject_id,academic_year_id,term" }
  );

  if (error) {
    console.error("submitStudentResultAction error:", error);
    return { success: false, message: "Failed to submit student result." };
  }

  revalidatePath("/teacher/results");
  revalidatePath("/academic/results");
  revalidatePath("/academic/dashboard");

  return { success: true, message: "Assessment scores recorded and submitted for review." };
}

export async function reviewStudentResultAction(
  _prevState: AcademicActionResult | undefined,
  formData: FormData
): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const resultId = String(formData.get("result_id") || "");
  const decision = String(formData.get("decision") || "approved") as ResultStatus;

  if (!resultId) return { success: false, message: "Result ID is required." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("student_results")
    .update({
      status: decision,
      approved_by: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resultId);

  if (error) {
    console.error("reviewStudentResultAction error:", error);
    return { success: false, message: "Failed to update result status." };
  }

  revalidatePath("/academic/results");
  return { success: true, message: `Student result marked as ${decision}.` };
}

// ---------------------------------------------------------------------------
// Subject Management Actions (Academic Head & Admin)
// ---------------------------------------------------------------------------

export async function createSubjectAction(formData: FormData): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const department = String(formData.get("department") || "").trim() || null;
  const isElective = formData.get("is_elective") === "true" || formData.get("is_elective") === "on";
  const description = String(formData.get("description") || "").trim() || null;

  if (!name || !code) {
    return { success: false, message: "Subject name and code are required." };
  }

  // Check code uniqueness
  const { data: existing } = await supabase
    .from("subjects")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (existing) {
    return { success: false, message: `Subject code '${code}' is already registered.` };
  }

  const { data: inserted, error } = await supabase
    .from("subjects")
    .insert({
      name,
      code,
      department,
      is_elective: isElective,
      description,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createSubjectAction error:", error);
    return { success: false, message: "Failed to create subject: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "SUBJECT_CREATED",
    entity_type: "subjects",
    entity_id: inserted?.id,
    module: "ACADEMICS",
    target_identifier: code,
    description: `Created subject "${name}" (${code})`,
    severity: "INFO",
    status: "SUCCESS",
    metadata: { name, code, department, is_elective: isElective },
  });

  revalidatePath("/academic/classes");
  revalidatePath("/academic/timetable");
  return { success: true, message: `Subject "${name}" created successfully.` };
}

export async function updateSubjectAction(formData: FormData): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const id = String(formData.get("subject_id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const department = String(formData.get("department") || "").trim() || null;
  const isElective = formData.get("is_elective") === "true" || formData.get("is_elective") === "on";
  const description = String(formData.get("description") || "").trim() || null;

  if (!id || !name || !code) {
    return { success: false, message: "Subject ID, name, and code are required." };
  }

  const { error } = await supabase
    .from("subjects")
    .update({
      name,
      code,
      department,
      is_elective: isElective,
      description,
    })
    .eq("id", id);

  if (error) {
    console.error("updateSubjectAction error:", error);
    return { success: false, message: "Failed to update subject: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "SUBJECT_UPDATED",
    entity_type: "subjects",
    entity_id: id,
    module: "ACADEMICS",
    target_identifier: code,
    description: `Updated subject "${name}" (${code})`,
    severity: "INFO",
    status: "SUCCESS",
    metadata: { name, code, department, is_elective: isElective },
  });

  revalidatePath("/academic/classes");
  revalidatePath("/academic/timetable");
  return { success: true, message: `Subject "${name}" updated successfully.` };
}

export async function toggleSubjectStatusAction(
  subjectId: string,
  isActive: boolean
): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("subjects")
    .update({ is_active: isActive })
    .eq("id", subjectId);

  if (error) {
    console.error("toggleSubjectStatusAction error:", error);
    return { success: false, message: "Failed to update subject status." };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: isActive ? "SUBJECT_ACTIVATED" : "SUBJECT_DEACTIVATED",
    entity_type: "subjects",
    entity_id: subjectId,
    module: "ACADEMICS",
    target_identifier: subjectId,
    description: `${isActive ? "Activated" : "Deactivated"} subject record`,
    severity: "WARNING",
    status: "SUCCESS",
  });

  revalidatePath("/academic/classes");
  revalidatePath("/academic/timetable");
  return { success: true, message: `Subject ${isActive ? "activated" : "deactivated"} successfully.` };
}

export async function deleteSubjectAction(subjectId: string): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  // Safety check: is subject referenced?
  const [{ count: assignmentCount }, { count: resultCount }, { count: timetableCount }] =
    await Promise.all([
      supabase.from("teacher_assignments").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
      supabase.from("student_results").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
      supabase.from("timetables").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
    ]);

  const totalRefs = (assignmentCount || 0) + (resultCount || 0) + (timetableCount || 0);
  if (totalRefs > 0) {
    return {
      success: false,
      message: `Cannot permanently delete this subject because it is linked to ${totalRefs} protected record(s) (teacher assignments, grades, or timetable periods). Deactivate the subject instead.`,
    };
  }

  const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
  if (error) {
    console.error("deleteSubjectAction error:", error);
    return { success: false, message: "Failed to delete subject: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "SUBJECT_DELETED",
    entity_type: "subjects",
    entity_id: subjectId,
    module: "ACADEMICS",
    target_identifier: subjectId,
    description: "Permanently deleted unreferenced subject",
    severity: "WARNING",
    status: "SUCCESS",
  });

  revalidatePath("/academic/classes");
  revalidatePath("/academic/timetable");
  return { success: true, message: "Subject deleted successfully." };
}

// ---------------------------------------------------------------------------
// Teacher Assignment Actions (Academic Head & Admin)
// ---------------------------------------------------------------------------

export async function assignTeacherAction(formData: FormData): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const teacherId = String(formData.get("teacher_id") || "").trim();
  const classId = String(formData.get("class_id") || "").trim();
  const subjectId = String(formData.get("subject_id") || "").trim();
  const academicYearId = String(formData.get("academic_year_id") || "").trim();
  const semesterId = String(formData.get("semester_id") || "").trim() || null;

  if (!teacherId || !classId || !subjectId || !academicYearId) {
    return { success: false, message: "Teacher, class, subject, and academic year are required." };
  }

  const { data: teacherProfile } = await supabase
    .from("profiles")
    .select("role, additional_roles, is_active")
    .eq("id", teacherId)
    .single();
  const canTeach = Boolean(
    teacherProfile?.is_active &&
      (teacherProfile.role === "admin" ||
        teacherProfile.role === "academic_head" ||
        teacherProfile.role === "teacher" ||
        teacherProfile.additional_roles?.includes("teacher"))
  );
  if (!canTeach) {
    return { success: false, message: "The selected staff member must be an active teacher or hold teaching as an additional role." };
  }

  // Insert or update assignment
  const { error } = await supabase.from("teacher_assignments").upsert(
    {
      teacher_id: teacherId,
      class_id: classId,
      subject_id: subjectId,
      academic_year_id: academicYearId,
      semester_id: semesterId,
    },
    { onConflict: "teacher_id,class_id,subject_id,academic_year_id" }
  );

  if (error) {
    console.error("assignTeacherAction error:", error);
    return { success: false, message: "Failed to assign teacher: " + error.message };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TEACHER_ASSIGNED",
    entity_type: "teacher_assignments",
    module: "ACADEMICS",
    target_identifier: teacherId,
    description: `Assigned teacher to class & subject`,
    severity: "INFO",
    status: "SUCCESS",
    metadata: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId, semester_id: semesterId },
  });

  revalidatePath("/academic/classes");
  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher/results");
  return { success: true, message: "Teacher assigned successfully." };
}

export async function removeTeacherAssignmentAction(assignmentId: string): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("teacher_assignments").delete().eq("id", assignmentId);

  if (error) {
    console.error("removeTeacherAssignmentAction error:", error);
    return { success: false, message: "Failed to remove teacher assignment: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TEACHER_UNASSIGNED",
    entity_type: "teacher_assignments",
    entity_id: assignmentId,
    module: "ACADEMICS",
    target_identifier: assignmentId,
    description: "Removed teacher assignment",
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath("/academic/classes");
  revalidatePath("/teacher/dashboard");
  return { success: true, message: "Teacher assignment removed." };
}

// ---------------------------------------------------------------------------
// Timetable Actions (Academic Head & Admin)
// ---------------------------------------------------------------------------

export async function createTimetableEntryAction(formData: FormData): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const classId = String(formData.get("class_id") || "").trim();
  const subjectId = String(formData.get("subject_id") || "").trim();
  const teacherId = String(formData.get("teacher_id") || "").trim() || null;
  const academicYearId = String(formData.get("academic_year_id") || "").trim();
  const semesterId = String(formData.get("semester_id") || "").trim() || null;
  const dayOfWeek = String(formData.get("day_of_week") || "").trim();
  const periodNumber = Number(formData.get("period_number") || 0);
  const startTime = String(formData.get("start_time") || "").trim();
  const endTime = String(formData.get("end_time") || "").trim();
  const room = String(formData.get("room") || "").trim() || null;

  if (!classId || !subjectId || !academicYearId || !dayOfWeek || !periodNumber || !startTime || !endTime) {
    return { success: false, message: "Class, subject, academic year, day, period, start and end times are required." };
  }

  // Conflict detection: same class, same day, same period
  const { data: classConflict } = await supabase
    .from("timetables")
    .select("id")
    .eq("class_id", classId)
    .eq("day_of_week", dayOfWeek)
    .eq("period_number", periodNumber)
    .maybeSingle();

  if (classConflict) {
    return { success: false, message: `Conflict: This class already has a period ${periodNumber} entry on ${dayOfWeek}.` };
  }

  // Conflict detection: same teacher, same day, same period
  if (teacherId) {
    const { data: teacherConflict } = await supabase
      .from("timetables")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("day_of_week", dayOfWeek)
      .eq("period_number", periodNumber)
      .maybeSingle();

    if (teacherConflict) {
      return { success: false, message: `Conflict: This teacher is already assigned to another class at period ${periodNumber} on ${dayOfWeek}.` };
    }
  }

  const { error } = await supabase.from("timetables").insert({
    class_id: classId,
    subject_id: subjectId,
    teacher_id: teacherId,
    academic_year_id: academicYearId,
    semester_id: semesterId,
    day_of_week: dayOfWeek,
    period_number: periodNumber,
    start_time: startTime,
    end_time: endTime,
    room,
    is_published: false,
  });

  if (error) {
    console.error("createTimetableEntryAction error:", error);
    return { success: false, message: "Failed to create timetable entry: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TIMETABLE_ENTRY_CREATED",
    entity_type: "timetables",
    module: "ACADEMICS",
    description: `Added ${dayOfWeek} period ${periodNumber} for class`,
    severity: "INFO",
    status: "SUCCESS",
    metadata: { class_id: classId, subject_id: subjectId, teacher_id: teacherId, day_of_week: dayOfWeek, period_number: periodNumber },
  });

  revalidatePath("/academic/timetable");
  revalidatePath("/teacher/timetable");
  return { success: true, message: "Timetable entry created." };
}

export async function updateTimetableEntryAction(formData: FormData): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const teacherId = String(formData.get("teacher_id") || "").trim() || null;
  const dayOfWeek = String(formData.get("day_of_week") || "").trim();
  const periodNumber = Number(formData.get("period_number") || 0);
  const startTime = String(formData.get("start_time") || "").trim();
  const endTime = String(formData.get("end_time") || "").trim();
  const room = String(formData.get("room") || "").trim() || null;
  const classId = String(formData.get("class_id") || "").trim();

  if (!id) return { success: false, message: "Entry ID is required." };

  // Conflict detection excluding self
  const { data: classConflict } = await supabase
    .from("timetables")
    .select("id")
    .eq("class_id", classId)
    .eq("day_of_week", dayOfWeek)
    .eq("period_number", periodNumber)
    .neq("id", id)
    .maybeSingle();

  if (classConflict) {
    return { success: false, message: `Conflict: This class already has a period ${periodNumber} on ${dayOfWeek}.` };
  }

  if (teacherId) {
    const { data: teacherConflict } = await supabase
      .from("timetables")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("day_of_week", dayOfWeek)
      .eq("period_number", periodNumber)
      .neq("id", id)
      .maybeSingle();

    if (teacherConflict) {
      return { success: false, message: `Conflict: Teacher already assigned at period ${periodNumber} on ${dayOfWeek}.` };
    }
  }

  const { error } = await supabase
    .from("timetables")
    .update({ teacher_id: teacherId, day_of_week: dayOfWeek, period_number: periodNumber, start_time: startTime, end_time: endTime, room })
    .eq("id", id);

  if (error) {
    console.error("updateTimetableEntryAction error:", error);
    return { success: false, message: "Failed to update: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TIMETABLE_ENTRY_UPDATED",
    entity_type: "timetables",
    entity_id: id,
    module: "ACADEMICS",
    description: "Updated timetable entry",
    severity: "INFO",
    status: "SUCCESS",
  });

  revalidatePath("/academic/timetable");
  revalidatePath("/teacher/timetable");
  return { success: true, message: "Timetable entry updated." };
}

export async function deleteTimetableEntryAction(id: string): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("timetables").delete().eq("id", id);

  if (error) {
    console.error("deleteTimetableEntryAction error:", error);
    return { success: false, message: "Failed to delete: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TIMETABLE_ENTRY_DELETED",
    entity_type: "timetables",
    entity_id: id,
    module: "ACADEMICS",
    description: "Deleted timetable entry",
    severity: "WARNING",
    status: "SUCCESS",
  });

  revalidatePath("/academic/timetable");
  revalidatePath("/teacher/timetable");
  return { success: true, message: "Timetable entry deleted." };
}

export async function publishTimetableAction(formData: FormData): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const academicYearId = String(formData.get("academic_year_id") || "").trim();
  const semesterId = String(formData.get("semester_id") || "").trim() || null;

  if (!academicYearId) return { success: false, message: "Academic year is required." };

  let query = supabase
    .from("timetables")
    .update({ is_published: true })
    .eq("academic_year_id", academicYearId);

  if (semesterId) query = query.eq("semester_id", semesterId);

  const { error } = await query;

  if (error) {
    console.error("publishTimetableAction error:", error);
    return { success: false, message: "Failed to publish timetable: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "TIMETABLE_PUBLISHED",
    entity_type: "timetables",
    module: "ACADEMICS",
    description: `Published timetable for academic year ${academicYearId}`,
    severity: "INFO",
    status: "SUCCESS",
    metadata: { academic_year_id: academicYearId, semester_id: semesterId },
  });

  revalidatePath("/academic/timetable");
  revalidatePath("/teacher/timetable");
  revalidatePath("/teacher/dashboard");
  return { success: true, message: "Timetable published successfully. All teachers can now view their schedules." };
}

export async function unpublishTimetableAction(formData: FormData): Promise<AcademicActionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const academicYearId = String(formData.get("academic_year_id") || "").trim();
  const semesterId = String(formData.get("semester_id") || "").trim() || null;

  if (!academicYearId) return { success: false, message: "Academic year is required." };

  let query = supabase
    .from("timetables")
    .update({ is_published: false })
    .eq("academic_year_id", academicYearId);

  if (semesterId) query = query.eq("semester_id", semesterId);

  const { error } = await query;
  if (error) return { success: false, message: "Failed to unpublish: " + error.message };

  revalidatePath("/academic/timetable");
  revalidatePath("/teacher/timetable");
  return { success: true, message: "Timetable unpublished. Teachers will no longer see this schedule." };
}

