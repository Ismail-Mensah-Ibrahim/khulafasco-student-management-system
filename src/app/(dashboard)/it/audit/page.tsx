import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireRole } from "@/lib/dal";
import { getAuditLogs, getStaffProfiles } from "@/lib/data";
import { PageHeader } from "@/components/shared/PageHeader";
import { SecurityAuditCenterClient } from "./_components/SecurityAuditCenterClient";

export const metadata: Metadata = {
  title: `Security & Audit Center | ${SCHOOL.shortName}`,
};

export default async function SecurityAuditCenterPage() {
  await requireRole(["admin", "it_officer", "headmaster", "assistant_headmaster"]);
  const [logs, staffList] = await Promise.all([
    getAuditLogs({ limit: 500 }),
    getStaffProfiles(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Audit Center"
        description={`Institutional activity, authentication, and governance audit trail for ${SCHOOL.shortName}.`}
      />

      <SecurityAuditCenterClient initialLogs={logs} staffList={staffList} />
    </div>
  );
}
