"use server";

import { revalidatePath } from "next/cache";
import { requireAcademicOrAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import {
  PROMOTION_OUTCOMES,
  type PromotionOutcome,
  type FormLevel,
} from "@/config/constants";

export interface StudentPromotionItem {
  studentId: string;
  jhsIndexNumber: string;
  fullName: string;
  outcome: PromotionOutcome;
}

export interface PromotionBatchPayload {
  sourceAcademicYearId: string;
  sourceLevel: FormLevel;
  sourceClassId?: string;
  destinationAcademicYearId: string;
  destinationLevel?: FormLevel | "Graduated";
  destinationClassId?: string;
  students: StudentPromotionItem[];
}

export interface PromotionExecutionResult {
  success: boolean;
  message: string;
  promotedCount: number;
  repeatedCount: number;
  graduatedCount: number;
  otherCount: number;
  failedCount: number;
  errors: { studentId: string; index: string; error: string }[];
}

export async function executeStudentPromotionAction(
  payload: PromotionBatchPayload
): Promise<PromotionExecutionResult> {
  const session = await requireAcademicOrAdmin();
  const supabase = await createClient();

  const {
    sourceAcademicYearId,
    sourceLevel,
    destinationAcademicYearId,
    destinationLevel,
    destinationClassId,
    students,
  } = payload;

  if (!sourceAcademicYearId || !destinationAcademicYearId || !students || students.length === 0) {
    return {
      success: false,
      message: "Source academic year, destination academic year, and student selections are required.",
      promotedCount: 0,
      repeatedCount: 0,
      graduatedCount: 0,
      otherCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  let promotedCount = 0;
  let repeatedCount = 0;
  let graduatedCount = 0;
  let otherCount = 0;
  const executionErrors: { studentId: string; index: string; error: string }[] = [];

  for (const item of students) {
    try {
      if (!PROMOTION_OUTCOMES.includes(item.outcome)) {
        throw new Error(`Invalid promotion outcome: ${item.outcome}`);
      }

      // 1. Update source academic enrollment status
      await supabase
        .from("student_academic_enrollments")
        .update({
          promotion_status: item.outcome.toLowerCase(),
          updated_by: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", item.studentId)
        .eq("academic_year_id", sourceAcademicYearId);

      // 2. Determine destination academic status
      if (item.outcome === "GRADUATED") {
        // Mark student as graduated in students table
        await supabase
          .from("students")
          .update({
            enrollment_status: "graduated",
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.studentId);

        // Record graduation in student_academic_enrollments for destination year
        await supabase.from("student_academic_enrollments").upsert(
          {
            student_id: item.studentId,
            academic_year_id: destinationAcademicYearId,
            level: "Form 3",
            enrollment_status: "graduated",
            promotion_status: "graduated",
            created_by: session.id,
            updated_by: session.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,academic_year_id" }
        );

        graduatedCount++;
      } else if (item.outcome === "REPEATING") {
        // Student repeats the current level in the new academic year
        await supabase
          .from("students")
          .update({
            academic_year_id: destinationAcademicYearId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.studentId);

        await supabase.from("student_academic_enrollments").upsert(
          {
            student_id: item.studentId,
            academic_year_id: destinationAcademicYearId,
            level: sourceLevel,
            class_id: destinationClassId || null,
            enrollment_status: "repeating",
            promotion_status: "repeating",
            created_by: session.id,
            updated_by: session.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,academic_year_id" }
        );

        if (destinationClassId) {
          await supabase.from("student_class_assignments").upsert(
            {
              student_id: item.studentId,
              class_id: destinationClassId,
              academic_year_id: destinationAcademicYearId,
            },
            { onConflict: "student_id,academic_year_id" }
          );
        }

        repeatedCount++;
      } else if (item.outcome === "WITHDRAWN" || item.outcome === "TRANSFERRED" || item.outcome === "DEFERRED") {
        const mappedStatus = item.outcome.toLowerCase();
        await supabase
          .from("students")
          .update({
            enrollment_status: mappedStatus === "withdrawn" ? "inactive" : "transferred",
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.studentId);

        await supabase.from("student_academic_enrollments").upsert(
          {
            student_id: item.studentId,
            academic_year_id: destinationAcademicYearId,
            level: sourceLevel,
            enrollment_status: mappedStatus,
            promotion_status: mappedStatus,
            created_by: session.id,
            updated_by: session.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,academic_year_id" }
        );

        otherCount++;
      } else {
        // PROMOTED
        const nextLevel =
          destinationLevel && destinationLevel !== "Graduated"
            ? destinationLevel
            : sourceLevel === "Form 1"
            ? "Form 2"
            : "Form 3";

        await supabase
          .from("students")
          .update({
            academic_year_id: destinationAcademicYearId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.studentId);

        await supabase.from("student_academic_enrollments").upsert(
          {
            student_id: item.studentId,
            academic_year_id: destinationAcademicYearId,
            level: nextLevel,
            class_id: destinationClassId || null,
            enrollment_status: "promoted",
            promotion_status: "promoted",
            created_by: session.id,
            updated_by: session.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,academic_year_id" }
        );

        if (destinationClassId) {
          await supabase.from("student_class_assignments").upsert(
            {
              student_id: item.studentId,
              class_id: destinationClassId,
              academic_year_id: destinationAcademicYearId,
            },
            { onConflict: "student_id,academic_year_id" }
          );
        }

        promotedCount++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      executionErrors.push({
        studentId: item.studentId,
        index: item.jhsIndexNumber,
        error: msg,
      });
    }
  }

  // Audit the promotion batch
  await supabase.from("audit_logs").insert({
    user_id: session.id,
    actor_role: session.role,
    action: "STUDENT_PROMOTION_BATCH_COMPLETED",
    module: "ACADEMIC",
    description: `Batch cohort movement completed: ${promotedCount} promoted, ${repeatedCount} repeating, ${graduatedCount} graduated, ${otherCount} other, ${executionErrors.length} errors.`,
    severity: executionErrors.length > 0 ? "WARNING" : "INFO",
    status: executionErrors.length === 0 ? "SUCCESS" : "PARTIAL",
    metadata: {
      source_year: sourceAcademicYearId,
      dest_year: destinationAcademicYearId,
      source_level: sourceLevel,
      dest_level: destinationLevel,
      promoted: promotedCount,
      repeated: repeatedCount,
      graduated: graduatedCount,
      other: otherCount,
      failed: executionErrors.length,
    },
  });

  revalidatePath("/students");
  revalidatePath("/students/promotion");
  revalidatePath("/academic/classes");
  revalidatePath("/academic/dashboard");
  revalidatePath("/it/dashboard");
  revalidatePath("/it/audit");

  return {
    success: executionErrors.length === 0,
    message: `Promotion cohort processed: ${promotedCount} promoted, ${repeatedCount} repeating, ${graduatedCount} graduated, ${otherCount} updated, ${executionErrors.length} error(s).`,
    promotedCount,
    repeatedCount,
    graduatedCount,
    otherCount,
    failedCount: executionErrors.length,
    errors: executionErrors,
  };
}
