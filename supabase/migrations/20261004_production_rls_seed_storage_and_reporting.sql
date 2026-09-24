-- ============================================================================
-- PRODUCTION RLS, SEED, STORAGE, REPORTING, AND FOLLOW-ON RPCs
-- Additive. Does not drop operational data.
-- ============================================================================

-- Foreign key for class-scoped responsibilities (table created earlier)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_responsibilities_class_id_fkey'
  ) THEN
    ALTER TABLE public.staff_responsibilities
      ADD CONSTRAINT staff_responsibilities_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_responsibilities_house
  ON public.staff_responsibilities (house_id)
  WHERE is_active = true AND house_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Academic manager helper (narrow, search_path locked)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_academics()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
      OR public.is_academic_head()
      OR public.is_assistant_headmaster()
      OR public.is_headmaster();
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_academics() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies for new production tables
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'school_settings_select' AND polrelid = 'public.school_settings'::regclass) THEN
    CREATE POLICY school_settings_select ON public.school_settings FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'school_settings_update_admin' AND polrelid = 'public.school_settings'::regclass) THEN
    CREATE POLICY school_settings_update_admin ON public.school_settings FOR UPDATE TO authenticated
      USING (public.is_admin() OR public.is_it_officer())
      WITH CHECK (public.is_admin() OR public.is_it_officer());
  END IF;
END $$;

DROP POLICY IF EXISTS departments_select ON public.departments;
CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS departments_write ON public.departments;
CREATE POLICY departments_write ON public.departments FOR ALL TO authenticated
  USING (public.can_manage_academics()) WITH CHECK (public.can_manage_academics());

DROP POLICY IF EXISTS learning_areas_select ON public.learning_areas;
CREATE POLICY learning_areas_select ON public.learning_areas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS learning_areas_write ON public.learning_areas;
CREATE POLICY learning_areas_write ON public.learning_areas FOR ALL TO authenticated
  USING (public.can_manage_academics()) WITH CHECK (public.can_manage_academics());

DROP POLICY IF EXISTS classrooms_select ON public.classrooms;
CREATE POLICY classrooms_select ON public.classrooms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS classrooms_write ON public.classrooms;
CREATE POLICY classrooms_write ON public.classrooms FOR ALL TO authenticated
  USING (public.can_manage_academics()) WITH CHECK (public.can_manage_academics());

DROP POLICY IF EXISTS staff_responsibilities_select ON public.staff_responsibilities;
CREATE POLICY staff_responsibilities_select ON public.staff_responsibilities FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_it_officer() OR public.is_headmaster() OR staff_id = auth.uid());
DROP POLICY IF EXISTS staff_responsibilities_write ON public.staff_responsibilities;
CREATE POLICY staff_responsibilities_write ON public.staff_responsibilities FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS program_subjects_select ON public.program_subjects;
CREATE POLICY program_subjects_select ON public.program_subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS program_subjects_write ON public.program_subjects;
CREATE POLICY program_subjects_write ON public.program_subjects FOR ALL TO authenticated
  USING (public.can_manage_academics()) WITH CHECK (public.can_manage_academics());

DROP POLICY IF EXISTS class_teacher_assignments_select ON public.class_teacher_assignments;
CREATE POLICY class_teacher_assignments_select ON public.class_teacher_assignments FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS class_teacher_assignments_write ON public.class_teacher_assignments;
CREATE POLICY class_teacher_assignments_write ON public.class_teacher_assignments FOR ALL TO authenticated
  USING (public.can_manage_academics()) WITH CHECK (public.can_manage_academics());

DROP POLICY IF EXISTS guardians_select ON public.guardians;
CREATE POLICY guardians_select ON public.guardians FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_academic_head() OR public.is_finance_officer() OR public.is_house_staff() OR public.is_teacher());
DROP POLICY IF EXISTS guardians_write ON public.guardians;
CREATE POLICY guardians_write ON public.guardians FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS student_guardians_select ON public.student_guardians;
CREATE POLICY student_guardians_select ON public.student_guardians FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_academic_head() OR public.is_finance_officer() OR public.is_house_staff() OR public.is_teacher());
DROP POLICY IF EXISTS student_guardians_write ON public.student_guardians;
CREATE POLICY student_guardians_write ON public.student_guardians FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS house_assignment_history_select ON public.house_assignment_history;
CREATE POLICY house_assignment_history_select ON public.house_assignment_history FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_house_staff() OR public.is_headmaster());
DROP POLICY IF EXISTS house_assignment_history_insert ON public.house_assignment_history;
CREATE POLICY house_assignment_history_insert ON public.house_assignment_history FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS assessments_select ON public.assessments;
CREATE POLICY assessments_select ON public.assessments FOR SELECT TO authenticated
  USING (public.can_manage_academics() OR public.is_teacher() OR teacher_id = auth.uid());
DROP POLICY IF EXISTS assessments_write ON public.assessments;
CREATE POLICY assessments_write ON public.assessments FOR ALL TO authenticated
  USING (public.can_manage_academics() OR public.is_teacher())
  WITH CHECK (public.can_manage_academics() OR public.is_teacher());

DROP POLICY IF EXISTS assessment_scores_select ON public.assessment_scores;
CREATE POLICY assessment_scores_select ON public.assessment_scores FOR SELECT TO authenticated
  USING (public.can_manage_academics() OR public.is_teacher());
DROP POLICY IF EXISTS assessment_scores_write ON public.assessment_scores;
CREATE POLICY assessment_scores_write ON public.assessment_scores FOR ALL TO authenticated
  USING (public.can_manage_academics() OR public.is_teacher())
  WITH CHECK (public.can_manage_academics() OR public.is_teacher());

DROP POLICY IF EXISTS qualitative_assessments_select ON public.qualitative_assessments;
CREATE POLICY qualitative_assessments_select ON public.qualitative_assessments FOR SELECT TO authenticated
  USING (public.can_manage_academics() OR public.is_teacher() OR public.is_house_staff());
DROP POLICY IF EXISTS qualitative_assessments_write ON public.qualitative_assessments;
CREATE POLICY qualitative_assessments_write ON public.qualitative_assessments FOR ALL TO authenticated
  USING (public.can_manage_academics() OR public.is_teacher())
  WITH CHECK (public.can_manage_academics() OR public.is_teacher());

DROP POLICY IF EXISTS staff_attendance_select ON public.staff_attendance;
CREATE POLICY staff_attendance_select ON public.staff_attendance FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_headmaster() OR staff_id = auth.uid());
DROP POLICY IF EXISTS staff_attendance_write ON public.staff_attendance;
CREATE POLICY staff_attendance_write ON public.staff_attendance FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_headmaster())
  WITH CHECK (public.is_admin() OR public.is_headmaster());

DROP POLICY IF EXISTS document_files_select ON public.document_files;
CREATE POLICY document_files_select ON public.document_files FOR SELECT TO authenticated
  USING (public.is_admin() OR uploaded_by = auth.uid() OR (owner_type = 'staff' AND owner_id = auth.uid()));
DROP POLICY IF EXISTS document_files_insert ON public.document_files;
CREATE POLICY document_files_insert ON public.document_files FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR uploaded_by = auth.uid());

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.can_manage_academics());
DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR public.is_admin())
  WITH CHECK (recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS audit_logs_archive_select ON public.audit_logs_archive;
CREATE POLICY audit_logs_archive_select ON public.audit_logs_archive FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_it_officer() OR public.is_headmaster());

DROP POLICY IF EXISTS promotion_batches_select ON public.promotion_batches;
CREATE POLICY promotion_batches_select ON public.promotion_batches FOR SELECT TO authenticated
  USING (public.can_manage_academics());
DROP POLICY IF EXISTS promotion_batches_insert ON public.promotion_batches;
CREATE POLICY promotion_batches_insert ON public.promotion_batches FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_academics());

DROP POLICY IF EXISTS student_fee_charges_select ON public.student_fee_charges;
CREATE POLICY student_fee_charges_select ON public.student_fee_charges FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_finance_officer() OR public.is_headmaster());
DROP POLICY IF EXISTS student_fee_charges_write ON public.student_fee_charges;
CREATE POLICY student_fee_charges_write ON public.student_fee_charges FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_finance_officer())
  WITH CHECK (public.is_admin() OR public.is_finance_officer());

REVOKE UPDATE, DELETE ON public.audit_logs_archive FROM authenticated, anon, PUBLIC;
GRANT SELECT ON public.audit_logs_archive TO authenticated;

-- Teachers and general staff see published timetables; academic managers still have ALL.
DROP POLICY IF EXISTS "Staff can view timetables" ON public.timetables;
CREATE POLICY "Staff can view timetables" ON public.timetables
  FOR SELECT TO authenticated
  USING (
    public.can_manage_academics()
    OR is_published = true
    OR teacher_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Reporting views (invoker RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_house_gender_distribution
WITH (security_invoker = true) AS
SELECT
  h.id AS house_id,
  h.name AS house_name,
  h.code AS house_code,
  COUNT(s.id) FILTER (WHERE s.enrollment_status = 'active' AND s.deleted_at IS NULL) AS active_students,
  COUNT(s.id) FILTER (WHERE s.enrollment_status = 'active' AND s.deleted_at IS NULL AND s.gender::text = 'male') AS male_count,
  COUNT(s.id) FILTER (WHERE s.enrollment_status = 'active' AND s.deleted_at IS NULL AND s.gender::text = 'female') AS female_count
FROM public.houses h
LEFT JOIN public.students s ON s.house_id = h.id
WHERE h.is_active = true
GROUP BY h.id, h.name, h.code;

CREATE OR REPLACE VIEW public.v_published_teacher_timetable
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.teacher_id,
  t.day_of_week,
  t.period_number,
  t.start_time,
  t.end_time,
  t.room,
  t.class_id,
  c.name AS class_name,
  t.subject_id,
  sub.name AS subject_name,
  t.academic_year_id,
  t.semester_id,
  t.is_published,
  t.status
FROM public.timetables t
JOIN public.classes c ON c.id = t.class_id
JOIN public.subjects sub ON sub.id = t.subject_id
WHERE t.is_published = true
  AND t.status = 'published';

GRANT SELECT ON public.v_house_gender_distribution, public.v_published_teacher_timetable TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed reference data only (no fake students, staff, payments, or results)
-- ---------------------------------------------------------------------------
INSERT INTO public.houses (name, code, is_active)
SELECT v.name, v.code, true
FROM (VALUES
  ('Abubakar', 'ABU'),
  ('Umar', 'UMR'),
  ('Uthman', 'UTH'),
  ('Ali', 'ALI')
) AS v(name, code)
WHERE NOT EXISTS (SELECT 1 FROM public.houses h WHERE h.name = v.name);

INSERT INTO public.programs (name, code, is_active)
SELECT v.name, v.code, true
FROM (VALUES
  ('General Arts', 'GARTS'),
  ('General Science', 'GSCI'),
  ('Business', 'BUS'),
  ('Home Economics', 'HECON'),
  ('General Agric', 'GAGR')
) AS v(name, code)
WHERE NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.name = v.name OR p.code = v.code);

INSERT INTO public.learning_areas (name, code)
SELECT v.name, v.code
FROM (VALUES
  ('Core', 'CORE'),
  ('Science', 'SCI'),
  ('Arts', 'ARTS'),
  ('Business', 'BUS'),
  ('TVET', 'TVET')
) AS v(name, code)
WHERE NOT EXISTS (SELECT 1 FROM public.learning_areas l WHERE l.name = v.name);

-- Backfill current-year enrollment rows for existing students (does not overwrite)
INSERT INTO public.student_academic_enrollments (
  student_id, academic_year_id, level, enrollment_status, program_id, house_id, boarding_type, admission_date
)
SELECT
  s.id,
  s.academic_year_id,
  'Form 1',
  'enrolled',
  s.program_id,
  s.house_id,
  CASE WHEN s.student_type::text IN ('boarding', 'day') THEN s.student_type::text ELSE 'boarding' END,
  COALESCE(s.enrolled_at::date, CURRENT_DATE)
FROM public.students s
WHERE s.academic_year_id IS NOT NULL
  AND COALESCE(s.deleted_at IS NULL, true)
ON CONFLICT (student_id, academic_year_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage buckets (private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('staff-photos', 'staff-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('student-documents', 'student-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('staff-documents', 'staff-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated staff can read staff photos' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "Authenticated staff can read staff photos" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'staff-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admin can write staff photos' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "Admin can write staff photos" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'staff-photos' AND public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admin can update staff photos' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "Admin can update staff photos" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'staff-photos' AND public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admin can delete staff photos' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "Admin can delete staff photos" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'staff-photos' AND public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Staff can read private documents' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "Staff can read private documents" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id IN ('student-documents', 'staff-documents') AND (public.is_admin() OR public.is_it_officer()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admin can upload private documents' AND polrelid = 'storage.objects'::regclass) THEN
    CREATE POLICY "Admin can upload private documents" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id IN ('student-documents', 'staff-documents') AND public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Unpublish timetable (authorized academic staff)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unpublish_timetable(p_academic_year_id uuid, p_semester_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT (public.is_admin() OR public.is_academic_head()) THEN
    RAISE EXCEPTION 'Only administrators and academic heads can unpublish timetables';
  END IF;

  UPDATE public.timetables
  SET is_published = false,
      status = 'draft',
      updated_at = now()
  WHERE academic_year_id = p_academic_year_id
    AND (p_semester_id IS NULL OR semester_id = p_semester_id)
    AND status = 'published';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.audit_logs (
    user_id, actor_role, action, module, entity_type, description, severity, status, metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN public.is_admin() THEN 'admin' ELSE 'academic_head' END,
    'TIMETABLE_UNPUBLISHED', 'ACADEMIC', 'timetables',
    'Unpublished timetable (' || v_count || ' entries returned to draft)',
    'WARNING', 'SUCCESS',
    jsonb_build_object('academic_year_id', p_academic_year_id, 'semester_id', p_semester_id, 'count', v_count)
  );

  RETURN jsonb_build_object('success', true, 'unpublished_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.unpublish_timetable(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unpublish_timetable(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Payment reversal (no hard delete of financial history)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_student_payment(p_payment_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF NOT (public.is_admin() OR public.is_finance_officer()) THEN
    RAISE EXCEPTION 'Only administrators and finance officers can reverse payments';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  IF v_payment.status::text IN ('reversed', 'cancelled') THEN
    RAISE EXCEPTION 'Payment is already reversed or cancelled';
  END IF;

  UPDATE public.payments
  SET status = 'reversed',
      reversed_at = now(),
      reversed_by = auth.uid(),
      reversal_reason = NULLIF(btrim(p_reason), '')
  WHERE id = p_payment_id;

  INSERT INTO public.audit_logs (
    user_id, actor_role, action, module, entity_type, entity_id, description, severity, status, before_data, after_data
  ) VALUES (
    auth.uid(),
    CASE WHEN public.is_admin() THEN 'admin' ELSE 'finance_officer' END,
    'PAYMENT_REVERSED', 'FINANCE', 'payments', p_payment_id,
    'Reversed payment ' || COALESCE(v_payment.receipt_number, v_payment.reference, p_payment_id::text),
    'CRITICAL', 'SUCCESS',
    to_jsonb(v_payment),
    jsonb_build_object('status', 'reversed', 'reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'payment_id', p_payment_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_student_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_student_payment(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- STP readiness (structured missing-data check; no private WAEC API)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_stp_readiness(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_missing text[] := '{}';
  v_results integer := 0;
  v_incomplete integer := 0;
BEGIN
  IF NOT (public.can_manage_academics() OR public.is_teacher()) THEN
    RAISE EXCEPTION 'Not authorized to validate STP readiness';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  IF v_student.jhs_index_number IS NULL OR length(regexp_replace(v_student.jhs_index_number, '\D', '', 'g')) <> 10 THEN
    v_missing := array_append(v_missing, 'Invalid JHS Index Number (must be exactly 10 digits)');
  END IF;
  IF v_student.date_of_birth IS NULL THEN
    v_missing := array_append(v_missing, 'Missing Date of Birth');
  END IF;
  IF v_student.program_id IS NULL THEN
    v_missing := array_append(v_missing, 'No Academic Program Assigned');
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE assessment_score IS NULL OR exam_score IS NULL)
  INTO v_results, v_incomplete
  FROM public.student_results
  WHERE student_id = p_student_id;

  IF v_results = 0 THEN
    v_missing := array_append(v_missing, 'No Terminal Results / Continuous Assessments Recorded');
  ELSIF v_incomplete > 0 THEN
    v_missing := array_append(v_missing, 'Incomplete 30% Class / 70% Exam Score Breakdown');
  END IF;

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'jhs_index_number', v_student.jhs_index_number,
    'ready', COALESCE(array_length(v_missing, 1), 0) = 0,
    'missing', to_jsonb(v_missing),
    'results_count', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_stp_readiness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_stp_readiness(uuid) TO authenticated;
