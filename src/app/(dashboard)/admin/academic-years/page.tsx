import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getAcademicYears } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Academic Years | ${SCHOOL.shortName}`,
};

export default async function AcademicYearsPage() {
  await requireAdmin();

  const academicYears = await getAcademicYears();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Years"
        description="Current academic-year catalog published in Supabase."
      />

      <section
        className="rounded-xl border p-4 md:p-6"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}
          >
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Academic Year Registry
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {academicYears.length} academic year{academicYears.length === 1 ? "" : "s"} available.
            </p>
          </div>
        </div>

        <DataTable
          data={academicYears}
          keyField="id"
          emptyMessage="No academic years were returned from Supabase."
          columns={[
            {
              key: "name",
              header: "Academic Year",
              cell: (year) => (
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                  {year.name}
                </span>
              ),
            },
            {
              key: "start_date",
              header: "Start",
              cell: (year) => formatDate(year.start_date),
            },
            {
              key: "end_date",
              header: "End",
              cell: (year) => formatDate(year.end_date),
            },
            {
              key: "is_current",
              header: "Status",
              cell: (year) => (
                <span
                  className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                  style={{
                    background: year.is_current ? "var(--success-light)" : "var(--muted)",
                    color: year.is_current ? "var(--success)" : "var(--muted-foreground)",
                  }}
                >
                  {year.is_current ? "Current" : "Archived"}
                </span>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
