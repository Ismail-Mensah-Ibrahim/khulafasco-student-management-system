import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireAcademicOrAdmin } from "@/lib/dal";
import { getClasses, getAcademicYears, getPrograms, getStaffProfiles } from "@/lib/data";
import { PageHeader } from "@/components/shared/PageHeader";
import { hasRole } from "@/config/constants";
import { ClassesManagementClient } from "./_components/ClassesManagementClient";

export const metadata: Metadata = {
  title: `Classes & Streams | ${SCHOOL.shortName}`,
};

export default async function AdminClassesPage() {
  const session = await requireAcademicOrAdmin();
  const [classes, academicYears, programs, allStaff] = await Promise.all([
    getClasses(),
    getAcademicYears(),
    getPrograms(),
    getStaffProfiles(),
  ]);

  const teachers = allStaff.filter(
    (s) => s.is_active && (s.role === "teacher" || s.role === "academic_head" || s.role === "assistant_headmaster" || s.role === "admin" || s.additional_roles?.includes("teacher"))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Streams & Cohorts"
        description={`Manage academic streams, form levels, and class teacher assignments for ${SCHOOL.shortName}.`}
      />

      <ClassesManagementClient
        initialClasses={classes}
        academicYears={academicYears}
        programs={programs}
        teachers={teachers}
        canManage={
          hasRole(session.role, session.additionalRoles, "admin") ||
          hasRole(session.role, session.additionalRoles, "academic_head") ||
          hasRole(session.role, session.additionalRoles, "assistant_headmaster")
        }
      />
    </div>
  );
}
