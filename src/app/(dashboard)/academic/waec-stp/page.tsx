import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { SCHOOL } from "@/config/branding";
import { requireAcademicOrAdmin } from "@/lib/dal";
import { getWaecStpCandidates } from "@/lib/data";
import { WaecStpView } from "./_components/WaecStpView";

export const metadata: Metadata = {
  title: `WAEC STP Portal & Readiness | ${SCHOOL.shortName}`,
};

export default async function WaecStpPage() {
  await requireAcademicOrAdmin();
  const candidates = await getWaecStpCandidates();

  return (
    <div className="space-y-6">
      <PageHeader
        title="WAEC Student Transfer Process (STP)"
        description="Official national WAEC portal gateway, candidate transfer readiness validation, and continuous assessment export."
      />

      <WaecStpView candidates={candidates} />
    </div>
  );
}
