import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getPrograms } from "@/lib/data";
import { ProgramCreateForm } from "../_components/AdminCreateForms";

export const metadata: Metadata = {
  title: `Programs | ${SCHOOL.shortName}`,
};

export default async function ProgramsPage() {
  await requireAdmin();
  const programs = await getPrograms({ throwOnError: false });

  return (
    <div className="space-y-6">
      <PageHeader title="Programs" description="Academic curricula and program streams offered by the institution." />

      <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Program Registry</h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{programs.length} program{programs.length === 1 ? "" : "s"} available.</p>
          </div>
        </div>

        <div className="mb-4">
          <ProgramCreateForm />
        </div>

        <DataTable
          data={programs}
          keyField="id"
          emptyMessage="No academic programs found."
          columns={[
            { key: "name", header: "Program", cell: (program) => <span className="font-semibold" style={{ color: "var(--foreground)" }}>{program.name}</span> },
            { key: "code", header: "Code", cell: (program) => <span className="font-medium" style={{ color: "var(--muted-foreground)" }}>{program.code || "—"}</span> },
            { key: "created_at", header: "Created", cell: (program) => new Date(program.created_at).toLocaleDateString("en-GH", { dateStyle: "medium" }) },
          ]}
        />
      </section>
    </div>
  );
}
