-- ============================================================================
-- Khulafasco SMS: Staff Lifecycle, Academic Lifecycle, Semesters, 
-- Student Academic Enrollments, and Security Audit Infrastructure
-- Migration: 20260917_staff_academic_lifecycle_audit.sql
-- ============================================================================

BEGIN;

-- 1. EXTEND AUDIT_LOGS TABLE WITH DETAILED AUDITING CAPABILITIES
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS module text DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS target_identifier text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'SUCCESS',
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'SECURITY', 'CRITICAL')),
  ADD COLUMN IF NOT EXISTS before_data jsonb,
  ADD COLUMN IF NOT EXISTS after_data jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Performance indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_identifier);

-- Audit logs RLS policies:
-- Only Admin, IT Officer, and Headmaster can view audit logs.
-- Authenticated users can insert their own audit entries.
-- Updates and Deletions are forbidden to protect integrity.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authorized staff can view audit logs' AND tablename = 'audit_logs') THEN
    CREATE POLICY "Authorized staff can view audit logs" ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_it_officer() OR public.is_headmaster());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated staff can insert audit logs' AND tablename = 'audit_logs') THEN
    CREATE POLICY "Authenticated staff can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_admin() OR public.is_it_officer());
  END IF;
END $$;


-- 2. SEMESTERS TABLE (CONFIGURABLE ACADEMIC PERIODS)
CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  semester_number integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_year_semester_num UNIQUE (academic_year_id, semester_number)
);

-- Partial index ensuring only one active/current semester per academic year
CREATE UNIQUE INDEX IF NOT EXISTS uq_current_semester_per_year
  ON public.semesters(academic_year_id)
  WHERE (is_current = true);

CREATE INDEX IF NOT EXISTS idx_semesters_academic_year ON public.semesters(academic_year_id);

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.semesters TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view semesters' AND tablename = 'semesters') THEN
    CREATE POLICY "Staff can view semesters" ON public.semesters FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin and Academic Head can manage semesters' AND tablename = 'semesters') THEN
    CREATE POLICY "Admin and Academic Head can manage semesters" ON public.semesters FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_academic_head())
    WITH CHECK (public.is_admin() OR public.is_academic_head());
  END IF;
END $$;


-- 3. EXTEND CLASSES TABLE WITH STREAM, CAPACITY, ACTIVE STATUS
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS stream text,
  ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();


-- 4. STUDENT ACADEMIC ENROLLMENT HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.student_academic_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  level text NOT NULL CHECK (level IN ('Form 1', 'Form 2', 'Form 3')),
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  enrollment_status text NOT NULL DEFAULT 'enrolled' CHECK (enrollment_status IN ('enrolled', 'active', 'promoted', 'repeating', 'graduated', 'withdrawn', 'transferred', 'deferred')),
  promotion_status text CHECK (promotion_status IN ('promoted', 'repeating', 'graduated', 'withdrawn', 'transferred', 'deferred', 'pending')),
  start_date date,
  end_date date,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_year_enrollment UNIQUE (student_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON public.student_academic_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_year ON public.student_academic_enrollments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class ON public.student_academic_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_level ON public.student_academic_enrollments(level);

ALTER TABLE public.student_academic_enrollments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_academic_enrollments TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view student enrollments' AND tablename = 'student_academic_enrollments') THEN
    CREATE POLICY "Staff can view student enrollments" ON public.student_academic_enrollments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin and Academic Head can manage enrollments' AND tablename = 'student_academic_enrollments') THEN
    CREATE POLICY "Admin and Academic Head can manage enrollments" ON public.student_academic_enrollments FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_academic_head())
    WITH CHECK (public.is_admin() OR public.is_academic_head());
  END IF;
END $$;


-- 5. FUNCTION: check_staff_deletion_safety(p_staff_id uuid)
-- Inspects historical references across foreign key tables
CREATE OR REPLACE FUNCTION public.check_staff_deletion_safety(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_audit bigint := 0;
  v_ref_payments bigint := 0;
  v_ref_requests bigint := 0;
  v_ref_attendance bigint := 0;
  v_ref_results bigint := 0;
  v_ref_tickets bigint := 0;
  v_ref_classes bigint := 0;
  v_ref_assignments bigint := 0;
  v_total_refs bigint := 0;
  v_reasons text[] := ARRAY[]::text[];
BEGIN
  -- 1. Check audit logs
  SELECT count(*) INTO v_ref_audit FROM public.audit_logs WHERE user_id = p_staff_id;
  IF v_ref_audit > 0 THEN
    v_reasons := array_append(v_reasons, v_ref_audit || ' system audit log(s)');
  END IF;

  -- 2. Check financial payments
  SELECT count(*) INTO v_ref_payments FROM public.payments WHERE recorded_by = p_staff_id;
  IF v_ref_payments > 0 THEN
    v_reasons := array_append(v_reasons, v_ref_payments || ' student fee payment(s)');
  END IF;

  -- 3. Check operational requests
  SELECT count(*) INTO v_ref_requests FROM public.requests 
  WHERE requester_id = p_staff_id OR reviewed_by = p_staff_id OR released_by = p_staff_id OR completed_by = p_staff_id;
  IF v_ref_requests > 0 THEN
    v_reasons := array_append(v_reasons, v_ref_requests || ' operational request(s)');
  END IF;

  -- 4. Check attendance records
  SELECT count(*) INTO v_ref_attendance FROM public.attendance_records WHERE recorded_by = p_staff_id;
  IF v_ref_attendance > 0 THEN
    v_reasons := array_append(v_reasons, v_ref_attendance || ' student attendance record(s)');
  END IF;

  -- 5. Check academic results
  SELECT count(*) INTO v_ref_results FROM public.student_results 
  WHERE submitted_by = p_staff_id OR approved_by = p_staff_id;
  IF v_ref_results > 0 THEN
    v_reasons := array_append(v_reasons, v_ref_results || ' academic assessment result(s)');
  END IF;

  -- 6. Check IT tickets
  SELECT count(*) INTO v_ref_tickets FROM public.it_tickets 
  WHERE requester_id = p_staff_id OR assigned_to = p_staff_id;
  IF v_ref_tickets > 0 THEN
    v_reasons := array_append(v_reasons, v_ref_tickets || ' IT support ticket(s)');
  END IF;

  -- 7. Check class teacher assignments
  SELECT count(*) INTO v_ref_classes FROM public.classes WHERE class_teacher_id = p_staff_id;
  IF v_ref_classes > 0 THEN
    v_reasons := array_append(v_reasons, v_ref_classes || ' class teacher assignment(s)');
  END IF;

  -- 8. Check subject teaching assignments
  SELECT count(*) INTO v_ref_assignments FROM public.teacher_assignments WHERE teacher_id = p_staff_id;
  IF v_ref_assignments > 0 THEN
    v_reasons := array_append(v_reasons, v_ref_assignments || ' subject teaching assignment(s)');
  END IF;

  v_total_refs := v_ref_audit + v_ref_payments + v_ref_requests + v_ref_attendance + v_ref_results + v_ref_tickets + v_ref_classes + v_ref_assignments;

  IF v_total_refs > 0 THEN
    RETURN jsonb_build_object(
      'safe', false,
      'total_references', v_total_refs,
      'reasons', v_reasons,
      'recommendation', 'Account has historical institutional records. Deactivate account instead of permanent deletion.'
    );
  ELSE
    RETURN jsonb_build_object(
      'safe', true,
      'total_references', 0,
      'reasons', ARRAY[]::text[],
      'recommendation', 'Safe to permanently delete account.'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_staff_deletion_safety(uuid) TO authenticated;


-- 6. RPC: delete_staff_account(p_staff_id uuid)
-- Permanently deletes staff account only when safety check passes
CREATE OR REPLACE FUNCTION public.delete_staff_account(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_safety jsonb;
  v_staff_name text;
  v_staff_role text;
BEGIN
  -- Only admin can delete staff
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can delete staff accounts';
  END IF;

  -- Prevent admin from deleting their own account
  IF p_staff_id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot delete their own active account';
  END IF;

  -- Get staff details
  SELECT full_name, role::text INTO v_staff_name, v_staff_role
  FROM public.profiles
  WHERE id = p_staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff account not found';
  END IF;

  -- Run safety check
  v_safety := public.check_staff_deletion_safety(p_staff_id);
  IF NOT (v_safety->>'safe')::boolean THEN
    RAISE EXCEPTION 'Cannot delete staff account: account is referenced by historical records (% refs). Deactivate instead.', (v_safety->>'total_references');
  END IF;

  -- Audit log the deletion before removing profile
  INSERT INTO public.audit_logs (
    user_id,
    actor_role,
    action,
    module,
    target_identifier,
    description,
    severity,
    status,
    before_data,
    created_at
  ) VALUES (
    auth.uid(),
    'admin',
    'STAFF_DELETED',
    'STAFF',
    p_staff_id::text,
    'Permanently deleted staff account: ' || coalesce(v_staff_name, 'Unknown') || ' (' || coalesce(v_staff_role, 'No role') || ')',
    'CRITICAL',
    'SUCCESS',
    jsonb_build_object('id', p_staff_id, 'full_name', v_staff_name, 'role', v_staff_role),
    NOW()
  );

  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = p_staff_id;

  -- Delete from auth.users (if accessible via Supabase admin)
  BEGIN
    DELETE FROM auth.users WHERE id = p_staff_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Staff account ' || coalesce(v_staff_name, '') || ' permanently deleted.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_staff_account(uuid) TO authenticated;


-- 7. RPC: update_staff_role(p_staff_id uuid, p_new_role user_role)
CREATE OR REPLACE FUNCTION public.update_staff_role(
  p_staff_id uuid,
  p_new_role public.user_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_role text;
  v_staff_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update staff roles';
  END IF;

  SELECT role::text, full_name INTO v_old_role, v_staff_name
  FROM public.profiles
  WHERE id = p_staff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff account not found';
  END IF;

  -- Update role in profiles
  UPDATE public.profiles
  SET role = p_new_role, updated_at = NOW()
  WHERE id = p_staff_id;

  -- Audit log the role change
  INSERT INTO public.audit_logs (
    user_id,
    actor_role,
    action,
    module,
    target_identifier,
    description,
    severity,
    status,
    before_data,
    after_data,
    created_at
  ) VALUES (
    auth.uid(),
    'admin',
    'ROLE_CHANGED',
    'STAFF',
    p_staff_id::text,
    'Changed role for ' || coalesce(v_staff_name, 'Staff') || ' from ' || v_old_role || ' to ' || p_new_role::text,
    'SECURITY',
    'SUCCESS',
    jsonb_build_object('role', v_old_role),
    jsonb_build_object('role', p_new_role::text),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'staff_id', p_staff_id,
    'old_role', v_old_role,
    'new_role', p_new_role::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_staff_role(uuid, public.user_role) TO authenticated;

COMMIT;
