"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher, requireAcademicOrAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ATTENDANCE_STATUSES, type AttendanceStatus, type ResultStatus } from "@/config/constants";

export type AcademicActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function calculateGradeAndRemarks(total: number): { grade: string; remarks: string } {
  if (total >= 80) return { grade: "1", remarks: "Excellent" };
  if (total >= 70) return { grade: "2", remarks: "Very Good" };
  if (total >= 65) return { grade: "3", remarks: "Good" };
  if (total >= 60) return { grade: "4", remarks: "Credit" };
  if (total >= 55) return { grade: "5", remarks: "Credit" };
  if (total >= 50) return { grade: "6", remarks: "Pass" };
  if (total >= 45) return { grade: "7", remarks: "Pass" };
  if (total >= 40) return { grade: "8", remarks: "Pass" };
  return { grade: "9", remarks: "Fail" };
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
