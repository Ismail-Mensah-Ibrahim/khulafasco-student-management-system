import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getHouseDistributions, getHouseStudentsForRebalance } from "@/lib/data";
import { HouseManagementView } from "./_components/HouseManagementView";

export const metadata: Metadata = {
  title: `Houses & Residential Management | ${SCHOOL.shortName}`,
};

export default async function HousesPage() {
  await requireAdmin();
  const [distributions, students] = await Promise.all([
    getHouseDistributions(),
    getHouseStudentsForRebalance(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Residential Houses"
        description="Manage school residential houses, capacities, gender balancing, and automated room/bed parity."
      />

      <HouseManagementView
        distributions={distributions}
        students={students}
      />
    </div>
  );
}
