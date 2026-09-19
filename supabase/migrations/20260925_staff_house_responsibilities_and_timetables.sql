-- ============================================================================
-- Migration: 20260925_staff_house_responsibilities_and_timetables.sql
-- Description: Implement staff house responsibilities (House Master, House Mistress,
--              Senior House Master, Senior House Mistress), Timetable Management,
--              Teacher Assignments extension, and hardened RLS policies.
-- ============================================================================

-- 1. Profiles house_responsibility extension
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS house_responsibility text 
  CHECK (house_responsibility IN ('house_master', 'house_mistress', 'senior_house_master', 'senior_house_mistress'));

-- Backfill existing staff who have role house_master or house_mistress
UPDATE public.profiles 
SET house_responsibility = role::text 
WHERE role::text IN ('house_master', 'house_mistress') AND house_responsibility IS NULL;

-- 2. PostgreSQL Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_senior_house_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND is_active = true
      AND (role::text = 'admin' OR house_responsibility IN ('senior_house_master', 'senior_house_mistress'))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_house_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND is_active = true
      AND (
        role::text IN ('admin', 'house_master', 'house_mistress') 
        OR house_responsibility IN ('house_master', 'house_mistress', 'senior_house_master', 'senior_house_mistress')
      )
  );
$$;

-- 3. Hardened RLS for house_exeats
DROP POLICY IF EXISTS "allow_staff_view_exeats" ON public.house_exeats;
CREATE POLICY "allow_staff_view_exeats" ON public.house_exeats
FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  public.is_senior_house_staff() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND (
        p.house_id = house_exeats.house_id OR
        p.role::text IN ('headmaster', 'it_officer')
      )
  )
);

DROP POLICY IF EXISTS "allow_house_staff_manage_exeats" ON public.house_exeats;
CREATE POLICY "allow_house_staff_manage_exeats" ON public.house_exeats
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.house_id = house_exeats.house_id
      AND (p.role::text IN ('house_master', 'house_mistress') OR p.house_responsibility IN ('house_master', 'house_mistress'))
  )
)
WITH CHECK (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.house_id = house_exeats.house_id
      AND (p.role::text IN ('house_master', 'house_mistress') OR p.house_responsibility IN ('house_master', 'house_mistress'))
  )
);

-- 4. Students select RLS for house staff & senior house staff
DROP POLICY IF EXISTS "house_staff_select_house_students" ON public.students;
CREATE POLICY "house_staff_select_house_students" ON public.students
FOR SELECT TO authenticated
USING (
  public.is_senior_house_staff() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND (p.role::text IN ('house_master', 'house_mistress') OR p.house_responsibility IN ('house_master', 'house_mistress'))
      AND p.house_id = students.house_id
  )
);

-- 5. Subjects columns
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS description text;

-- 6. Teacher assignments semester link
ALTER TABLE public.teacher_assignments ADD COLUMN IF NOT EXISTS semester_id uuid REFERENCES public.semesters(id) ON DELETE CASCADE;

-- 7. Timetables table
CREATE TABLE IF NOT EXISTS public.timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE CASCADE,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  period_number integer NOT NULL CHECK (period_number BETWEEN 1 AND 10),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  stream text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timetables_class ON public.timetables(class_id);
CREATE INDEX IF NOT EXISTS idx_timetables_teacher ON public.timetables(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetables_year ON public.timetables(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_timetables_day ON public.timetables(day_of_week);

ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.timetables TO authenticated;

DROP POLICY IF EXISTS "Staff can view timetables" ON public.timetables;
CREATE POLICY "Staff can view timetables" ON public.timetables
FOR SELECT TO authenticated
USING (is_published = true OR public.is_admin() OR public.is_academic_head());

DROP POLICY IF EXISTS "Admin and Academic Head can manage timetables" ON public.timetables;
CREATE POLICY "Admin and Academic Head can manage timetables" ON public.timetables
FOR ALL TO authenticated
USING (public.is_admin() OR public.is_academic_head())
WITH CHECK (public.is_admin() OR public.is_academic_head());
