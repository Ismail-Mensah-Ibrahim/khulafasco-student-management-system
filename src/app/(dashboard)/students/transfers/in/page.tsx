import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { SCHOOL } from "@/config/branding";
import { requireAcademicOrAdmin } from "@/lib/dal";
import { getAcademicYears, getPrograms, getHouses, getClasses } from "@/lib/data";
import { TransferInForm } from "./_components/TransferInForm";

export const metadata: Metadata = {
  title: `New Student Transfer-In | ${SCHOOL.shortName}`,
};

export default async function TransferInPage() {
  await requireAcademicOrAdmin();

  const [academicYears, programs, houses, classes] = await Promise.all([
    getAcademicYears(),
    getPrograms({ throwOnError: false }),
    getHouses({ throwOnError: false }),
    getClasses(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Transfer-In Application"
        description="Register an incoming student transfer from another Ghanaian Senior High School with multi-stage clearance."
      />

      <TransferInForm
        academicYears={academicYears}
        programs={programs}
        houses={houses}
        classes={classes}
      />
    </div>
  );
}
