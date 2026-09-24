import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireHouseStaff } from "@/lib/dal";
import { hasRole } from "@/config/constants";
import { getHouseDashboardData, getHouseExeats, getHouses } from "@/lib/data";
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

  const isSenior =
    hasRole(session.role, session.additionalRoles, "admin") ||
    hasRole(session.role, session.additionalRoles, "headmaster") ||
    hasRole(session.role, session.additionalRoles, "assistant_headmaster") ||
    session.houseResponsibility === "senior_house_master" ||
    session.houseResponsibility === "senior_house_mistress";

  const [dashboardData, allHouses] = await Promise.all([
    getHouseDashboardData(
      session.id,
      session.role,
      overrideHouseId,
      session.houseResponsibility
    ),
    isSenior ? getHouses() : Promise.resolve([]),
  ]);

  const initialExeats = dashboardData.house ? await getHouseExeats(dashboardData.house.id) : [];

  return (
    <HouseExeatsView
      data={dashboardData}
      initialExeats={initialExeats}
      userRole={session.role}
      userFullName={session.fullName}
      allHouses={allHouses}
      selectedHouseId={overrideHouseId}
    />
  );
}
