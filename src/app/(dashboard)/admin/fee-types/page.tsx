import type { Metadata } from "next";
import { DollarSign } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getFeeTypes } from "@/lib/data";
import { FeeTypeCreateForm } from "../_components/AdminCreateForms";

export const metadata: Metadata = {
  title: `Fee Types | ${SCHOOL.shortName}`,
};

export default async function FeeTypesPage() {
  await requireAdmin();
  const feeTypes = await getFeeTypes({ throwOnError: false });

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Types" description="Institutional fee structures and charges catalog." />

      <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Fee Type Registry</h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{feeTypes.length} active fee type{feeTypes.length === 1 ? "" : "s"} available.</p>
          </div>
        </div>

        <div className="mb-4">
          <FeeTypeCreateForm />
        </div>

        <DataTable
          data={feeTypes}
          keyField="id"
          emptyMessage="No active fee types found."
          columns={[
            { key: "name", header: "Fee Type", cell: (feeType) => <span className="font-semibold" style={{ color: "var(--foreground)" }}>{feeType.name}</span> },
            { key: "description", header: "Description", cell: (feeType) => <span className="font-medium" style={{ color: "var(--muted-foreground)" }}>{feeType.description || "—"}</span> },
            { key: "created_at", header: "Created", cell: (feeType) => new Date(feeType.created_at).toLocaleDateString("en-GH", { dateStyle: "medium" }) },
            { key: "is_active", header: "Status", cell: (feeType) => <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium" style={{ background: feeType.is_active ? "var(--success-light)" : "var(--muted)", color: feeType.is_active ? "var(--success)" : "var(--muted-foreground)" }}>{feeType.is_active ? "Active" : "Inactive"}</span> },
          ]}
        />
      </section>
    </div>
  );
}
