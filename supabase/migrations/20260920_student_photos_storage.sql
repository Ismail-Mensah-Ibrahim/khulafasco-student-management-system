-- Migration: 20260920_student_photos_storage.sql
-- Creates the student-photos storage bucket and sets up RLS policies for upload, download, and deletion.

BEGIN;

-- 1. Create the student-photos bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage RLS Policies for student-photos bucket
DO $$
BEGIN
  -- Authenticated staff can view/download student photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Authenticated staff can read student photos'
    AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Authenticated staff can read student photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'student-photos');
  END IF;

  -- Admin can upload student photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admin can upload student photos'
    AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Admin can upload student photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'student-photos'
      AND (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ))
    );
  END IF;

  -- Admin can update/replace student photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admin can update student photos'
    AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Admin can update student photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'student-photos'
      AND (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ))
    );
  END IF;

  -- Admin can delete student photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Admin can delete student photos'
    AND polrelid = 'storage.objects'::regclass
  ) THEN
    CREATE POLICY "Admin can delete student photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'student-photos'
      AND (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ))
    );
  END IF;
END $$;

COMMIT;
