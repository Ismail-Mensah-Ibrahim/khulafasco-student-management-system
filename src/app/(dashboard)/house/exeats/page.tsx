import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireHouseStaff } from "@/lib/dal";
import { getHouseDashboardData, getHouseExeats } from "@/lib/data";
import { HouseExeatsView } from "./_components/HouseExeatsView";

export const metadata: Metadata = {
  title: `House Exeat Management | ${SCHOOL.shortName}`,
};

export default async function HouseExeatsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireHouseStaff();
  const params = (await searchParams) ?? {};
  const overrideHouseId = typeof params.houseId === "string" ? params.houseId : undefined;

  const dashboardData = await getHouseDashboardData(session.id, session.role, overrideHouseId);
  const initialExeats = dashboardData.house ? await getHouseExeats(dashboardData.house.id) : [];

  return (
    <HouseExeatsView
      data={dashboardData}
      initialExeats={initialExeats}
      userRole={session.role}
      userFullName={session.fullName}
    />
  );
}
