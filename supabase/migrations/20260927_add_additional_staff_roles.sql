-- Allow staff to retain a primary employment role while receiving additional duties.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS additional_roles public.user_role[] NOT NULL DEFAULT '{}';

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
      AND (
        role::text = required_role
        OR required_role = ANY (additional_roles::text[])
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('teacher');
$$;

GRANT EXECUTE ON FUNCTION public.has_staff_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

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

CREATE OR REPLACE FUNCTION public.is_academic_head()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_staff_role('academic_head');
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
    WHERE id = auth.uid() AND is_active = true
      AND (public.has_staff_role('admin') OR house_responsibility IN ('senior_house_master', 'senior_house_mistress'))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_house_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
      AND (public.has_staff_role('admin') OR public.has_staff_role('house_master') OR public.has_staff_role('house_mistress')
        OR house_responsibility IN ('house_master', 'house_mistress', 'senior_house_master', 'senior_house_mistress'))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_senior_house_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_house_staff() TO authenticated;

DROP POLICY IF EXISTS "academic_staff_select_students" ON public.students;
CREATE POLICY "academic_staff_select_students" ON public.students
FOR SELECT TO authenticated
USING (
  public.has_staff_role('headmaster') OR
  public.has_staff_role('academic_head') OR
  public.has_staff_role('teacher')
);

DROP POLICY IF EXISTS "Teachers and Academic Head can manage results" ON public.student_results;
CREATE POLICY "Teachers and Academic Head can manage results" ON public.student_results FOR ALL TO authenticated
USING (
  public.has_staff_role('admin') OR public.has_staff_role('academic_head') OR
  EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND class_id = student_results.class_id AND subject_id = student_results.subject_id)
)
WITH CHECK (
  public.has_staff_role('admin') OR public.has_staff_role('academic_head') OR
  EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND class_id = student_results.class_id AND subject_id = student_results.subject_id)
);