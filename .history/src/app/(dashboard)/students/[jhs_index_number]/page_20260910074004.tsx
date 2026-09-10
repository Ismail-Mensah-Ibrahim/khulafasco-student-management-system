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
              Index: {student.jhs_index_number} Â· {student.enrollment_status}
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
                <div className="font-medium">{student.program?.name ?? 'â€”'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">House</div>
                <div className="font-medium">{student.house?.name ?? 'â€”'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Academic year</div>
                <div className="font-medium">{student.academic_year?.name ?? 'â€”'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Student type</div>
                <div className="font-medium">{student.student_type}</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Previous school & location</h3>
              <div className="text-sm text-muted-foreground">{student.previous_school ?? 'â€”'}</div>
              <div className="text-sm text-muted-foreground">{student.region ?? 'â€”'} Â· {student.district ?? 'â€”'}</div>
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
                  <div className="font-medium">{student.parent_alt_phone ?? 'â€”'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium">{student.parent_email ?? 'â€”'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Address</div>
                  <div className="font-medium">{student.parent_address ?? 'â€”'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
