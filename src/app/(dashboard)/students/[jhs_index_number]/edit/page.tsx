import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getAcademicYears, getHouses, getPrograms, getStudentByJhsIndexNumber } from "@/lib/data";
import { getFullName } from "@/lib/utils";
import { StudentEditForm } from "./_components/StudentEditForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jhs_index_number: string }>;
}): Promise<Metadata> {
  const { jhs_index_number } = await params;
  const student = await getStudentByJhsIndexNumber(jhs_index_number);

  return {
    title: student
      ? `Edit ${getFullName(student.first_name, student.middle_name, student.last_name)} | ${SCHOOL.shortName}`
      : `Edit Student | ${SCHOOL.shortName}`,
  };
}

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ jhs_index_number: string }>;
}) {
  await requireAdmin();

  const { jhs_index_number } = await params;
  const student = await getStudentByJhsIndexNumber(jhs_index_number);

  if (!student) return notFound();

  const [academicYears, programs, houses] = await Promise.all([
    getAcademicYears(),
    getPrograms(),
    getHouses(),
  ]);

  const studentFullName = getFullName(student.first_name, student.middle_name, student.last_name);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Student Profile"
        description={`Update biodata, academic placement, parent/guardian info, or photograph for ${studentFullName}.`}
        action={
          <Link
            href={`/students/${encodeURIComponent(student.jhs_index_number)}`}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <ArrowLeft className="h-4 w-4" /> View profile
          </Link>
        }
      />

      <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}
          >
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Update Record — {student.jhs_index_number}
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Ensure all information is accurate before submitting changes.
            </p>
          </div>
        </div>

        <StudentEditForm
          student={student}
          academicYears={academicYears}
          programs={programs}
          houses={houses}
        />
      </section>
    </div>
  );
}
