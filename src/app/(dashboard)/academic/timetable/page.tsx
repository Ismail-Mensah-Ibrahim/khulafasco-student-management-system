import type { Metadata } from "next";
import { requireAcademicHead } from "@/lib/dal";
import {
  getTimetableEntries,
  getAcademicYears,
  getSemesters,
  getClasses,
  getSubjects,
  getStaffProfiles,
  getTeacherWorkloadSummary,
} from "@/lib/data";
import { SCHOOL } from "@/config/branding";
import TimetableManager from "./_components/TimetableManager";

export const metadata: Metadata = {
  title: `Timetable Management | ${SCHOOL.shortName}`,
};

export default async function TimetablePage() {
  await requireAcademicHead();

  const [entries, academicYears, semesters, classes, subjects, staff, workload] = await Promise.all([
    getTimetableEntries(),
    getAcademicYears(),
    getSemesters(),
    getClasses(),
    getSubjects(),
    getStaffProfiles(),
    getTeacherWorkloadSummary(),
  ]);

  const teachers = staff.filter((s) => s.is_active && (s.role === "teacher" || s.role === "academic_head" || s.role === "admin" || s.additional_roles?.includes("teacher")));

  return (
    <TimetableManager
      entries={entries}
      academicYears={academicYears}
      semesters={semesters}
      classes={classes}
      subjects={subjects}
      teachers={teachers}
      workload={workload}
    />
  );
}
