import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { SCHOOL } from "@/config/branding";
import { requireStaff } from "@/lib/dal";
import { getTransfers, getTransferMetrics } from "@/lib/data";
import { TransferDashboardView } from "./_components/TransferDashboardView";

export const metadata: Metadata = {
  title: `Student Transfers (STP) | ${SCHOOL.shortName}`,
};

export default async function TransfersPage() {
  await requireStaff();
  const [transfers, metrics] = await Promise.all([
    getTransfers(),
    getTransferMetrics(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Transfer Process (STP)"
        description="Official school transfer management, multi-stage academic & financial clearances, and WAEC portal integration."
      />

      <TransferDashboardView
        transfers={transfers}
        metrics={metrics}
      />
    </div>
  );
}
