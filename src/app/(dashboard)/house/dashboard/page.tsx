import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireHouseStaff } from "@/lib/dal";
import { getHouseDashboardData, getHouses } from "@/lib/data";
import { HouseDashboardView } from "./_components/HouseDashboardView";

export const metadata: Metadata = {
  title: `House Dashboard | ${SCHOOL.shortName}`,
};

export default async function HouseDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireHouseStaff();
  const params = (await searchParams) ?? {};
  const overrideHouseId = typeof params.houseId === "string" ? params.houseId : undefined;

  const [dashboardData, allHouses] = await Promise.all([
    getHouseDashboardData(session.id, session.role, overrideHouseId),
    session.role === "admin" ? getHouses() : Promise.resolve([]),
  ]);

  return (
    <HouseDashboardView
      data={dashboardData}
      userRole={session.role}
      userFullName={session.fullName}
      allHouses={allHouses}
      selectedHouseId={overrideHouseId}
    />
  );
}
