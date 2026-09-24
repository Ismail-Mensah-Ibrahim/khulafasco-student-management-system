import type { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getStudentByJhsIndexNumber } from '@/lib/data';
import { getOptionalSession } from '@/lib/dal';
import { hasRole } from '@/config/constants';

function contentTypeFromPath(path: string | null): string {
  if (!path) return 'application/octet-stream';
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(_req: NextRequest, context: { params: Promise<{ jhs_index_number: string }> }) {
  try {
    const { jhs_index_number } = await context.params;
    if (!jhs_index_number) return new Response('Missing index', { status: 400 });

    const session = await getOptionalSession();
    if (!session) return new Response('Unauthorized', { status: 401 });

    const student = await getStudentByJhsIndexNumber(jhs_index_number);
    if (!student) return new Response('Student not found', { status: 404 });

    // Strict Role Authorization:
    // - Global staff (Admin, Headmaster, Academic Head, Finance, Teacher, IT) have school-wide photo access.
    // - House Master & House Mistress are strictly restricted to students in their assigned house.
    const isGlobalStaff = ['admin', 'headmaster', 'assistant_headmaster', 'academic_head', 'finance_officer', 'teacher', 'it_officer']
      .some((role) => hasRole(session.role, session.additionalRoles, role as typeof session.role));
    const isHouseStaff = hasRole(session.role, session.additionalRoles, 'house_master') || hasRole(session.role, session.additionalRoles, 'house_mistress') || Boolean(session.houseResponsibility);

    if (!isGlobalStaff && !isHouseStaff) {
      return new Response('Forbidden', { status: 403 });
    }

    if (isHouseStaff && !isGlobalStaff && !session.houseResponsibility?.startsWith('senior_')) {
      if (!session.houseId || student.house_id !== session.houseId) {
        return new Response('Forbidden: Student not in your assigned house', { status: 403 });
      }
    }

    const photoPath = student.photo_path;
    if (!photoPath) return new Response('Photo not found', { status: 404 });

    // If photo is stored as a direct base64 data URI, serve it directly
    if (photoPath.startsWith('data:')) {
      const commaIdx = photoPath.indexOf(',');
      if (commaIdx !== -1) {
        const meta = photoPath.substring(0, commaIdx);
        const base64Data = photoPath.substring(commaIdx + 1);
        const mime = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        const buffer = Buffer.from(base64Data, 'base64');
        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'private, max-age=60',
          },
        });
      }
    }

    const adminClient = createAdminClient();
    const storageClient = adminClient ?? (await createClient());
    const { data, error } = await storageClient.storage.from('student-photos').download(photoPath);


    if (error || !data) {
      return new Response('Unable to fetch photo', { status: 500 });
    }

    const ct = contentTypeFromPath(photoPath);

    // In Node, data may be a ReadableStream or Blob. Convert to arrayBuffer.
    // The Response constructor accepts a ReadableStream or ArrayBuffer.
    // Use arrayBuffer for safety.
    const buffer = await data.arrayBuffer();

    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    // Log server error for diagnostics
    console.error(error);
    return new Response('Server error', { status: 500 });
  }
}
