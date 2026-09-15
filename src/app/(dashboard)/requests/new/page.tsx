import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { verifySession } from "@/lib/dal";
import { NewRequestClient } from "./_components/NewRequestClient";

export const metadata: Metadata = {
  title: `New Requisition | ${SCHOOL.shortName}`,
};

export default async function NewRequestPage() {
  await verifySession();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Submit New Requisition
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Request supplies, teaching materials, estate repairs, or operational expense approvals.
        </p>
      </div>

      <NewRequestClient />
    </div>
  );
}
