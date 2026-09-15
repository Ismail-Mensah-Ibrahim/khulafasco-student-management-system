import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { PageHeader } from "@/components/shared/PageHeader";
import { StudentImportWizard } from "./_components/StudentImportWizard";

export const metadata: Metadata = {
  title: `Bulk Student Import | ${SCHOOL.shortName}`,
};

export default async function StudentImportPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Student Import"
        description={`Upload batch student admissions with validation, preview, and transactional integrity for ${SCHOOL.shortName}.`}
      />

      <StudentImportWizard />
    </div>
  );
}
