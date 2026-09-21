-- Permanently remove a class and every record owned by that class.
-- Student history remains, while optional class references are cleared.
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

  DELETE FROM public.audit_logs
  WHERE target_identifier = p_class_id::text
     OR metadata @> jsonb_build_object('class_id', p_class_id);

  DELETE FROM public.teacher_assignments WHERE class_id = p_class_id;
  DELETE FROM public.attendance_records WHERE class_id = p_class_id;
  DELETE FROM public.student_results WHERE class_id = p_class_id;
  DELETE FROM public.timetables WHERE class_id = p_class_id;
  DELETE FROM public.student_class_assignments WHERE class_id = p_class_id;
  UPDATE public.student_academic_enrollments SET class_id = NULL WHERE class_id = p_class_id;
  UPDATE public.student_transfers SET target_class_id = NULL WHERE target_class_id = p_class_id;
  DELETE FROM public.classes WHERE id = p_class_id;

  RETURN jsonb_build_object('id', p_class_id, 'name', v_class_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_class_permanently(uuid) TO authenticated;