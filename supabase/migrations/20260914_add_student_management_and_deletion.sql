-- Migration: Add student management updates, RLS policies, and secure deletion RPC
-- Supports:
-- 1. update_student RPC for editing student profiles
-- 2. delete_student RPC for transactional, safe deletion of student records and related data
-- 3. Grants and RLS policies for admin update and deletion

BEGIN;

-- 1. Ensure authenticated role has necessary table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;

-- 2. Ensure RLS policies exist on students table for UPDATE and DELETE by administrators
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'allow_admin_update_students' AND polrelid = 'public.students'::regclass
  ) THEN
    CREATE POLICY allow_admin_update_students ON public.students
      FOR UPDATE
      USING (
        auth.role() = 'authenticated' AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
      )
      WITH CHECK (
        auth.role() = 'authenticated' AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'allow_admin_delete_students' AND polrelid = 'public.students'::regclass
  ) THEN
    CREATE POLICY allow_admin_delete_students ON public.students
      FOR DELETE
      USING (
        auth.role() = 'authenticated' AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
      );
  END IF;
END$$;

-- 3. RPC: update_student
CREATE OR REPLACE FUNCTION public.update_student(
  p_jhs_index_number text,
  p_first_name text,
  p_middle_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_previous_school text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_parent_name text DEFAULT NULL,
  p_parent_relationship text DEFAULT NULL,
  p_parent_phone text DEFAULT NULL,
  p_parent_alt_phone text DEFAULT NULL,
  p_parent_email text DEFAULT NULL,
  p_parent_address text DEFAULT NULL,
  p_program_id uuid DEFAULT NULL,
  p_house_id uuid DEFAULT NULL,
  p_student_type text DEFAULT NULL,
  p_academic_year_id uuid DEFAULT NULL,
  p_enrollment_status text DEFAULT NULL,
  p_photo_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_student record;
  v_updated record;
BEGIN
  -- Strict Admin authorization check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update student records';
  END IF;

  -- Verify student exists
  SELECT * INTO v_student
  FROM public.students
  WHERE jhs_index_number = TRIM(UPPER(p_jhs_index_number));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student with index number % not found', p_jhs_index_number;
  END IF;

  -- Perform in-place update (biodata and placement only; financial records are never modified)
  UPDATE public.students
  SET
    first_name = COALESCE(TRIM(p_first_name), first_name),
    middle_name = NULLIF(TRIM(p_middle_name), ''),
    last_name = COALESCE(TRIM(p_last_name), last_name),
    gender = COALESCE(p_gender, gender),
    date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
    previous_school = NULLIF(TRIM(p_previous_school), ''),
    region = NULLIF(TRIM(p_region), ''),
    district = NULLIF(TRIM(p_district), ''),
    parent_name = COALESCE(TRIM(p_parent_name), parent_name),
    parent_relationship = COALESCE(p_parent_relationship, parent_relationship),
    parent_phone = COALESCE(TRIM(p_parent_phone), parent_phone),
    parent_alt_phone = NULLIF(TRIM(p_parent_alt_phone), ''),
    parent_email = NULLIF(TRIM(p_parent_email), ''),
    parent_address = NULLIF(TRIM(p_parent_address), ''),
    program_id = COALESCE(p_program_id, program_id),
    house_id = p_house_id,
    student_type = COALESCE(p_student_type, student_type),
    academic_year_id = COALESCE(p_academic_year_id, academic_year_id),
    enrollment_status = COALESCE(p_enrollment_status, enrollment_status),
    photo_path = CASE WHEN p_photo_path IS NOT NULL THEN p_photo_path ELSE photo_path END,
    updated_at = NOW()
  WHERE id = v_student.id
  RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'jhs_index_number', v_updated.jhs_index_number,
    'first_name', v_updated.first_name,
    'last_name', v_updated.last_name,
    'photo_path', v_updated.photo_path,
    'updated_at', v_updated.updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.update_student FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_student TO authenticated;

-- 4. RPC: delete_student
CREATE OR REPLACE FUNCTION public.delete_student(p_jhs_index_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_student record;
  v_photo_path text;
  v_student_id uuid;
  v_index text;
  v_full_name text;
BEGIN
  -- Strict Admin authorization check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can delete student records';
  END IF;

  v_index := TRIM(UPPER(p_jhs_index_number));

  -- Look up student
  SELECT id, jhs_index_number, first_name, last_name, photo_path
  INTO v_student
  FROM public.students
  WHERE jhs_index_number = v_index;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student with index number % not found', p_jhs_index_number;
  END IF;

  v_student_id := v_student.id;
  v_photo_path := v_student.photo_path;
  v_full_name := v_student.first_name || ' ' || v_student.last_name;

  -- 1. Delete payment allocations connected to the student's payments or charges
  DELETE FROM public.payment_allocations
  WHERE payment_id IN (
    SELECT id FROM public.payments WHERE student_id = v_student_id
  )
  OR student_charge_id IN (
    SELECT id FROM public.student_charges WHERE student_id = v_student_id
  );

  -- 2. Delete payments for this student
  DELETE FROM public.payments
  WHERE student_id = v_student_id;

  -- 3. Delete student charges for this student
  DELETE FROM public.student_charges
  WHERE student_id = v_student_id;

  -- 4. Log deletion in audit_logs (audit_logs.entity_id is text/uuid without FK to students)
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    created_at
  ) VALUES (
    auth.uid(),
    'DELETE',
    'student',
    v_student_id::text,
    'Deleted student ' || v_full_name || ' (' || v_index || ')',
    NOW()
  );

  -- 5. Delete the student row
  DELETE FROM public.students
  WHERE id = v_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'jhs_index_number', v_index,
    'photo_path', v_photo_path
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_student FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_student TO authenticated;

COMMIT;
