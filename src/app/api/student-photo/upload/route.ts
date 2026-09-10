import { createClient } from "@/lib/supabase/server";
import { getOptionalSession, requireAdmin } from "@/lib/dal";
import {
  removeStudentPhoto,
  StudentPhotoStorageError,
  StudentPhotoValidationError,
  uploadStudentPhoto,
} from "@/lib/storage/student-photos";
import { z } from "zod";

const studentIdSchema = z.string().uuid();

export async function POST(request: Request) {
  const session = await getOptionalSession();

  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.role !== "admin") {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  await requireAdmin();

  let uploadedPath: string | null = null;

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

    if (student.photo_path) {
      return Response.json({ error: "This student already has a photo." }, { status: 409 });
    }

    uploadedPath = await uploadStudentPhoto(supabase, student.id, photo);

    const { data: updatedStudent, error: updateError } = await supabase
      .from("students")
      .update({ photo_path: uploadedPath })
      .eq("id", student.id)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedStudent) {
      try {
        await removeStudentPhoto(supabase, uploadedPath);
      } catch (cleanupError) {
        console.error("Student photo cleanup failed:", {
          studentId: student.id,
          path: uploadedPath,
          errorName: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
        });
      }

      return Response.json({ error: "Unable to save the student photo reference." }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (uploadedPath) {
      try {
        const supabase = await createClient();
        await removeStudentPhoto(supabase, uploadedPath);
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
      return Response.json({ error: "Unable to upload the student photo. Please try again." }, { status: 502 });
    }

    console.error("Student photo upload failed:", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Unable to process the student photo." }, { status: 500 });
  }
}