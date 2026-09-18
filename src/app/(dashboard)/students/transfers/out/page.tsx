import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { SCHOOL } from "@/config/branding";
import { requireStaff } from "@/lib/dal";
import { getActiveStudentsForTransfer } from "@/lib/data";
import { TransferOutForm } from "./_components/TransferOutForm";

export const metadata: Metadata = {
  title: `Initiate Student Transfer-Out | ${SCHOOL.shortName}`,
};

export default async function TransferOutPage() {
  await requireStaff();
  const students = await getActiveStudentsForTransfer();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Transfer-Out Clearance"
        description="Initiate an official departure clearance for an actively enrolled student transferring to another institution."
      />

      <TransferOutForm students={students} />
    </div>
  );
}
