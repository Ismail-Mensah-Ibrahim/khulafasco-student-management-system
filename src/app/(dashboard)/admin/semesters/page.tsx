import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireAcademicOrAdmin } from "@/lib/dal";
import { getAcademicYears, getSemesters } from "@/lib/data";
import { PageHeader } from "@/components/shared/PageHeader";
import { hasRole } from "@/config/constants";
import { SemestersManagementClient } from "./_components/SemestersManagementClient";

export const metadata: Metadata = {
  title: `Semesters | ${SCHOOL.shortName}`,
};

export default async function AdminSemestersPage() {
  const session = await requireAcademicOrAdmin();
  const [academicYears, semesters] = await Promise.all([
    getAcademicYears(),
    getSemesters(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Semesters"
        description={`Configure semester terms, date ranges, and active instructional periods for ${SCHOOL.shortName}.`}
      />

      <SemestersManagementClient
        initialSemesters={semesters}
        academicYears={academicYears}
        canManage={hasRole(session.role, session.additionalRoles, "admin") || hasRole(session.role, session.additionalRoles, "academic_head")}
      />
    </div>
  );
}
