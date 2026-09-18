-- ============================================================================
-- Migration: 20260923_house_master_and_mistress_roles.sql
-- Description: Add house_master & house_mistress roles, house leadership links,
--              house_exeats table, and strict RLS policies.
-- ============================================================================

-- 1. Extend user_role enum with house leadership roles
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'house_master';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'house_mistress';

-- 2. Link staff profiles to their assigned residential house
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_house_id ON public.profiles(house_id);

-- 3. Link houses to designated House Master and House Mistress
ALTER TABLE public.houses 
  ADD COLUMN IF NOT EXISTS house_master_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS house_mistress_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Create house_exeats table for hostel roll call and student leave tracking
CREATE TABLE IF NOT EXISTS public.house_exeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  departure_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date date NOT NULL,
  actual_return_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue', 'cancelled')),
  parent_contacted boolean DEFAULT false,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_house_exeats_house ON public.house_exeats(house_id);
CREATE INDEX IF NOT EXISTS idx_house_exeats_student ON public.house_exeats(student_id);
CREATE INDEX IF NOT EXISTS idx_house_exeats_status ON public.house_exeats(status);

-- 5. Enable RLS on house_exeats
ALTER TABLE public.house_exeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_staff_view_exeats" ON public.house_exeats;
CREATE POLICY "allow_staff_view_exeats" ON public.house_exeats
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "allow_house_staff_manage_exeats" ON public.house_exeats;
CREATE POLICY "allow_house_staff_manage_exeats" ON public.house_exeats
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (
      p.role = 'admin' OR 
      (p.role IN ('house_master', 'house_mistress') AND p.house_id = house_exeats.house_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (
      p.role = 'admin' OR 
      (p.role IN ('house_master', 'house_mistress') AND p.house_id = house_exeats.house_id)
    )
  )
);

-- 6. Grant house staff permission to select students in their house
DROP POLICY IF EXISTS "house_staff_select_house_students" ON public.students;
CREATE POLICY "house_staff_select_house_students" ON public.students
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('house_master', 'house_mistress')
      AND (p.house_id = students.house_id OR p.house_id IS NULL)
  )
);

-- 7. Ensure headmaster, academic head, and teachers can also select students
DROP POLICY IF EXISTS "academic_staff_select_students" ON public.students;
CREATE POLICY "academic_staff_select_students" ON public.students
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('headmaster', 'academic_head', 'teacher')
  )
);
