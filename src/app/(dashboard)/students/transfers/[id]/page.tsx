import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SCHOOL } from "@/config/branding";
import { verifySession } from "@/lib/dal";
import { getTransferById } from "@/lib/data";
import { TransferDetailView } from "./_components/TransferDetailView";

export const metadata: Metadata = {
  title: `Transfer Details & Clearance | ${SCHOOL.shortName}`,
};

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;

  const transfer = await getTransferById(id);

  if (!transfer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Transfer Clearance & Record"
        description="Comprehensive audit trail, departmental clearances, and executive headmaster authorization."
      />

      <TransferDetailView transfer={transfer} userRole={session.role} />
    </div>
  );
}
