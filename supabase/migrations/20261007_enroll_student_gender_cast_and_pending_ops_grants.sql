-- Migration: Fix enroll_student & allocate_balanced_house RPC gender_type casts & grant pending_operations table permissions
-- Date: 2026-10-07

-- 1. Ensure enroll_student RPC explicitly casts p_gender text parameter to public.gender_type enum
CREATE OR REPLACE FUNCTION public.enroll_student(
  p_jhs_index_number text,
  p_first_name text,
  p_middle_name text DEFAULT NULL::text,
  p_last_name text DEFAULT NULL::text,
  p_gender text DEFAULT NULL::text,
  p_date_of_birth date DEFAULT NULL::date,
  p_previous_school text DEFAULT NULL::text,
  p_region text DEFAULT NULL::text,
  p_district text DEFAULT NULL::text,
  p_parent_name text DEFAULT NULL::text,
  p_parent_relationship text DEFAULT NULL::text,
  p_parent_phone text DEFAULT NULL::text,
  p_parent_alt_phone text DEFAULT NULL::text,
  p_parent_email text DEFAULT NULL::text,
  p_parent_address text DEFAULT NULL::text,
  p_program_id uuid DEFAULT NULL::uuid,
  p_house_id uuid DEFAULT NULL::uuid,
  p_student_type text DEFAULT NULL::text,
  p_academic_year_id uuid DEFAULT NULL::uuid,
  p_photo_path text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student public.students%ROWTYPE;
  v_house_id uuid;
  v_index text;
  v_guardian_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can enroll students';
  END IF;

  v_index := TRIM(UPPER(p_jhs_index_number));
  IF v_index IS NULL OR v_index = '' THEN
    RAISE EXCEPTION 'JHS/BECE Index Number is required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.students WHERE jhs_index_number = v_index AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'A student with this JHS/BECE Index Number already exists';
  END IF;

  v_house_id := p_house_id;
  IF v_house_id IS NULL THEN
    v_house_id := public.allocate_balanced_house(p_gender);
  END IF;

  INSERT INTO public.students (
    jhs_index_number, first_name, middle_name, last_name, gender, date_of_birth,
    photo_path, previous_school, region, district, parent_name, parent_relationship,
    parent_phone, parent_alt_phone, parent_email, parent_address, program_id,
    house_id, student_type, academic_year_id, enrollment_status
  ) VALUES (
    v_index, TRIM(p_first_name), NULLIF(TRIM(p_middle_name), ''), TRIM(p_last_name),
    NULLIF(TRIM(LOWER(p_gender)), '')::public.gender_type, p_date_of_birth,
    p_photo_path, NULLIF(TRIM(p_previous_school), ''),
    NULLIF(TRIM(p_region), ''), NULLIF(TRIM(p_district), ''),
    NULLIF(TRIM(p_parent_name), ''), p_parent_relationship,
    NULLIF(TRIM(p_parent_phone), ''), NULLIF(TRIM(p_parent_alt_phone), ''),
    NULLIF(TRIM(p_parent_email), ''), NULLIF(TRIM(p_parent_address), ''),
    p_program_id, v_house_id, COALESCE(NULLIF(TRIM(p_student_type), '')::public.student_type, 'boarding'::public.student_type),
    p_academic_year_id, 'active'
  )
  RETURNING * INTO v_student;

  INSERT INTO public.student_academic_enrollments (
    student_id, academic_year_id, level, enrollment_status, program_id, house_id,
    boarding_type, admission_date, created_by, updated_by
  ) VALUES (
    v_student.id, p_academic_year_id, 'Form 1', 'enrolled', p_program_id, v_house_id,
    COALESCE(p_student_type, 'boarding'), CURRENT_DATE, auth.uid(), auth.uid()
  )
  ON CONFLICT (student_id, academic_year_id) DO NOTHING;

  INSERT INTO public.house_assignment_history (
    student_id, to_house_id, academic_year_id, reason, is_manual_override, assigned_by
  ) VALUES (
    v_student.id, v_house_id, p_academic_year_id,
    CASE WHEN p_house_id IS NULL THEN 'automatic_balanced_allocation' ELSE 'manual_enrollment_assignment' END,
    p_house_id IS NOT NULL,
    auth.uid()
  );

  IF p_parent_name IS NOT NULL AND btrim(p_parent_name) <> '' THEN
    INSERT INTO public.guardians (full_name, relationship, phone, email, address)
    VALUES (TRIM(p_parent_name), p_parent_relationship, p_parent_phone, p_parent_email, p_parent_address)
    RETURNING id INTO v_guardian_id;

    INSERT INTO public.student_guardians (student_id, guardian_id, is_primary, is_emergency)
    VALUES (v_student.id, v_guardian_id, true, true);
  END IF;

  INSERT INTO public.audit_logs (
    user_id, actor_role, action, module, entity_type, entity_id, target_identifier,
    description, severity, status, after_data
  ) VALUES (
    auth.uid(), 'admin', 'STUDENT_ENROLLED', 'STUDENT', 'students', v_student.id, v_index,
    'Enrolled student ' || v_student.first_name || ' ' || v_student.last_name || ' (' || v_index || ')',
    'INFO', 'SUCCESS', to_jsonb(v_student)
  );

  RETURN jsonb_build_object(
    'id', v_student.id,
    'jhs_index_number', v_student.jhs_index_number
  );
END;
$function$;

-- 2. Ensure allocate_balanced_house RPC explicitly casts p_gender parameter to public.gender_type enum
CREATE OR REPLACE FUNCTION public.allocate_balanced_house(p_gender text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_house_id uuid;
BEGIN
  IF LOWER(TRIM(p_gender)) NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'Invalid gender for house allocation';
  END IF;

  PERFORM 1 FROM public.houses WHERE is_active = true FOR UPDATE;

  SELECT h.id
  INTO v_house_id
  FROM public.houses h
  LEFT JOIN public.students s
    ON s.house_id = h.id
   AND s.enrollment_status = 'active'
   AND s.deleted_at IS NULL
  WHERE h.is_active = true
  GROUP BY h.id, h.name, h.capacity
  HAVING COUNT(s.id) < COALESCE(h.capacity, 150)
  ORDER BY
    COUNT(s.id) FILTER (WHERE s.gender = LOWER(TRIM(p_gender))::public.gender_type) ASC,
    COUNT(s.id) ASC,
    h.name ASC
  LIMIT 1;

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'No active house has remaining capacity for allocation';
  END IF;

  RETURN v_house_id;
END;
$function$;

-- 3. Grant privileges to authenticated role
GRANT EXECUTE ON FUNCTION public.enroll_student TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_balanced_house(text) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_operations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_operations_summary() TO authenticated;
