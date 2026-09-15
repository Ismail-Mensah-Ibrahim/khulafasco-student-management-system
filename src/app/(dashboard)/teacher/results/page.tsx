import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireTeacher } from "@/lib/dal";
import { getClasses, getSubjects, getStudents, getAcademicYears, getStudentResults } from "@/lib/data";
import { TeacherResultsClient } from "./_components/TeacherResultsClient";

export const metadata: Metadata = {
  title: `Student Grades & Results | ${SCHOOL.shortName}`,
};

export default async function TeacherResultsPage() {
  await requireTeacher();

  const [classes, subjects, students, academicYears, recentResults] = await Promise.all([
    getClasses(),
    getSubjects(),
    getStudents(),
    getAcademicYears(),
    getStudentResults(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Student Assessment & Grade Entry
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Record class test (30%) and final examination (70%) scores with automated grade calculation.
        </p>
      </div>

      <TeacherResultsClient
        classes={classes}
        subjects={subjects}
        students={students}
        academicYears={academicYears}
        initialResults={recentResults}
      />
    </div>
  );
}
