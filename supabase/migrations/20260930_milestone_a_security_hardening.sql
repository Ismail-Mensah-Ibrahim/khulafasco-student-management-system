-- Milestone A: close anonymous audit-RPC access and preserve audit history.
REVOKE EXECUTE ON FUNCTION public.create_system_audit_log(
  uuid, text, text, text, text, uuid, text, text, text, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon;

-- Deleting operational class rows must not erase governance evidence.
CREATE OR REPLACE FUNCTION public.delete_class_permanently(p_class_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_name text;
BEGIN
  IF NOT (public.is_admin() OR public.is_academic_head()) THEN
    RAISE EXCEPTION 'Only administrators and academic heads can permanently delete classes';
  END IF;

  SELECT name INTO v_class_name FROM public.classes WHERE id = p_class_id;
  IF v_class_name IS NULL THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  DELETE FROM public.teacher_assignments WHERE class_id = p_class_id;
  DELETE FROM public.attendance_records WHERE class_id = p_class_id;
  DELETE FROM public.student_results WHERE class_id = p_class_id;
  DELETE FROM public.timetables WHERE class_id = p_class_id;
  DELETE FROM public.student_class_assignments WHERE class_id = p_class_id;
  UPDATE public.student_academic_enrollments SET class_id = NULL WHERE class_id = p_class_id;
  UPDATE public.student_transfers SET target_class_id = NULL WHERE target_class_id = p_class_id;
  DELETE FROM public.classes WHERE id = p_class_id;

  INSERT INTO public.audit_logs (
    user_id, actor_role, action, module, entity_type, entity_id,
    target_identifier, description, severity, status, before_data, created_at
  ) VALUES (
    auth.uid(),
    CASE WHEN public.is_admin() THEN 'admin' ELSE 'academic_head' END,
    'CLASS_PERMANENTLY_DELETED',
    'ACADEMIC',
    'classes',
    p_class_id,
    p_class_id::text,
    'Permanently deleted class "' || v_class_name || '" and class-linked operational records.',
    'CRITICAL',
    'SUCCESS',
    jsonb_build_object('id', p_class_id, 'name', v_class_name),
    NOW()
  );

  RETURN jsonb_build_object('id', p_class_id, 'name', v_class_name);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_class_permanently(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_class_permanently(uuid) TO authenticated;

-- Replace legacy primary-role-only house policies with effective-role helpers.
DROP POLICY IF EXISTS allow_house_staff_manage_exeats ON public.house_exeats;
CREATE POLICY allow_house_staff_manage_exeats ON public.house_exeats
FOR ALL TO authenticated
USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.house_id = house_exeats.house_id
      AND (public.has_staff_role('house_master') OR public.has_staff_role('house_mistress')
        OR p.house_responsibility IN ('house_master', 'house_mistress'))
  )
)
WITH CHECK (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.house_id = house_exeats.house_id
      AND (public.has_staff_role('house_master') OR public.has_staff_role('house_mistress')
        OR p.house_responsibility IN ('house_master', 'house_mistress'))
  )
);

DROP POLICY IF EXISTS house_staff_select_house_students ON public.students;
CREATE POLICY house_staff_select_house_students ON public.students
FOR SELECT TO authenticated
USING (
  public.is_senior_house_staff() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.house_id = students.house_id
      AND (public.has_staff_role('house_master') OR public.has_staff_role('house_mistress')
        OR p.house_responsibility IN ('house_master', 'house_mistress'))
  )
);