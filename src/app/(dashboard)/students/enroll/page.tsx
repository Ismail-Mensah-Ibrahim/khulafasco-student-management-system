import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SCHOOL } from "@/config/branding";
import { requireAdmin } from "@/lib/dal";
import { getAcademicYears, getHouses, getPrograms } from "@/lib/data";
import { EnrollmentForm } from "./_components/EnrollmentForm";

export const metadata: Metadata = {
  title: `Enroll Student | ${SCHOOL.shortName}`,
};

export default async function EnrollStudentPage() {
  await requireAdmin();

  const [academicYears, programs, houses] = await Promise.all([
    getAcademicYears(),
    getPrograms(),
    getHouses(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enroll Student"
        description="Create a student record for an academic year and connect it to the existing student directory."
        action={
          <Link href="/students" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium">
            View directory
          </Link>
        }
      />

      <section className="rounded-xl border p-4 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Student enrollment</h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Fields marked with * are required.</p>
          </div>
        </div>
        <EnrollmentForm academicYears={academicYears} programs={programs} houses={houses} />
      </section>
    </div>
  );
}