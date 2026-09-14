import type { Metadata } from "next";
import { BookOpen, Calendar, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getAcademicYears } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { setCurrentAcademicYearAction } from "@/lib/actions/admin";
import { AcademicYearCreateForm } from "../_components/AdminCreateForms";

export const metadata: Metadata = {
  title: `Academic Years | ${SCHOOL.shortName}`,
};

export default async function AcademicYearsPage() {
  await requireAdmin();

  const academicYears = await getAcademicYears();
  const currentYear = academicYears.find((year) => year.is_current) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Years"
        description="Manage the school calendar and current academic year."
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

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase" style={{ color: "var(--muted-foreground)" }}><Calendar className="h-4 w-4" /> Active Academic Year</span>
              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold" style={{ background: "var(--success-light)", color: "var(--success)" }}><CheckCircle2 className="mr-1 h-3 w-3" />Current</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black" style={{ color: "var(--foreground)" }}>{currentYear?.name ?? "No current year"}</div>
              <div className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{currentYear ? `${formatDate(currentYear.start_date)} - ${formatDate(currentYear.end_date)}` : "No academic year selected."}</div>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
            <div className="text-xs font-semibold uppercase" style={{ color: "var(--muted-foreground)" }}>Set Current Year</div>
            <form action={setCurrentAcademicYearAction} className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 space-y-2">
                <label htmlFor="current-academic-year" className="text-sm font-medium">Academic year</label>
                <select id="current-academic-year" name="academic_year_id" defaultValue={currentYear?.id ?? ""} className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm">
                  <option value="">Select academic year</option>
                  {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
                </select>
              </div>
              <button type="submit" className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold" style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}>
                Select current year
              </button>
            </form>
          </div>
        </div>

        <div className="mb-4">
          <AcademicYearCreateForm />
        </div>

        <DataTable
          data={academicYears}
          keyField="id"
          emptyMessage="No academic years have been configured yet."
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
