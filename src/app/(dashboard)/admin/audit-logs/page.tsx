import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getAuditLogs } from "@/lib/data";

export const metadata: Metadata = {
  title: `Audit Logs | ${SCHOOL.shortName}`,
};

export default async function AuditLogsPage() {
  await requireAdmin();
  const auditLogs = await getAuditLogs({ throwOnError: false });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Authorized activity and financial audit history." />

      <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Audit History</h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{auditLogs.length} audit entr{auditLogs.length === 1 ? "y" : "ies"} available.</p>
          </div>
        </div>

        <DataTable
          data={auditLogs}
          keyField="id"
          emptyMessage="No audit records were returned from Supabase."
          columns={[
            { key: "action", header: "Action", cell: (log) => <span className="font-semibold" style={{ color: "var(--foreground)" }}>{log.action}</span> },
            { key: "entity_type", header: "Entity Type", cell: (log) => log.entity_type ?? "—" },
            { key: "entity_id", header: "Entity ID", cell: (log) => log.entity_id ?? "—" },
            { key: "created_at", header: "Timestamp", cell: (log) => new Date(log.created_at).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" }) },
            { key: "description", header: "Description", cell: (log) => log.description ?? "—" },
          ]}
        />
      </section>
    </div>
  );
}
