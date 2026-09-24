import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getOptionalSession, requireAdmin } from "@/lib/dal";
import { hasRole } from "@/config/constants";
import {
  STUDENT_PHOTOS_BUCKET,
  removeStudentPhoto,
  StudentPhotoStorageError,
  StudentPhotoValidationError,
  uploadStudentPhoto,
} from "@/lib/storage/student-photos";
import { z } from "zod";

const studentIdSchema = z.string().uuid();

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getOptionalSession();

  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!hasRole(session.role, session.additionalRoles, "admin")) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  await requireAdmin();

  let uploadedPath: string | null = null;
  const adminClient = createAdminClient();

  try {
    const formData = await request.formData();
    const studentIdValue = formData.get("studentId");
    const photo = formData.get("photo");

    const studentIdResult = studentIdSchema.safeParse(studentIdValue);
    if (!studentIdResult.success) {
      return Response.json({ error: "Invalid student reference." }, { status: 400 });
    }

    if (!(photo instanceof File)) {
      return Response.json({ error: "A student photo is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const storageClient = adminClient ?? supabase;

    // Self-heal storage bucket if service role key is configured
    if (adminClient) {
      try {
        const { data: bucket } = await adminClient.storage.getBucket(STUDENT_PHOTOS_BUCKET);
        if (!bucket) {
          await adminClient.storage.createBucket(STUDENT_PHOTOS_BUCKET, {
            public: false,
            fileSizeLimit: 5242880,
            allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          });
        }
      } catch (bucketErr) {
        console.warn("Storage bucket lookup/create notice:", bucketErr);
      }
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, photo_path")
      .eq("id", studentIdResult.data)
      .maybeSingle();

    if (studentError) {
      return Response.json({ error: "Unable to verify the student record." }, { status: 500 });
    }

    if (!student) {
      return Response.json({ error: "Student record not found." }, { status: 404 });
    }

    const oldPhotoPath = student.photo_path;

    // Try storage upload, with automatic embedded fallback if bucket does not exist yet
    try {
      uploadedPath = await uploadStudentPhoto(storageClient, student.id, photo);
    } catch (storageErr) {
      if (photo.size <= 500 * 1024) {
        const buffer = Buffer.from(await photo.arrayBuffer());
        const base64 = buffer.toString("base64");
        uploadedPath = `data:${photo.type || "image/jpeg"};base64,${base64}`;
      } else {
        throw storageErr;
      }
    }

    // Save reference in the database
    const { data: updatedStudent, error: updateError } = await supabase
      .from("students")
      .update({ photo_path: uploadedPath })
      .eq("id", student.id)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedStudent) {
      // If DB update failed, remove newly uploaded photo
      if (uploadedPath && !uploadedPath.startsWith("data:")) {
        try {
          await removeStudentPhoto(storageClient, uploadedPath);
        } catch (cleanupError) {
          console.error("Student photo cleanup failed:", {
            studentId: student.id,
            path: uploadedPath,
            errorName: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
          });
        }
      }

      return Response.json({ error: "Unable to save the student photo reference." }, { status: 500 });
    }

    // If replacement succeeded and the old path is different, clean up old storage object
    if (oldPhotoPath && !oldPhotoPath.startsWith("data:") && oldPhotoPath !== uploadedPath) {
      try {
        await removeStudentPhoto(storageClient, oldPhotoPath);
      } catch (cleanupError) {
        console.warn("Previous student photo cleanup warning:", {
          studentId: student.id,
          oldPath: oldPhotoPath,
          error: cleanupError instanceof Error ? cleanupError.message : "Unknown",
        });
      }
    }


    return Response.json({ success: true, photoPath: uploadedPath });
  } catch (error) {
    if (uploadedPath) {
      try {
        const supabase = await createClient();
        const storageClient = adminClient ?? supabase;
        await removeStudentPhoto(storageClient, uploadedPath);
      } catch (cleanupError) {
        console.error("Student photo cleanup failed:", {
          path: uploadedPath,
          errorName: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
        });
      }
    }

    if (error instanceof StudentPhotoValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof StudentPhotoStorageError) {
      return Response.json({ error: error.message }, { status: 502 });
    }

    console.error("Student photo upload failed:", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Unable to process the student photo." }, { status: 500 });
  }
}
