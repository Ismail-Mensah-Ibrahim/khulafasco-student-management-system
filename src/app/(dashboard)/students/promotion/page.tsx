import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireAcademicOrAdmin } from "@/lib/dal";
import { getAcademicYears, getClasses, getStudentsPage } from "@/lib/data";
import { PageHeader } from "@/components/shared/PageHeader";
import { StudentPromotionClient } from "./_components/StudentPromotionClient";

export const metadata: Metadata = {
  title: `Student Promotion | ${SCHOOL.shortName}`,
};

export default async function StudentPromotionPage() {
  await requireAcademicOrAdmin();
  const [academicYears, classes, studentPageResult] = await Promise.all([
    getAcademicYears(),
    getClasses(),
    getStudentsPage({ pageSize: 500, enrollmentStatus: "active" }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Promotion & Cohort Management"
        description={`Manage annual student progression, Form 1 to Form 2, Form 2 to Form 3, and Graduation for ${SCHOOL.shortName}.`}
      />

      <StudentPromotionClient
        academicYears={academicYears}
        classes={classes}
        students={studentPageResult.students}
      />
    </div>
  );
}
