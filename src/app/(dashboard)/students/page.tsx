import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SCHOOL } from "@/config/branding";
import { requireFinanceOrAdmin } from "@/lib/dal";
import { getAcademicYears, getStudentsPage, getPrograms, getHouses } from "@/lib/data";
import { formatDate, getFullName } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Students | ${SCHOOL.shortName}`,
};

function buildQueryString(
  params: Record<string, string | string[] | undefined>,
  changes: Record<string, string | undefined>
): string {
  const next = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => next.append(key, entry));
      return;
    }

    if (value && value.length > 0) {
      next.set(key, value);
    }
  });

  Object.entries(changes).forEach(([key, value]) => {
    if (value && value.length > 0) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
  });

  const queryString = next.toString();
  return queryString ? `?${queryString}` : "";
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireFinanceOrAdmin();

  const params = (await searchParams) ?? {};
  const search = typeof params.search === "string" ? params.search : "";
  const academicYearId = typeof params.academicYear === "string" ? params.academicYear : "";
  const programId = typeof params.program === "string" ? params.program : "";
  const houseId = typeof params.house === "string" ? params.house : "";
  const studentType = typeof params.studentType === "string" ? params.studentType : "";
  const enrollmentStatus = typeof params.enrollmentStatus === "string" ? params.enrollmentStatus : "";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const [academicYears, programs, houses, studentPage] = await Promise.all([
    getAcademicYears(),
    getPrograms(),
    getHouses(),
    getStudentsPage({
      search,
      academicYearId: academicYearId || undefined,
      programId: programId || undefined,
      houseId: houseId || undefined,
      studentType: studentType || undefined,
      enrollmentStatus: enrollmentStatus || undefined,
      page,
      pageSize: 25,
    }),
  ]);

  if (studentPage.error) {
    throw new Error(studentPage.error);
  }

  const students = studentPage.students;
  const currentYearLabel = academicYears.find((year) => year.id === academicYearId)?.name ?? "All Years";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Directory of student records with search, filtering, and pagination powered by Supabase."
      />

      <section
        className="rounded-xl border p-4 md:p-6"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}
          >
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Student Directory
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {studentPage.totalCount} student record{studentPage.totalCount === 1 ? "" : "s"} · {currentYearLabel}
            </p>
          </div>
        </div>

        <form method="get" className="mb-5 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Index or student name"
                className="w-full rounded-lg border px-9 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Academic Year
            </label>
            <select
              name="academicYear"
              defaultValue={academicYearId}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="">All Years</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Program
            </label>
            <select
              name="program"
              defaultValue={programId}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              House
            </label>
            <select
              name="house"
              defaultValue={houseId}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="">All Houses</option>
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Type
            </label>
            <select
              name="studentType"
              defaultValue={studentType}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="">All Types</option>
              <option value="boarding">Boarding</option>
              <option value="day">Day</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Status
            </label>
            <select
              name="enrollmentStatus"
              defaultValue={enrollmentStatus}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="transferred">Transferred</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          <div className="md:col-span-6 flex items-end justify-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold"
              style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
            >
              Apply Filters
            </button>
            <Link
              href="/students"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              Clear
            </Link>
          </div>
        </form>

        {students.length === 0 ? (
          <EmptyState
            title="No students match your filters"
            description="Try another index number, name, academic year, or status filter."
            action={
              <Link
                href="/students"
                className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold"
                style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
              >
                Reset filters
              </Link>
            }
          />
        ) : (
          <>
            <DataTable
              data={students}
              keyField="id"
              emptyMessage="No student records were returned from Supabase."
              columns={[
                {
                  key: "jhs_index_number",
                  header: "Index",
                  cell: (student) => (
                    <Link
                      href={`/students/${student.jhs_index_number}`}
                      className="font-medium underline-offset-4 hover:underline"
                      style={{ color: "var(--foreground)" }}
                    >
                      {student.jhs_index_number}
                    </Link>
                  ),
                },
                {
                  key: "name",
                  header: "Student",
                  cell: (student) => (
                    <div className="space-y-0.5">
                      <div className="font-semibold" style={{ color: "var(--foreground)" }}>
                        {getFullName(student.first_name, student.middle_name, student.last_name)}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {student.gender}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "program_id",
                  header: "Program",
                  cell: (student) => student.program?.name ?? student.program_id ?? "—",
                },
                {
                  key: "house_id",
                  header: "House",
                  cell: (student) => student.house?.name ?? student.house_id ?? "—",
                },
                {
                  key: "date_of_birth",
                  header: "DOB",
                  cell: (student) => formatDate(student.date_of_birth),
                },
                {
                  key: "parent_name",
                  header: "Parent",
                  cell: (student) => student.parent_name,
                },
                {
                  key: "enrollment_status",
                  header: "Status",
                  cell: (student) => (
                    <span
                      className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        background: student.enrollment_status === "active" ? "var(--success-light)" : "var(--muted)",
                        color: student.enrollment_status === "active" ? "var(--success)" : "var(--muted-foreground)",
                      }}
                    >
                      {student.enrollment_status}
                    </span>
                  ),
                },
              ]}
            />

            {studentPage.totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Page {studentPage.page} of {studentPage.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/students${buildQueryString(params, { page: String(Math.max(1, studentPage.page - 1)) })}`}
                    aria-disabled={studentPage.page <= 1}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Link>
                  <Link
                    href={`/students${buildQueryString(params, { page: String(Math.min(studentPage.totalPages, studentPage.page + 1)) })}`}
                    aria-disabled={studentPage.page >= studentPage.totalPages}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
