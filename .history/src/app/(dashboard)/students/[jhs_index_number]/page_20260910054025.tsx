import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireFinanceOrAdmin } from '@/lib/dal';
import { getStudentByJhsIndexNumber } from '@/lib/data';
import { formatDate, getFullName } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: { jhs_index_number: string } }): Promise<Metadata> {
  const student = await getStudentByJhsIndexNumber(params.jhs_index_number);
  return {
    title: student ? `${getFullName(student.first_name, student.middle_name, student.last_name)} | Student` : 'Student',
  };
}

export default async function StudentDetailPage({ params }: { params: { jhs_index_number: string } }) {
  await requireFinanceOrAdmin();

  const student = await getStudentByJhsIndexNumber(params.jhs_index_number);
  if (!student) return notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Student Details" description={`Record for ${getFullName(student.first_name, student.middle_name, student.last_name)}`} />

      <section className="rounded-xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              {getFullName(student.first_name, student.middle_name, student.last_name)}
            </h2>
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Index: {student.jhs_index_number} · {student.enrollment_status}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/students" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            {student.photo_path ? (
              // Proxy to secure API route
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/student-photo/${encodeURIComponent(student.jhs_index_number)}`} alt="Student photo" className="w-full rounded-md object-cover" />
            ) : (
              <div className="w-full h-56 rounded-md bg-muted/30 flex items-center justify-center">No photo</div>
            )}
          </div>

          <div className="col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">JHS Index</div>
                <div className="font-medium">{student.jhs_index_number}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Gender</div>
                <div className="font-medium">{student.gender}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Date of birth</div>
                <div className="font-medium">{formatDate(student.date_of_birth)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Enrolled at</div>
                <div className="font-medium">{formatDate(student.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Program</div>
                <div className="font-medium">{student.program?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">House</div>
                <div className="font-medium">{student.house?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Academic year</div>
                <div className="font-medium">{student.academic_year?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Student type</div>
                <div className="font-medium">{student.student_type}</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Previous school & location</h3>
              <div className="text-sm text-muted-foreground">{student.previous_school ?? '—'}</div>
              <div className="text-sm text-muted-foreground">{student.region ?? '—'} · {student.district ?? '—'}</div>
            </div>

            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Parent / Guardian</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-medium">{student.parent_name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Relationship</div>
                  <div className="font-medium">{student.parent_relationship}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="font-medium">{student.parent_phone}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Alt Phone</div>
                  <div className="font-medium">{student.parent_alt_phone ?? '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium">{student.parent_email ?? '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Address</div>
                  <div className="font-medium">{student.parent_address ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, GraduationCap, Mail, MapPin, Phone, Users } from "lucide-react";
import { SCHOOL } from "@/config/branding";
import { requireFinanceOrAdmin } from "@/lib/dal";
import { getStudentByJhsIndexNumber, getStudentPhotoUrl } from "@/lib/data";
import { formatDate, getFullName } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Student Profile | ${SCHOOL.shortName}`,
};

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ jhs_index_number: string }>;
}) {
  await requireFinanceOrAdmin();

  const { jhs_index_number } = await params;
  const student = await getStudentByJhsIndexNumber(jhs_index_number);

  if (!student) {
    notFound();
  }

  const studentFullName = getFullName(student.first_name, student.middle_name, student.last_name);
  const photoUrl = await getStudentPhotoUrl(student.photo_path);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted-foreground)" }}>
            Student Record
          </p>
          <h1 className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)", fontFamily: "Georgia, serif" }}>
            {studentFullName}
          </h1>
        </div>
        <Link
          href="/students"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to students
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex flex-col items-center text-center">
            <div className="relative h-48 w-40 overflow-hidden rounded-xl border bg-muted" style={{ borderColor: "var(--border)" }}>
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={`${studentFullName} portrait`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold" style={{ color: "var(--muted-foreground)" }}>
                  {student.first_name?.[0] ?? "S"}
                  {student.last_name?.[0] ?? "T"}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {student.jhs_index_number}
              </p>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {student.student_type}
              </p>
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <section className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  Student Overview
                </h2>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Academic and enrollment details
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted-foreground)" }}>
                  <GraduationCap className="h-3.5 w-3.5" />
                  Program
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {student.program?.name ?? student.program_id ?? "—"}
                </p>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted-foreground)" }}>
                  <MapPin className="h-3.5 w-3.5" />
                  House
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {student.house?.name ?? student.house_id ?? "—"}
                </p>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted-foreground)" }}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  Date of Birth
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {formatDate(student.date_of_birth)}
                </p>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted-foreground)" }}>
                  <Users className="h-3.5 w-3.5" />
                  Enrollment Status
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {student.enrollment_status}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--brand-accent)", color: "var(--brand-primary)" }}>
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                  Parent / Guardian
                </h2>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Contact and household information
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm" style={{ color: "var(--foreground)" }}>
              <div>
                <span className="font-medium">Name:</span> {student.parent_name}
              </div>
              <div>
                <span className="font-medium">Relationship:</span> {student.parent_relationship}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                {student.parent_phone}
              </div>
              {student.parent_alt_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                  {student.parent_alt_phone}
                </div>
              )}
              {student.parent_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                  {student.parent_email}
                </div>
              )}
              {student.parent_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: "var(--muted-foreground)" }} />
                  {student.parent_address}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
