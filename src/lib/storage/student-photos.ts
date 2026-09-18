import type { SupabaseClient } from "@supabase/supabase-js";

export const STUDENT_PHOTOS_BUCKET = "student-photos";
export const STUDENT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const STUDENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type StudentPhotoType = (typeof STUDENT_PHOTO_TYPES)[number];

const EXTENSIONS: Record<StudentPhotoType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class StudentPhotoValidationError extends Error {}

export class StudentPhotoStorageError extends Error {}

function hasSignature(bytes: Uint8Array, contentType: StudentPhotoType): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export async function validateStudentPhoto(file: File): Promise<{ contentType: StudentPhotoType; bytes: Uint8Array }> {
  if (!STUDENT_PHOTO_TYPES.includes(file.type as StudentPhotoType)) {
    throw new StudentPhotoValidationError("Unsupported image type.");
  }

  if (file.size <= 0 || file.size > STUDENT_PHOTO_MAX_BYTES) {
    throw new StudentPhotoValidationError("The image must be between 1 byte and 5 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = file.type as StudentPhotoType;

  if (bytes.length <= 0 || bytes.length > STUDENT_PHOTO_MAX_BYTES || !hasSignature(bytes, contentType)) {
    throw new StudentPhotoValidationError("The uploaded file is not a valid supported image.");
  }

  return { contentType, bytes };
}

export function getStudentPhotoPath(studentId: string, contentType: StudentPhotoType): string {
  return `students/${studentId}/photo.${EXTENSIONS[contentType]}`;
}

export async function uploadStudentPhoto(
  supabase: SupabaseClient,
  studentId: string,
  file: File
): Promise<string> {
  const { contentType, bytes } = await validateStudentPhoto(file);
  const path = getStudentPhotoPath(studentId, contentType);
  const { error } = await supabase.storage.from(STUDENT_PHOTOS_BUCKET).upload(path, bytes, {
    cacheControl: "3600",
    contentType,
    upsert: true,
  });

  if (error) {
    const msg = error.message || "";
    if (
      msg.includes("NoSuchBucket") ||
      msg.includes("Bucket not found") ||
      msg.toLowerCase().includes("not found")
    ) {
      throw new StudentPhotoStorageError(
        "Storage bucket 'student-photos' does not exist. Please run migration 20260920_student_photos_storage.sql in the Supabase Dashboard SQL Editor."
      );
    }
    throw new StudentPhotoStorageError(`Unable to upload student photo: ${error.message}`);
  }

  return path;
}

export async function removeStudentPhoto(supabase: SupabaseClient, path: string): Promise<void> {
  const { error } = await supabase.storage.from(STUDENT_PHOTOS_BUCKET).remove([path]);
  if (error) {
    throw new StudentPhotoStorageError(`Unable to clean up student photo: ${error.message}`);
  }
}
