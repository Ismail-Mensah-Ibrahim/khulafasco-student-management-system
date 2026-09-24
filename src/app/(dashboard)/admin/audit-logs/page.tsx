import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireRole } from "@/lib/dal";
import { getAuditLogs, getStaffProfiles } from "@/lib/data";
import { PageHeader } from "@/components/shared/PageHeader";
import { SecurityAuditCenterClient } from "@/app/(dashboard)/it/audit/_components/SecurityAuditCenterClient";

export const metadata: Metadata = {
  title: `Audit Logs | ${SCHOOL.shortName}`,
};

export default async function AuditLogsPage() {
  await requireRole(["admin", "it_officer", "headmaster", "assistant_headmaster"]);
  const [auditLogs, staffList] = await Promise.all([
    getAuditLogs({ limit: 500 }),
    getStaffProfiles(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Audit Logs"
        description="Authorized activity, authentication, and governance audit history."
      />

      <SecurityAuditCenterClient initialLogs={auditLogs} staffList={staffList} />
    </div>
  );
}
