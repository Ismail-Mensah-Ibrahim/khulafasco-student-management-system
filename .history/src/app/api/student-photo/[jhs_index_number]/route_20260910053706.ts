import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStudentByJhsIndexNumber } from '@/lib/data';

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

export async function GET(req: Request, { params }: { params: { jhs_index_number: string } }) {
  try {
    const jhs = params.jhs_index_number;
    if (!jhs) return new Response('Missing index', { status: 400 });

    const student = await getStudentByJhsIndexNumber(jhs);
    if (!student) return new Response('Student not found', { status: 404 });

    const photoPath = student.photo_path;
    if (!photoPath) return new Response('Photo not found', { status: 404 });

    const supabase = await createClient();
    const { data, error } = await supabase.storage.from('student-photos').download(photoPath);

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
  } catch (err) {
    return new Response('Server error', { status: 500 });
  }
}
