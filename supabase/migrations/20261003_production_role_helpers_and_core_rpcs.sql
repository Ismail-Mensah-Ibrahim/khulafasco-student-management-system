-- ============================================================================
-- PRODUCTION ROLE HELPERS + CORE TRANSACTIONAL RPCs
-- All SECURITY DEFINER functions set search_path = public.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_staff_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND deleted_at IS NULL
      AND (
        role::text = required_role
        OR required_role = ANY (additional_roles::text[])
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('admin');
$$;

CREATE OR REPLACE FUNCTION public.is_it_officer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('it_officer');
$$;

CREATE OR REPLACE FUNCTION public.is_headmaster()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('headmaster');
$$;

CREATE OR REPLACE FUNCTION public.is_assistant_headmaster()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('assistant_headmaster');
$$;

CREATE OR REPLACE FUNCTION public.is_academic_head()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('academic_head');
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('teacher');
$$;

CREATE OR REPLACE FUNCTION public.is_finance_officer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('finance_officer');
$$;

CREATE OR REPLACE FUNCTION public.is_domestic_officer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('domestic_officer');
$$;

CREATE OR REPLACE FUNCTION public.is_general_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('general_staff');
$$;

CREATE OR REPLACE FUNCTION public.is_senior_house_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL
      AND (
        public.has_staff_role('admin')
        OR house_responsibility IN ('senior_house_master', 'senior_house_mistress')
        OR EXISTS (
          SELECT 1 FROM public.staff_responsibilities r
          WHERE r.staff_id = auth.uid() AND r.is_active = true
            AND r.responsibility IN ('senior_house_master', 'senior_housemaster', 'senior_house_mistress', 'senior_housemistress')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_house_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL
      AND (
        public.has_staff_role('admin')
        OR public.has_staff_role('house_master')
        OR public.has_staff_role('house_mistress')
        OR house_responsibility IN ('house_master', 'house_mistress', 'senior_house_master', 'senior_house_mistress')
        OR EXISTS (
          SELECT 1 FROM public.staff_responsibilities r
          WHERE r.staff_id = auth.uid()
            AND r.is_active = true
            AND r.responsibility IN (
              'housemaster', 'housemistress', 'senior_housemaster', 'senior_housemistress',
              'house_master', 'house_mistress', 'senior_house_master', 'senior_house_mistress'
            )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_staff_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_it_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_headmaster() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assistant_headmaster() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_academic_head() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_domestic_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_general_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_senior_house_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_house_staff() TO authenticated;

-- ---------------------------------------------------------------------------
-- Gender-balanced house allocation (single student). Locks house rows.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.allocate_balanced_house(p_gender text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house_id uuid;
BEGIN
  IF p_gender NOT IN ('male', 'female') THEN
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
    COUNT(s.id) FILTER (WHERE s.gender = p_gender) ASC,
    COUNT(s.id) ASC,
    h.name ASC
  LIMIT 1;

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'No active house has remaining capacity for allocation';
  END IF;

  RETURN v_house_id;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_balanced_house(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_balanced_house(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- enroll_student — transactional identity + enrollment + house + audit
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'enroll_student'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.enroll_student(
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
  p_photo_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    p_gender, p_date_of_birth, p_photo_path, NULLIF(TRIM(p_previous_school), ''),
    NULLIF(TRIM(p_region), ''), NULLIF(TRIM(p_district), ''),
    NULLIF(TRIM(p_parent_name), ''), p_parent_relationship,
    NULLIF(TRIM(p_parent_phone), ''), NULLIF(TRIM(p_parent_alt_phone), ''),
    NULLIF(TRIM(p_parent_email), ''), NULLIF(TRIM(p_parent_address), ''),
    p_program_id, v_house_id, COALESCE(p_student_type, 'boarding'),
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
$$;

REVOKE ALL ON FUNCTION public.enroll_student FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enroll_student(
  text, text, text, text, text, date, text, text, text, text, text, text, text, text, text, uuid, uuid, text, uuid, text
) TO authenticated;

-- ---------------------------------------------------------------------------
-- delete_student — archive/deactivate when historical records exist
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_student(p_jhs_index_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_index text;
  v_hist bigint := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can delete student records';
  END IF;

  v_index := TRIM(UPPER(p_jhs_index_number));
  SELECT * INTO v_student FROM public.students WHERE jhs_index_number = v_index AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student with index number % not found', p_jhs_index_number;
  END IF;

  SELECT
    (SELECT count(*) FROM public.payments p WHERE p.student_id = v_student.id) +
    (SELECT count(*) FROM public.student_charges c WHERE c.student_id = v_student.id) +
    (SELECT count(*) FROM public.student_results r WHERE r.student_id = v_student.id) +
    (SELECT count(*) FROM public.attendance_records a WHERE a.student_id = v_student.id) +
    (SELECT count(*) FROM public.assessment_scores s WHERE s.student_id = v_student.id)
  INTO v_hist;

  IF v_hist > 0 THEN
    UPDATE public.students
    SET enrollment_status = 'inactive',
        archived_at = now(),
        archived_by = auth.uid(),
        updated_at = now()
    WHERE id = v_student.id;

    INSERT INTO public.audit_logs (
      user_id, actor_role, action, module, entity_type, entity_id, target_identifier,
      description, severity, status, before_data, metadata
    ) VALUES (
      auth.uid(), 'admin', 'STUDENT_ARCHIVED', 'STUDENT', 'students', v_student.id, v_index,
      'Archived student ' || v_student.first_name || ' ' || v_student.last_name || ' because historical records exist',
      'WARNING', 'SUCCESS', to_jsonb(v_student), jsonb_build_object('historical_references', v_hist)
    );

    RETURN jsonb_build_object(
      'success', true,
      'archived', true,
      'student_id', v_student.id,
      'jhs_index_number', v_index,
      'photo_path', v_student.photo_path,
      'message', 'Student archived because historical academic or finance records exist. Physical deletion is not permitted.'
    );
  END IF;

  DELETE FROM public.student_guardians WHERE student_id = v_student.id;
  DELETE FROM public.student_class_assignments WHERE student_id = v_student.id;
  DELETE FROM public.student_academic_enrollments WHERE student_id = v_student.id;
  DELETE FROM public.house_assignment_history WHERE student_id = v_student.id;

  INSERT INTO public.audit_logs (
    user_id, actor_role, action, module, entity_type, entity_id, target_identifier,
    description, severity, status, before_data
  ) VALUES (
    auth.uid(), 'admin', 'STUDENT_DELETED', 'STUDENT', 'students', v_student.id, v_index,
    'Permanently deleted student ' || v_student.first_name || ' ' || v_student.last_name || ' (' || v_index || ')',
    'CRITICAL', 'SUCCESS', to_jsonb(v_student)
  );

  DELETE FROM public.students WHERE id = v_student.id;

  RETURN jsonb_build_object(
    'success', true,
    'archived', false,
    'student_id', v_student.id,
    'jhs_index_number', v_index,
    'photo_path', v_student.photo_path
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_student(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_student(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Timetable conflict check + publication
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_timetable_slot(
  p_class_id uuid,
  p_teacher_id uuid,
  p_room text,
  p_academic_year_id uuid,
  p_semester_id uuid,
  p_day_of_week text,
  p_period_number integer,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_conflict uuid;
  v_teacher_conflict uuid;
  v_room_conflict uuid;
BEGIN
  SELECT id INTO v_class_conflict
  FROM public.timetables
  WHERE class_id = p_class_id
    AND academic_year_id = p_academic_year_id
    AND COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_semester_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND day_of_week = p_day_of_week
    AND period_number = p_period_number
    AND status <> 'archived'
    AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  LIMIT 1;

  IF v_class_conflict IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Class already has a lesson in this period.');
  END IF;

  IF p_teacher_id IS NOT NULL THEN
    SELECT id INTO v_teacher_conflict
    FROM public.timetables
    WHERE teacher_id = p_teacher_id
      AND academic_year_id = p_academic_year_id
      AND COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_semester_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND day_of_week = p_day_of_week
      AND period_number = p_period_number
      AND status <> 'archived'
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
    LIMIT 1;
    IF v_teacher_conflict IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Teacher already has a lesson in this period.');
    END IF;
  END IF;

  IF p_room IS NOT NULL AND btrim(p_room) <> '' THEN
    SELECT id INTO v_room_conflict
    FROM public.timetables
    WHERE room = p_room
      AND academic_year_id = p_academic_year_id
      AND COALESCE(semester_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_semester_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND day_of_week = p_day_of_week
      AND period_number = p_period_number
      AND status <> 'archived'
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
    LIMIT 1;
    IF v_room_conflict IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Room is already booked in this period.');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_timetable_slot(uuid, uuid, text, uuid, uuid, text, integer, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_timetable(p_academic_year_id uuid, p_semester_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT (public.is_admin() OR public.is_academic_head()) THEN
    RAISE EXCEPTION 'Only administrators and academic heads can publish timetables';
  END IF;

  UPDATE public.timetables
  SET is_published = true,
      status = 'published',
      published_at = now(),
      published_by = auth.uid(),
      updated_at = now()
  WHERE academic_year_id = p_academic_year_id
    AND (p_semester_id IS NULL OR semester_id = p_semester_id)
    AND status <> 'archived';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.notifications (recipient_id, title, message, notification_type, metadata)
  SELECT DISTINCT teacher_id,
    'Timetable published',
    'A school timetable that includes your lessons has been published.',
    'timetable',
    jsonb_build_object('academic_year_id', p_academic_year_id, 'semester_id', p_semester_id)
  FROM public.timetables
  WHERE academic_year_id = p_academic_year_id
    AND teacher_id IS NOT NULL
    AND (p_semester_id IS NULL OR semester_id = p_semester_id)
    AND status = 'published';

  INSERT INTO public.audit_logs (
    user_id, actor_role, action, module, entity_type, description, severity, status, metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN public.is_admin() THEN 'admin' ELSE 'academic_head' END,
    'TIMETABLE_PUBLISHED', 'ACADEMIC', 'timetables',
    'Published timetable (' || v_count || ' entries)',
    'INFO', 'SUCCESS',
    jsonb_build_object('academic_year_id', p_academic_year_id, 'semester_id', p_semester_id, 'count', v_count)
  );

  RETURN jsonb_build_object('success', true, 'published_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_timetable(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_timetable(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Audit archival
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_audit_logs(p_older_than_days integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_moved integer := 0;
BEGIN
  IF NOT (public.is_admin() OR public.is_it_officer()) THEN
    RAISE EXCEPTION 'Only administrators and IT officers can archive audit logs';
  END IF;

  SELECT COALESCE(p_older_than_days, audit_retention_days, 365)
  INTO v_days
  FROM public.school_settings
  LIMIT 1;

  v_days := COALESCE(v_days, 365);

  WITH moved AS (
    DELETE FROM public.audit_logs
    WHERE created_at < now() - make_interval(days => v_days)
    RETURNING *
  )
  INSERT INTO public.audit_logs_archive (
    id, user_id, actor_role, action, module, entity_type, entity_id, target_identifier,
    description, status, severity, before_data, after_data, metadata, ip_address, user_agent,
    created_at, archived_at, archived_by
  )
  SELECT
    id, user_id, actor_role, action, module, entity_type, entity_id, target_identifier,
    description, status, severity, before_data, after_data, metadata, ip_address, user_agent,
    created_at, now(), auth.uid()
  FROM moved;

  GET DIAGNOSTICS v_moved = ROW_COUNT;

  INSERT INTO public.audit_logs (
    user_id, actor_role, action, module, description, severity, status, metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN public.is_admin() THEN 'admin' ELSE 'it_officer' END,
    'AUDIT_LOGS_ARCHIVED', 'SYSTEM',
    'Archived ' || v_moved || ' audit log(s) older than ' || v_days || ' days',
    'INFO', 'SUCCESS',
    jsonb_build_object('moved', v_moved, 'retention_days', v_days)
  );

  RETURN jsonb_build_object('success', true, 'archived_count', v_moved, 'retention_days', v_days);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_audit_logs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_audit_logs(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_audit_archive(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS SETOF public.audit_logs_archive
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_it_officer() OR public.is_headmaster()) THEN
    RAISE EXCEPTION 'Not authorized to search archived audit logs';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.audit_logs_archive a
  WHERE p_search IS NULL
     OR a.action ILIKE '%' || p_search || '%'
     OR a.description ILIKE '%' || p_search || '%'
     OR a.target_identifier ILIKE '%' || p_search || '%'
  ORDER BY a.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 100), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.search_audit_archive(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_audit_archive(text, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Promotion of a single student (used by server action in a loop; still atomic per student)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_student(
  p_student_id uuid,
  p_source_year_id uuid,
  p_destination_year_id uuid,
  p_source_level text,
  p_destination_level text,
  p_destination_class_id uuid,
  p_outcome text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_next_level text;
BEGIN
  IF NOT (public.is_admin() OR public.is_academic_head()) THEN
    RAISE EXCEPTION 'Only administrators and academic heads can promote students';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  UPDATE public.student_academic_enrollments
  SET promotion_status = lower(p_outcome),
      updated_by = auth.uid(),
      updated_at = now()
  WHERE student_id = p_student_id
    AND academic_year_id = p_source_year_id;

  IF p_outcome = 'GRADUATED' THEN
    UPDATE public.students
    SET enrollment_status = 'graduated', updated_at = now()
    WHERE id = p_student_id;

    INSERT INTO public.student_academic_enrollments (
      student_id, academic_year_id, level, class_id, enrollment_status, promotion_status,
      program_id, house_id, created_by, updated_by, updated_at
    ) VALUES (
      p_student_id, p_destination_year_id, 'Form 3', p_destination_class_id, 'graduated', 'graduated',
      v_student.program_id, v_student.house_id, auth.uid(), auth.uid(), now()
    )
    ON CONFLICT (student_id, academic_year_id) DO UPDATE
    SET enrollment_status = 'graduated', promotion_status = 'graduated', updated_by = auth.uid(), updated_at = now();
  ELSIF p_outcome = 'REPEATING' THEN
    UPDATE public.students SET academic_year_id = p_destination_year_id, updated_at = now() WHERE id = p_student_id;
    INSERT INTO public.student_academic_enrollments (
      student_id, academic_year_id, level, class_id, enrollment_status, promotion_status,
      program_id, house_id, created_by, updated_by, updated_at
    ) VALUES (
      p_student_id, p_destination_year_id, p_source_level, p_destination_class_id, 'repeating', 'repeating',
      v_student.program_id, v_student.house_id, auth.uid(), auth.uid(), now()
    )
    ON CONFLICT (student_id, academic_year_id) DO UPDATE
    SET level = EXCLUDED.level, class_id = EXCLUDED.class_id, enrollment_status = 'repeating',
        promotion_status = 'repeating', updated_by = auth.uid(), updated_at = now();
  ELSIF p_outcome IN ('WITHDRAWN', 'TRANSFERRED', 'DEFERRED') THEN
    UPDATE public.students
    SET enrollment_status = CASE WHEN p_outcome = 'WITHDRAWN' THEN 'inactive' ELSE 'transferred' END,
        updated_at = now()
    WHERE id = p_student_id;
    INSERT INTO public.student_academic_enrollments (
      student_id, academic_year_id, level, enrollment_status, promotion_status,
      program_id, house_id, created_by, updated_by, updated_at
    ) VALUES (
      p_student_id, p_destination_year_id, p_source_level, lower(p_outcome), lower(p_outcome),
      v_student.program_id, v_student.house_id, auth.uid(), auth.uid(), now()
    )
    ON CONFLICT (student_id, academic_year_id) DO UPDATE
    SET enrollment_status = lower(p_outcome), promotion_status = lower(p_outcome),
        updated_by = auth.uid(), updated_at = now();
  ELSE
    v_next_level := COALESCE(
      NULLIF(p_destination_level, 'Graduated'),
      CASE p_source_level WHEN 'Form 1' THEN 'Form 2' ELSE 'Form 3' END
    );
    UPDATE public.students SET academic_year_id = p_destination_year_id, updated_at = now() WHERE id = p_student_id;
    INSERT INTO public.student_academic_enrollments (
      student_id, academic_year_id, level, class_id, enrollment_status, promotion_status,
      program_id, house_id, created_by, updated_by, updated_at
    ) VALUES (
      p_student_id, p_destination_year_id, v_next_level, p_destination_class_id, 'promoted', 'promoted',
      v_student.program_id, v_student.house_id, auth.uid(), auth.uid(), now()
    )
    ON CONFLICT (student_id, academic_year_id) DO UPDATE
    SET level = EXCLUDED.level, class_id = EXCLUDED.class_id, enrollment_status = 'promoted',
        promotion_status = 'promoted', updated_by = auth.uid(), updated_at = now();
  END IF;

  IF p_destination_class_id IS NOT NULL AND p_outcome IN ('PROMOTED', 'REPEATING') THEN
    INSERT INTO public.student_class_assignments (student_id, class_id, academic_year_id)
    VALUES (p_student_id, p_destination_class_id, p_destination_year_id)
    ON CONFLICT (student_id, academic_year_id) DO UPDATE SET class_id = EXCLUDED.class_id;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, actor_role, action, module, entity_type, entity_id, target_identifier,
    description, severity, status, metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN public.is_admin() THEN 'admin' ELSE 'academic_head' END,
    'STUDENT_PROMOTED', 'ACADEMIC', 'students', p_student_id, v_student.jhs_index_number,
    'Promotion outcome ' || p_outcome || ' for ' || v_student.first_name || ' ' || v_student.last_name,
    'INFO', 'SUCCESS',
    jsonb_build_object(
      'outcome', p_outcome,
      'source_year', p_source_year_id,
      'destination_year', p_destination_year_id
    )
  );

  RETURN jsonb_build_object('success', true, 'student_id', p_student_id, 'outcome', p_outcome);
END;
$$;

REVOKE ALL ON FUNCTION public.promote_student(uuid, uuid, uuid, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_student(uuid, uuid, uuid, text, text, uuid, text) TO authenticated;

-- Harden house rebalance with search_path (preserve existing signature)
CREATE OR REPLACE FUNCTION public.rebalance_houses_atomic(
  p_moves jsonb,
  p_actor_id uuid,
  p_actor_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_move jsonb;
  v_student_id uuid;
  v_to_house_id uuid;
  v_from_house_id uuid;
  v_from_house_name text;
  v_to_house_name text;
  v_student_name text;
  v_student_index text;
  v_count integer := 0;
  v_new_count integer := 0;
  v_reassign_count integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can rebalance houses';
  END IF;

  PERFORM 1 FROM public.houses WHERE is_active = true FOR UPDATE;
  PERFORM 1 FROM public.students WHERE enrollment_status = 'active' FOR UPDATE;

  FOR v_move IN SELECT * FROM jsonb_array_elements(p_moves)
  LOOP
    v_student_id := (v_move->>'studentId')::uuid;
    v_to_house_id := (v_move->>'toHouseId')::uuid;

    SELECT s.house_id, h.name, s.first_name || ' ' || s.last_name, s.jhs_index_number
    INTO v_from_house_id, v_from_house_name, v_student_name, v_student_index
    FROM public.students s
    LEFT JOIN public.houses h ON h.id = s.house_id
    WHERE s.id = v_student_id;

    SELECT name INTO v_to_house_name FROM public.houses WHERE id = v_to_house_id;

    UPDATE public.students
    SET house_id = v_to_house_id, updated_at = now()
    WHERE id = v_student_id;

    INSERT INTO public.house_assignment_history (
      student_id, from_house_id, to_house_id, reason, is_manual_override, assigned_by
    ) VALUES (
      v_student_id, v_from_house_id, v_to_house_id, 'house_rebalance', false, p_actor_id
    );

    IF v_from_house_id IS NULL THEN
      v_new_count := v_new_count + 1;
    ELSE
      v_reassign_count := v_reassign_count + 1;
    END IF;

    INSERT INTO public.audit_logs (
      user_id, actor_role, action, entity_type, entity_id, module, target_identifier,
      description, before_data, after_data, metadata, severity, status
    ) VALUES (
      p_actor_id, p_actor_role, 'HOUSE_REASSIGNED', 'students', v_student_id, 'HOUSE',
      v_student_index,
      'Reassigned ' || coalesce(v_student_name, 'student') || ' from ' || coalesce(v_from_house_name, 'Unassigned') || ' to ' || coalesce(v_to_house_name, 'Unknown'),
      jsonb_build_object('house_id', v_from_house_id),
      jsonb_build_object('house_id', v_to_house_id),
      v_move, 'INFO', 'SUCCESS'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'moved', v_count,
    'new_assignments', v_new_count,
    'reassignments', v_reassign_count
  );
END;
$$;
