import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, User } from 'lucide-react';
import { requireRole } from '@/lib/dal';
import { getStudentByJhsIndexNumber } from '@/lib/data';
import { formatDate, getFullName } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { GENDER_LABELS } from '@/config/constants';
import { DeleteStudentDialog } from './_components/DeleteStudentDialog';

export async function generateMetadata({ params }: { params: Promise<{ jhs_index_number: string }> }): Promise<Metadata> {
  const { jhs_index_number } = await params;
  const student = await getStudentByJhsIndexNumber(jhs_index_number);
  return {
    title: student ? `${getFullName(student.first_name, student.middle_name, student.last_name)} | Student Details` : 'Student Details',
  };
}

export default async function StudentDetailPage({ params }: { params: Promise<{ jhs_index_number: string }> }) {
  const session = await requireRole(["admin", "finance_officer", "headmaster", "academic_head"]);

  const { jhs_index_number } = await params;
  const student = await getStudentByJhsIndexNumber(jhs_index_number);
  if (!student) return notFound();

  const fullName = getFullName(student.first_name, student.middle_name, student.last_name);
  const isAdmin = session.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Details"
        description={`Record for ${fullName}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/students"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to List
            </Link>
            {isAdmin ? (
              <>
                <Link
                  href={`/students/${encodeURIComponent(student.jhs_index_number)}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={{ background: 'var(--brand-primary)', color: 'var(--brand-primary-foreground)' }}
                >
                  <Pencil className="h-4 w-4" /> Edit Student
                </Link>
                <DeleteStudentDialog
                  jhsIndexNumber={student.jhs_index_number}
                  studentFullName={fullName}
                />
              </>
            ) : null}
          </div>
        }
      />

      <section className="rounded-xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="space-y-1">
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              {fullName}
            </h2>
            <div className="text-sm font-mono flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
              <span>Index: {student.jhs_index_number}</span>
              <span>·</span>
              <span className="capitalize font-sans px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                {student.enrollment_status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Photograph container */}
          <div className="col-span-1">
            {student.photo_path ? (
              <div className="w-full rounded-xl overflow-hidden border shadow-xs" style={{ borderColor: 'var(--border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/student-photo/${encodeURIComponent(student.jhs_index_number)}`}
                  alt={`${fullName} photo`}
                  className="w-full h-72 object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-72 rounded-xl border border-dashed flex flex-col items-center justify-center p-4 text-center bg-muted/20" style={{ borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2 text-muted-foreground">
                  <User className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground">No photograph on file</p>
                {isAdmin ? (
                  <Link
                    href={`/students/${encodeURIComponent(student.jhs_index_number)}/edit`}
                    className="mt-3 text-xs font-medium text-brand-primary underline underline-offset-4"
                  >
                    Add photograph
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          {/* Details container */}
          <div className="col-span-2 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Academic & Placement Information
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/10" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-xs text-muted-foreground">JHS Index</div>
                  <div className="font-mono font-medium">{student.jhs_index_number}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Gender</div>
                  <div className="font-medium">{GENDER_LABELS[student.gender] ?? student.gender}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Date of Birth</div>
                  <div className="font-medium">{formatDate(student.date_of_birth)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Enrolled At</div>
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
                  <div className="text-xs text-muted-foreground">Academic Year</div>
                  <div className="font-medium">{student.academic_year?.name ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Student Type</div>
                  <div className="font-medium capitalize">{student.student_type}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Previous School & Location
              </h3>
              <div className="rounded-lg border p-4 bg-muted/10 space-y-2" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-xs text-muted-foreground">Previous Junior High School</div>
                  <div className="font-medium">{student.previous_school ?? '—'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="text-xs text-muted-foreground">Region</div>
                    <div className="font-medium">{student.region ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">District</div>
                    <div className="font-medium">{student.district ?? '—'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Parent / Guardian Contact
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/10" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-xs text-muted-foreground">Guardian Name</div>
                  <div className="font-medium">{student.parent_name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Relationship</div>
                  <div className="font-medium">{student.parent_relationship}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Primary Phone</div>
                  <div className="font-medium">{student.parent_phone}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Alternative Phone</div>
                  <div className="font-medium">{student.parent_alt_phone ?? '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Email Address</div>
                  <div className="font-medium">{student.parent_email ?? '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Residential Address</div>
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
