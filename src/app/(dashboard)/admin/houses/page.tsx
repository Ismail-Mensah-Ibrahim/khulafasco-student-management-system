import type { Metadata } from "next";
import { Home } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getHouses } from "@/lib/data";
import { HouseCreateForm } from "../_components/AdminCreateForms";

export const metadata: Metadata = {
  title: `Houses | ${SCHOOL.shortName}`,
};

export default async function HousesPage() {
  await requireAdmin();
  const houses = await getHouses({ throwOnError: false });

  return (
    <div className="space-y-6">
      <PageHeader title="Houses" description="Current house catalog published in Supabase." />

      <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>House Registry</h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{houses.length} house{houses.length === 1 ? "" : "s"} available.</p>
          </div>
        </div>

        <div className="mb-4">
          <HouseCreateForm />
        </div>

        <DataTable
          data={houses}
          keyField="id"
          emptyMessage="No houses were returned from Supabase."
          columns={[
            { key: "name", header: "House", cell: (house) => <span className="font-semibold" style={{ color: "var(--foreground)" }}>{house.name}</span> },
            { key: "created_at", header: "Created", cell: (house) => new Date(house.created_at).toLocaleDateString("en-GH", { dateStyle: "medium" }) },
          ]}
        />
      </section>
    </div>
  );
}
