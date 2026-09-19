import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireAcademicOrAdmin } from "@/lib/dal";
import {
  getClasses,
  getSubjects,
  getTeacherAssignments,
  getStaffProfiles,
  getAcademicYears,
  getSemesters,
} from "@/lib/data";
import { ClassesClient } from "./_components/ClassesClient";

export const metadata: Metadata = {
  title: `Classes & Curriculum | ${SCHOOL.shortName}`,
};

export default async function AcademicClassesPage() {
  await requireAcademicOrAdmin();

  const [classes, subjects, assignments, staff, academicYears, semesters] = await Promise.all([
    getClasses(),
    getSubjects(),
    getTeacherAssignments(),
    getStaffProfiles(),
    getAcademicYears(),
    getSemesters(),
  ]);

  const teachers = staff.filter((s) => s.role === "teacher" || s.role === "academic_head" || s.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Classes &amp; Curriculum Allocation
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage academic forms, subjects, curriculum offerings, and faculty course assignments.
        </p>
      </div>

      <ClassesClient
        classes={classes}
        subjects={subjects}
        assignments={assignments}
        teachers={teachers}
        academicYears={academicYears}
        semesters={semesters}
      />
    </div>
  );
}
