import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireHouseStaff } from "@/lib/dal";
import { getHouseDashboardData } from "@/lib/data";
import { HouseStudentsView } from "./_components/HouseStudentsView";

export const metadata: Metadata = {
  title: `House Students Roster | ${SCHOOL.shortName}`,
};

export default async function HouseStudentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireHouseStaff();
  const params = (await searchParams) ?? {};
  const overrideHouseId = typeof params.houseId === "string" ? params.houseId : undefined;

  const dashboardData = await getHouseDashboardData(session.id, session.role, overrideHouseId);

  return (
    <HouseStudentsView
      data={dashboardData}
      userRole={session.role}
      userFullName={session.fullName}
    />
  );
}
